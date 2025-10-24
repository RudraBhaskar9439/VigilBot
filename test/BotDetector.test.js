const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BotDetector", function () {
  let BotDetector, botDetector, deployer, analyzer, user1, user2;

  beforeEach(async function () {
    [deployer, analyzer, user1, user2] = await ethers.getSigners();

    BotDetector = await ethers.getContractFactory("BotDetector");
    botDetector = await BotDetector.deploy(analyzer.address);
    await botDetector.waitForDeployment();
  });

  // 1. Constructor test
  it("Should set admin and analyzer correctly", async function () {
    expect(await botDetector.admin()).to.equal(deployer.address);
    expect(await botDetector.botAnalyzer()).to.equal(analyzer.address);
  });

  // 2. Execute trade test
  it("Should record a trade and emit event", async function () {
    const amount = 1000n;
    const tx = await botDetector.connect(user1).executeTrade(amount);
    const receipt = await tx.wait();

    // Get the actual timestamp and block number from the transaction
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    await expect(tx)
      .to.emit(botDetector, "TradeExecuted")
      .withArgs(user1.address, block.timestamp, amount, receipt.blockNumber);

    const trades = await botDetector.getUserTrades(user1.address);
    expect(trades.length).to.equal(1);
    expect(trades[0].amount).to.equal(amount);
  });

  // 3. Flag bot test
  it("Should flag users as bots by analyzer", async function () {
    const users = [user1.address, user2.address];
    const scores = [85, 90];
    const reasons = ["fast trading", "unusual activity"];

    await expect(
      botDetector.connect(analyzer).flagBots(users, scores, reasons)
    )
      .to.emit(botDetector, "BotFlagged")
      .withArgs(user1.address, scores[0], reasons[0]);

    const [isBot1, score1] = await botDetector.isBot(user1.address);
    expect(isBot1).to.be.true;
    expect(score1).to.equal(scores[0]);
  });

  // 4. Unflag bot test
  it("Should allow analyzer to unflag a bot", async function () {
    const users = [user1.address];
    const scores = [99];
    const reasons = ["bot activity"];

    await botDetector.connect(analyzer).flagBots(users, scores, reasons);
    await botDetector.connect(analyzer).unflagBot(user1.address);

    const [isBot1, score1] = await botDetector.isBot(user1.address);
    expect(isBot1).to.be.false;
    expect(score1).to.equal(0);
  });

  // 5. Access control test
  it("Should not allow random users to flag bots", async function () {
    const users = [user1.address];
    const scores = [80];
    const reasons = ["random"];

    await expect(
      botDetector.connect(user1).flagBots(users, scores, reasons)
    ).to.be.revertedWith(" not authorized");
  });

  //6. Admin-only function test
  it("Should allow only admin to change analyzer", async function () {
    await botDetector.connect(deployer).setBotAnalyzer(user1.address);
    expect(await botDetector.botAnalyzer()).to.equal(user1.address);

    await expect(
      botDetector.connect(user2).setBotAnalyzer(user2.address)
    ).to.be.revertedWith("Only Admin");
  });

  // Helper functions to get current block timestamp & number
  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  async function getBlockNumber() {
    const block = await ethers.provider.getBlock("latest");
    return block.number;
  }
});
