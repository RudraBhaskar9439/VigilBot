// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract BotDetectorWithPyth {
    IPyth public pyth;
    address public admin;
    address public botAnalyzer;

    // Bot categories
    enum BotCategory {
        HUMAN, // Score 0-39
        GOOD_BOT, // Score 40-59 (Market Makers, Arbitrage)
        BAD_BOT // Score 60+ (Manipulative, Front-running)
    }

    struct TradeRecord {
        address user;
        uint256 timestamp;
        uint256 amount;
        uint256 blockNumber;
        int64 btcPriceAtTrade;
        uint64 pricePublishTime;
    }

    struct BotEvidence {
        address user;
        uint256 tradeTimestamp;
        uint256 pricePublishTime;
        int64 priceAtTrade;
        uint256 reactionTimeMs;
        uint256 botScore;
        BotCategory category;
        string botType; // "Market Maker", "Arbitrage Bot", "Manipulative", etc.
        uint256 liquidityProvided;
    }

    struct BotInfo {
        bool isFlagged;
        uint256 score;
        BotCategory category;
        string botType;
        uint256 liquidityProvided;
        uint256 flaggedAt;
    }

    // Storage
    mapping(address => TradeRecord[]) public userTrades;
    mapping(address => BotInfo) public botRegistry;
    mapping(address => BotEvidence) public botEvidenceProof;

    // Separate tracking for good and bad bots
    address[] public goodBots;
    address[] public badBots;

    mapping(address => bool) private isGoodBot;
    mapping(address => bool) private isBadBot;

    // Events
    event TradeExecuted(
        address indexed user,
        uint256 timestamp,
        uint256 amount,
        uint256 blockNumber,
        int64 btcPrice
    );

    event GoodBotFlagged(
        address indexed user,
        uint256 score,
        string botType,
        uint256 liquidityProvided,
        string reason,
        int64 priceUsed,
        uint256 reactionTimeMs
    );

    event BadBotFlagged(
        address indexed user,
        uint256 score,
        string riskLevel,
        string reason,
        int64 priceUsed,
        uint256 reactionTimeMs
    );

    event BotUnflagged(address indexed user, BotCategory previousCategory);

    modifier onlyAnalyzer() {
        require(
            msg.sender == botAnalyzer || msg.sender == admin,
            "Not authorized"
        );
        _;
    }

    constructor(address _pythContract, address _botAnalyzer) {
        pyth = IPyth(_pythContract);
        admin = msg.sender;
        botAnalyzer = _botAnalyzer;
    }

    /**
     * Execute a trade (basic version)
     */
    function executeTrade(uint256 amount) external {
        BotInfo memory botInfo = botRegistry[msg.sender];

        // Block bad bots from trading
        require(
            botInfo.category != BotCategory.BAD_BOT,
            "Bad bot detected - trading blocked!"
        );
        require(amount > 0, "Invalid amount");

        userTrades[msg.sender].push(
            TradeRecord({
                user: msg.sender,
                timestamp: block.timestamp,
                amount: amount,
                blockNumber: block.number,
                btcPriceAtTrade: 0,
                pricePublishTime: 0
            })
        );

        emit TradeExecuted(
            msg.sender,
            block.timestamp,
            amount,
            block.number,
            0
        );
    }

    /**
     * Execute a trade with Pyth price proof
     */
    function executeTradeWithPriceProof(
        uint256 amount,
        bytes[] calldata priceUpdateData,
        bytes32 priceId
    ) external payable {
        BotInfo memory botInfo = botRegistry[msg.sender];

        // Block bad bots
        require(
            botInfo.category != BotCategory.BAD_BOT,
            "Bad bot detected - trading blocked!"
        );
        require(amount > 0, "Invalid amount");

        uint fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceId, 60);

        userTrades[msg.sender].push(
            TradeRecord({
                user: msg.sender,
                timestamp: block.timestamp,
                amount: amount,
                blockNumber: block.number,
                btcPriceAtTrade: price.price,
                pricePublishTime: uint64(price.publishTime)
            })
        );

        emit TradeExecuted(
            msg.sender,
            block.timestamp,
            amount,
            block.number,
            price.price
        );
    }

    /**
     * Flag GOOD BOTS with Pyth proof (Market Makers & Arbitrage)
     */
    function flagGoodBotsWithPythProof(
        address[] calldata users,
        uint256[] calldata scores,
        string[] calldata botTypes,
        uint256[] calldata liquidityAmounts,
        string[] calldata reasons,
        bytes[] calldata priceUpdateData,
        bytes32 priceId
    ) external payable onlyAnalyzer {
        require(users.length == scores.length, "Length mismatch");
        require(users.length == botTypes.length, "Length mismatch");
        require(users.length == liquidityAmounts.length, "Length mismatch");
        require(users.length == reasons.length, "Length mismatch");

        uint fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient Pyth fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        PythStructs.Price memory currentPrice = pyth.getPriceUnsafe(priceId);

        for (uint i = 0; i < users.length; i++) {
            _flagGoodBot(
                users[i],
                scores[i],
                botTypes[i],
                liquidityAmounts[i],
                reasons[i],
                currentPrice
            );
        }
    }

    /**
     * Internal function to flag a good bot
     */
    function _flagGoodBot(
        address user,
        uint256 score,
        string calldata botType,
        uint256 liquidityAmount,
        string calldata reason,
        PythStructs.Price memory currentPrice
    ) private {
        // Remove from bad bots if previously flagged
        if (isBadBot[user]) {
            _removeFromBadBots(user);
        }

        // Add to good bots if not already there
        if (!isGoodBot[user]) {
            goodBots.push(user);
            isGoodBot[user] = true;
        }

        // Update bot registry
        botRegistry[user] = BotInfo({
            isFlagged: true,
            score: score,
            category: BotCategory.GOOD_BOT,
            botType: botType,
            liquidityProvided: liquidityAmount,
            flaggedAt: block.timestamp
        });

        // Store evidence
        TradeRecord[] storage trades = userTrades[user];
        if (trades.length > 0) {
            TradeRecord memory lastTrade = trades[trades.length - 1];

            uint256 reactionTime = lastTrade.timestamp >
                currentPrice.publishTime
                ? (lastTrade.timestamp - currentPrice.publishTime) * 1000
                : 0;

            botEvidenceProof[user] = BotEvidence({
                user: user,
                tradeTimestamp: lastTrade.timestamp,
                pricePublishTime: currentPrice.publishTime,
                priceAtTrade: currentPrice.price,
                reactionTimeMs: reactionTime,
                botScore: score,
                category: BotCategory.GOOD_BOT,
                botType: botType,
                liquidityProvided: liquidityAmount
            });

            emit GoodBotFlagged(
                user,
                score,
                botType,
                liquidityAmount,
                reason,
                currentPrice.price,
                reactionTime
            );
        }
    }

    /**
     * Flag BAD BOTS with Pyth proof (Manipulative & Front-running)
     */
    function flagBadBotsWithPythProof(
        address[] calldata users,
        uint256[] calldata scores,
        string[] calldata riskLevels,
        string[] calldata reasons,
        bytes[] calldata priceUpdateData,
        bytes32 priceId
    ) external payable onlyAnalyzer {
        require(users.length == scores.length, "Length mismatch");
        require(users.length == riskLevels.length, "Length mismatch");
        require(users.length == reasons.length, "Length mismatch");

        uint fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient Pyth fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        PythStructs.Price memory currentPrice = pyth.getPriceUnsafe(priceId);

        for (uint i = 0; i < users.length; i++) {
            _flagBadBot(
                users[i],
                scores[i],
                riskLevels[i],
                reasons[i],
                currentPrice
            );
        }
    }

    /**
     * Internal function to flag a bad bot
     */
    function _flagBadBot(
        address user,
        uint256 score,
        string calldata riskLevel,
        string calldata reason,
        PythStructs.Price memory currentPrice
    ) private {
        // Remove from good bots if previously flagged
        if (isGoodBot[user]) {
            _removeFromGoodBots(user);
        }

        // Add to bad bots if not already there
        if (!isBadBot[user]) {
            badBots.push(user);
            isBadBot[user] = true;
        }

        // Update bot registry
        botRegistry[user] = BotInfo({
            isFlagged: true,
            score: score,
            category: BotCategory.BAD_BOT,
            botType: "Manipulative",
            liquidityProvided: 0,
            flaggedAt: block.timestamp
        });

        // Store evidence
        TradeRecord[] storage trades = userTrades[user];
        if (trades.length > 0) {
            TradeRecord memory lastTrade = trades[trades.length - 1];

            uint256 reactionTime = lastTrade.timestamp >
                currentPrice.publishTime
                ? (lastTrade.timestamp - currentPrice.publishTime) * 1000
                : 0;

            botEvidenceProof[user] = BotEvidence({
                user: user,
                tradeTimestamp: lastTrade.timestamp,
                pricePublishTime: currentPrice.publishTime,
                priceAtTrade: currentPrice.price,
                reactionTimeMs: reactionTime,
                botScore: score,
                category: BotCategory.BAD_BOT,
                botType: "Manipulative",
                liquidityProvided: 0
            });

            emit BadBotFlagged(
                user,
                score,
                riskLevel,
                reason,
                currentPrice.price,
                reactionTime
            );
        }
    }

    /**
     * Regular flagging for good bots (cheaper, no Pyth proof)
     */
    function flagGoodBots(
        address[] calldata users,
        uint256[] calldata scores,
        string[] calldata botTypes,
        uint256[] calldata liquidityAmounts
    ) external onlyAnalyzer {
        require(users.length == scores.length, "Length mismatch");

        for (uint i = 0; i < users.length; i++) {
            // Remove from bad bots if previously flagged
            if (isBadBot[users[i]]) {
                _removeFromBadBots(users[i]);
            }

            if (!isGoodBot[users[i]]) {
                goodBots.push(users[i]);
                isGoodBot[users[i]] = true;
            }

            botRegistry[users[i]] = BotInfo({
                isFlagged: true,
                score: scores[i],
                category: BotCategory.GOOD_BOT,
                botType: botTypes[i],
                liquidityProvided: liquidityAmounts[i],
                flaggedAt: block.timestamp
            });
        }
    }

    /**
     * Regular flagging for bad bots (cheaper, no Pyth proof)
     */
    function flagBadBots(
        address[] calldata users,
        uint256[] calldata scores,
        string[] calldata riskLevels
    ) external onlyAnalyzer {
        require(users.length == scores.length, "Length mismatch");

        for (uint i = 0; i < users.length; i++) {
            // Remove from good bots if previously flagged
            if (isGoodBot[users[i]]) {
                _removeFromGoodBots(users[i]);
            }

            if (!isBadBot[users[i]]) {
                badBots.push(users[i]);
                isBadBot[users[i]] = true;
            }

            botRegistry[users[i]] = BotInfo({
                isFlagged: true,
                score: scores[i],
                category: BotCategory.BAD_BOT,
                botType: "Manipulative",
                liquidityProvided: 0,
                flaggedAt: block.timestamp
            });
        }
    }

    /**
     * Remove user from good bots array
     */
    function _removeFromGoodBots(address user) private {
        for (uint i = 0; i < goodBots.length; i++) {
            if (goodBots[i] == user) {
                goodBots[i] = goodBots[goodBots.length - 1];
                goodBots.pop();
                isGoodBot[user] = false;
                break;
            }
        }
    }

    /**
     * Remove user from bad bots array
     */
    function _removeFromBadBots(address user) private {
        for (uint i = 0; i < badBots.length; i++) {
            if (badBots[i] == user) {
                badBots[i] = badBots[badBots.length - 1];
                badBots.pop();
                isBadBot[user] = false;
                break;
            }
        }
    }

    /**
     * Unflag a user completely
     */
    function unflagBot(address user) external onlyAnalyzer {
        BotCategory previousCategory = botRegistry[user].category;

        if (isGoodBot[user]) {
            _removeFromGoodBots(user);
        }
        if (isBadBot[user]) {
            _removeFromBadBots(user);
        }

        delete botRegistry[user];
        delete botEvidenceProof[user];

        emit BotUnflagged(user, previousCategory);
    }

    /**
     * Get user's trade history
     */
    function getUserTrades(
        address user
    ) external view returns (TradeRecord[] memory) {
        return userTrades[user];
    }

    /**
     * Check if user is flagged and get details
     */
    function isBot(address user) external view returns (bool, uint256) {
        BotInfo memory info = botRegistry[user];
        return (info.isFlagged, info.score);
    }

    /**
     * Get bot information
     */
    function getBotInfo(address user) external view returns (BotInfo memory) {
        return botRegistry[user];
    }

    /**
     * Get bot evidence
     */
    function getBotEvidence(
        address user
    ) external view returns (BotEvidence memory) {
        return botEvidenceProof[user];
    }

    /**
     * Get all good bots
     */
    function getGoodBots() external view returns (address[] memory) {
        return goodBots;
    }

    /**
     * Get all bad bots
     */
    function getBadBots() external view returns (address[] memory) {
        return badBots;
    }

    /**
     * Get good bots count
     */
    function getGoodBotsCount() external view returns (uint256) {
        return goodBots.length;
    }

    /**
     * Get bad bots count
     */
    function getBadBotsCount() external view returns (uint256) {
        return badBots.length;
    }

    /**
     * Check if user is a good bot
     */
    function isGoodBotAddress(address user) external view returns (bool) {
        return isGoodBot[user];
    }

    /**
     * Check if user is a bad bot
     */
    function isBadBotAddress(address user) external view returns (bool) {
        return isBadBot[user];
    }

    /**
     * Set bot analyzer address
     */
    function setBotAnalyzer(address _newAnalyzer) external {
        require(msg.sender == admin, "Only admin");
        botAnalyzer = _newAnalyzer;
    }
}
