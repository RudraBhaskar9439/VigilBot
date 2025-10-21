// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract BotDetectorWithPyth {
    IPyth public pyth;
    address public admin;
    address public botAnalyzer;

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
    }

    mapping(address => TradeRecord[]) public userTrades;
    mapping(address => bool) public flaggedAsBots;
    mapping(address => uint256) public botScore;
    mapping(address => BotEvidence) public botEvidenceProof;

    event TradeExecuted(
        address indexed user,
        uint256 timestamp,
        uint256 amount,
        uint256 blockNumber,
        int64 btcPrice
    );

    event BotFlaggedWithProof(
        address indexed user,
        uint256 score,
        string reason,
        int64 priceUsed,
        uint256 reactionTimeMs
    );

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

    function executeTrade(uint256 amount) external {
        require(!flaggedAsBots[msg.sender], "Bot detected - trading blocked!");
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

    function executeTradeWithPriceProof(
        uint256 amount,
        bytes[] calldata priceUpdateData,
        bytes32 priceId
    ) external payable {
        require(!flaggedAsBots[msg.sender], "Bot detected - trading blocked!");
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

    function flagBotsWithPythProof(
        address[] calldata users,
        uint256[] calldata scores,
        string[] calldata reasons,
        bytes[] calldata priceUpdateData,
        bytes32 priceId
    ) external payable onlyAnalyzer {
        require(users.length == scores.length, "Length mismatch");

        uint fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient Pyth fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdateData);

        PythStructs.Price memory currentPrice = pyth.getPriceUnsafe(priceId);

        for (uint i = 0; i < users.length; i++) {
            _flagBotWithEvidence(users[i], scores[i], reasons[i], currentPrice);
        }
    }

    // REFACTORED: Moved to separate function to reduce stack depth
    function _flagBotWithEvidence(
        address user,
        uint256 score,
        string calldata reason,
        PythStructs.Price memory currentPrice
    ) private {
        flaggedAsBots[user] = true;
        botScore[user] = score;

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
                botScore: score
            });

            emit BotFlaggedWithProof(
                user,
                score,
                reason,
                currentPrice.price,
                reactionTime
            );
        }
    }

    function flagBots(
        address[] calldata users,
        uint256[] calldata scores,
        string[] calldata reasons
    ) external onlyAnalyzer {
        require(users.length == scores.length, "Length mismatch");

        for (uint i = 0; i < users.length; i++) {
            flaggedAsBots[users[i]] = true;
            botScore[users[i]] = scores[i];
        }
    }

    function unflagBot(address user) external onlyAnalyzer {
        flaggedAsBots[user] = false;
        botScore[user] = 0;
    }

    function getUserTrades(
        address user
    ) external view returns (TradeRecord[] memory) {
        return userTrades[user];
    }

    function isBot(address user) external view returns (bool, uint256) {
        return (flaggedAsBots[user], botScore[user]);
    }

    function getBotEvidence(
        address user
    ) external view returns (BotEvidence memory) {
        return botEvidenceProof[user];
    }

    function setBotAnalyzer(address _newAnalyzer) external {
        require(msg.sender == admin, "Only admin");
        botAnalyzer = _newAnalyzer;
    }
}
