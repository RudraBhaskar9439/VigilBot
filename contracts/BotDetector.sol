//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BotDetector {

    address public admin; // Owner of the contract
    address public botAnalyzer; // address authorized to flag/ unflag bots

    /**
     * @dev TradeRecord struct to store the trade details of evey user
     */
    struct TradeRecord {
        address user;
        uint256 timestamp;
        uint256 amount;
        uint256 blockNumber;
    }

    mapping(address=> TradeRecord[]) public userTrades; // Map each user to their list5 of trades
    mapping(address=> bool) public flaggedAsBots; // flag to consider whethger a user is considered bot or not 
    mapping(address=> uint256) public botScore; // numerical score to represent the botness of a user (Higher => more likely a bot)


    /**
     * @dev Emitted everytime a user executes a trade successfully offchain
     */
event TradeExecuted(
    address indexed user,
    uint256 timestamp,
    uint256 amount,
    uint256 blockNumber
);

/**
 * @dev Emitted everytime  a user  is flagged as bot, along with their score and reason
 */

event BotFlagged(
    address indexed user,
    uint256 score,
    string reason
);

/**
 * @dev Restricts certain functions (like flagging/unflagging bots) to only the botAnalyzer or admin.
 */

modifier onlyAnalyzer() {
    require(msg.sender == botAnalyzer || msg.sender == admin, " not authorized");
    _;
}

// /**
//  * @param _botAnalyzer addres of the bot analyzer
//  * @param set the deployer as admin
//  */

constructor(address _botAnalyzer) {
    admin = msg.sender;
    botAnalyzer = _botAnalyzer;
}
/**
 * @dev any user can simulate a trade
 * @dev Checks that the user is not flagged as a bot
 * @dev Stores a new TradeRecord in their history
 * @dev Emits an event for the trade
 */

function executeTrade(uint256 amount) external {
    require(!flaggedAsBots[msg.sender], " Bot Detected");
    require(amount > 0, "Invalid amount");

    userTrades[msg.sender].push(TradeRecord({
        user: msg.sender,
        timestamp: block.timestamp,
        amount: amount,
        blockNumber: block.number
    }));
    emit TradeExecuted(msg.sender, block.timestamp, amount, block.number);
}

/**
 * Can only be called by the botAnalyzer or admin.
 * Takes arrays of users, scores, and reasons.
 * Marks each user as a bot, assigns a botScore, and emits an event.
 */


function flagBots(
    address[] calldata users,
    uint256[] calldata scores,
    string[] calldata reasons
) external onlyAnalyzer {
    require(users.length == scores.length, "Length minmatched");

    for(uint i = 0;i< users.length; i++) {
        flaggedAsBots[users[i]] = true;
        botScore[users[i]] = scores[i];
        emit BotFlagged(users[i], scores[i], reasons[i]);
    }
}

/**
 * @dev Used to remove the bot flag (if user is later proven human or false positive).
 */
function unflagBot(address user) external onlyAnalyzer {
    flaggedAsBots[user] = false;
    botScore[user] = 0;
}

/**
 * @dev Returns an array of all the trades done by a particular user.
 */

function getUserTrades(address user) external view returns(TradeRecord[] memory) {
    return userTrades[user];
}

/**
 *  @dev Anyone can query whether a user is flagged as a bot and see their score.
 */
function isBot(address user) external view returns (bool, uint256) {
    return (flaggedAsBots[user], botScore[user]);
}

/**
 * Lets the admin update who the bot analyzer is (for example, changing to a new analysis service).
 */
function setBotAnalyzer(address _newAnalyzer) external {
    require(msg.sender == admin, "Only Admin");
    botAnalyzer = _newAnalyzer;
}
}