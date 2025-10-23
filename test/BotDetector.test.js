import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
const { parseUnits } = ethers.utils;

describe("BotDetectorWithPyth - Good/Bad Bot Classification", function () {
  let BotDetector, botDetector, deployer, analyzer, user1, user2, goodBot, badBot;

  beforeEach(async function () {
    [deployer, analyzer, user1, user2, goodBot, badBot] = await ethers.getSigners();

    BotDetector = await ethers.getContractFactory("BotDetectorWithPyth");
    botDetector = await BotDetector.deploy(
      "0x0000000000000000000000000000000000000000", // Mock Pyth contract
      analyzer.address
    );
  });

  // ==================== BASIC TESTS ====================

  describe("Basic Setup", function () {
    it("Should set admin and analyzer correctly", async function () {
      expect(await botDetector.admin()).to.equal(deployer.address);
      expect(await botDetector.botAnalyzer()).to.equal(analyzer.address);
    });

    it("Should initialize empty bot arrays", async function () {
      expect(await botDetector.getGoodBotsCount()).to.equal(0);
      expect(await botDetector.getBadBotsCount()).to.equal(0);
    });
  });

  // ==================== TRADE EXECUTION TESTS ====================

  describe("Trade Execution", function () {
    it("Should record a trade and emit event", async function () {
            const amount = parseUnits("1000", "ether");
      const tx = await botDetector.connect(user1).executeTrade(amount);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(botDetector, "TradeExecuted")
        .withArgs(user1.address, block.timestamp, amount, receipt.blockNumber, 0);

      const trades = await botDetector.getUserTrades(user1.address);
      expect(trades.length).to.equal(1);
      expect(trades[0].amount).to.equal(amount);
    });

    it("Should allow multiple trades from same user", async function () {
      const amount1 = parseUnits("1000", "ether");
      const amount2 = parseUnits("2000", "ether");
      
      await botDetector.connect(user1).executeTrade(amount1);
      await botDetector.connect(user1).executeTrade(amount2);

      const trades = await botDetector.getUserTrades(user1.address);
      expect(trades.length).to.equal(2);
      expect(trades[0].amount).to.equal(amount1);
      expect(trades[1].amount).to.equal(amount2);
    });

    it("Should block bad bots from trading", async function () {
      // Flag as bad bot first
      const users = [badBot.address];
      const scores = [75];
      const riskLevels = ["HIGH"];
      
      await botDetector.connect(analyzer).flagBadBots(users, scores, riskLevels);

      // Attempt to trade
      const amount = parseUnits("1000", "ether");
      await expect(
        botDetector.connect(badBot).executeTrade(amount)
      ).to.be.revertedWith("Bad bot detected - trading blocked!");
    });

    it("Should allow good bots to trade", async function () {
      // Flag as good bot first
      const users = [goodBot.address];
      const scores = [45];
      const botTypes = ["Market Maker"];
      const liquidityAmounts = [parseUnits("1500", "ether")];
      
      await botDetector.connect(analyzer).flagGoodBots(
        users, 
        scores, 
        botTypes, 
        liquidityAmounts
      );

      // Good bot should be able to trade
      const amount = parseUnits("1000", "ether");
      await expect(
        botDetector.connect(goodBot).executeTrade(amount)
      ).to.not.be.reverted;
    });
  });

  // ==================== GOOD BOT TESTS ====================

  describe("Good Bot Classification", function () {
    it("Should flag good bots correctly", async function () {
      const users = [goodBot.address];
      const scores = [45];
      const botTypes = ["Market Maker"];
            const liquidityAmounts = [parseUnits("1500", "ether")];
      
      await botDetector.connect(analyzer).flagGoodBots(
        users, 
        scores, 
        botTypes, 
        liquidityAmounts
      );

      const botInfo = await botDetector.getBotInfo(goodBot.address);
      expect(botInfo.isFlagged).to.be.true;
      expect(botInfo.score).to.equal(45);
      expect(botInfo.category).to.equal(1); // GOOD_BOT
      expect(botInfo.botType).to.equal("Market Maker");
    });

    it("Should add good bot to goodBots array", async function () {
      const users = [goodBot.address];
      const scores = [50];
      const botTypes = ["Arbitrage Bot"];
      const liquidityAmounts = [parseUnits("2000", "ether")];
      
      await botDetector.connect(analyzer).flagGoodBots(
        users, 
        scores, 
        botTypes, 
        liquidityAmounts
      );

      expect(await botDetector.getGoodBotsCount()).to.equal(1);
      expect(await botDetector.isGoodBotAddress(goodBot.address)).to.be.true;
      
      const goodBots = await botDetector.getGoodBots();
      expect(goodBots.length).to.equal(1);
      expect(goodBots[0]).to.equal(goodBot.address);
    });

    it("Should store liquidity information for good bots", async function () {
      const users = [goodBot.address];
      const scores = [48];
      const botTypes = ["Market Maker"];
      const liquidityAmounts = [parseUnits("3000", "ether")];
      
      await botDetector.connect(analyzer).flagGoodBots(
        users, 
        scores, 
        botTypes, 
        liquidityAmounts
      );

      const botInfo = await botDetector.getBotInfo(goodBot.address);
      expect(botInfo.liquidityProvided).to.equal(liquidityAmounts[0]);
    });

    it("Should flag multiple good bots", async function () {
      const users = [user1.address, user2.address];
      const scores = [42, 55];
      const botTypes = ["Market Maker", "Arbitrage Bot"];
      const liquidityAmounts = [
        parseUnits("1500", "ether"),
        parseUnits("2500", "ether")
      ];
      
      await botDetector.connect(analyzer).flagGoodBots(
        users, 
        scores, 
        botTypes, 
        liquidityAmounts
      );

      expect(await botDetector.getGoodBotsCount()).to.equal(2);
      expect(await botDetector.isGoodBotAddress(user1.address)).to.be.true;
      expect(await botDetector.isGoodBotAddress(user2.address)).to.be.true;
    });
  });

  // ==================== BAD BOT TESTS ====================

  describe("Bad Bot Classification", function () {
    it("Should flag bad bots correctly", async function () {
      const users = [badBot.address];
      const scores = [75];
      const riskLevels = ["HIGH"];
      
      await botDetector.connect(analyzer).flagBadBots(users, scores, riskLevels);

      const botInfo = await botDetector.getBotInfo(badBot.address);
      expect(botInfo.isFlagged).to.be.true;
      expect(botInfo.score).to.equal(75);
      expect(botInfo.category).to.equal(2); // BAD_BOT
      expect(botInfo.botType).to.equal("Manipulative");
    });

    it("Should add bad bot to badBots array", async function () {
      const users = [badBot.address];
      const scores = [85];
      const riskLevels = ["CRITICAL"];
      
      await botDetector.connect(analyzer).flagBadBots(users, scores, riskLevels);

      expect(await botDetector.getBadBotsCount()).to.equal(1);
      expect(await botDetector.isBadBotAddress(badBot.address)).to.be.true;
      
      const badBots = await botDetector.getBadBots();
      expect(badBots.length).to.equal(1);
      expect(badBots[0]).to.equal(badBot.address);
    });

    it("Should have zero liquidity for bad bots", async function () {
      const users = [badBot.address];
      const scores = [90];
      const riskLevels = ["CRITICAL"];
      
      await botDetector.connect(analyzer).flagBadBots(users, scores, riskLevels);

      const botInfo = await botDetector.getBotInfo(badBot.address);
      expect(botInfo.liquidityProvided).to.equal(0);
    });

    it("Should flag multiple bad bots", async function () {
      const users = [user1.address, user2.address];
      const scores = [70, 95];
      const riskLevels = ["HIGH", "CRITICAL"];
      
      await botDetector.connect(analyzer).flagBadBots(users, scores, riskLevels);

      expect(await botDetector.getBadBotsCount()).to.equal(2);
      expect(await botDetector.isBadBotAddress(user1.address)).to.be.true;
      expect(await botDetector.isBadBotAddress(user2.address)).to.be.true;
    });
  });

  // ==================== RECLASSIFICATION TESTS ====================

  describe("Bot Reclassification", function () {
    it("Should move bot from bad to good", async function () {
      // First flag as bad bot
      await botDetector.connect(analyzer).flagBadBots(
        [user1.address],
        [70],
        ["HIGH"]
      );

      expect(await botDetector.getBadBotsCount()).to.equal(1);
      expect(await botDetector.getGoodBotsCount()).to.equal(0);

      // Reclassify as good bot
      await botDetector.connect(analyzer).flagGoodBots(
        [user1.address],
        [45],
        ["Market Maker"],
        [parseUnits("1500", "ether")]
      );

      expect(await botDetector.getBadBotsCount()).to.equal(0);
      expect(await botDetector.getGoodBotsCount()).to.equal(1);
      expect(await botDetector.isGoodBotAddress(user1.address)).to.be.true;
      expect(await botDetector.isBadBotAddress(user1.address)).to.be.false;
    });

    it("Should move bot from good to bad", async function () {
      // First flag as good bot
      await botDetector.connect(analyzer).flagGoodBots(
        [user1.address],
        [50],
        ["Arbitrage Bot"],
        [parseUnits("2000", "ether")]
      );

      expect(await botDetector.getGoodBotsCount()).to.equal(1);
      expect(await botDetector.getBadBotsCount()).to.equal(0);

      // Reclassify as bad bot
      await botDetector.connect(analyzer).flagBadBots(
        [user1.address],
        [75],
        ["HIGH"]
      );

      expect(await botDetector.getGoodBotsCount()).to.equal(0);
      expect(await botDetector.getBadBotsCount()).to.equal(1);
      expect(await botDetector.isBadBotAddress(user1.address)).to.be.true;
      expect(await botDetector.isGoodBotAddress(user1.address)).to.be.false;
    });
  });

  // ==================== UNFLAG TESTS ====================

  describe("Unflag Bot", function () {
    it("Should unflag good bot and remove from array", async function () {
      await botDetector.connect(analyzer).flagGoodBots(
        [goodBot.address],
        [45],
        ["Market Maker"],
        [parseUnits("1500", "ether")]
      );

      await botDetector.connect(analyzer).unflagBot(goodBot.address);

      const botInfo = await botDetector.getBotInfo(goodBot.address);
      expect(botInfo.isFlagged).to.be.false;
      expect(await botDetector.getGoodBotsCount()).to.equal(0);
      expect(await botDetector.isGoodBotAddress(goodBot.address)).to.be.false;
    });

    it("Should unflag bad bot and remove from array", async function () {
      await botDetector.connect(analyzer).flagBadBots(
        [badBot.address],
        [85],
        ["CRITICAL"]
      );

      await botDetector.connect(analyzer).unflagBot(badBot.address);

      const botInfo = await botDetector.getBotInfo(badBot.address);
      expect(botInfo.isFlagged).to.be.false;
      expect(await botDetector.getBadBotsCount()).to.equal(0);
      expect(await botDetector.isBadBotAddress(badBot.address)).to.be.false;
    });

    it("Should emit BotUnflagged event", async function () {
      await botDetector.connect(analyzer).flagBadBots(
        [badBot.address],
        [75],
        ["HIGH"]
      );

      await expect(
        botDetector.connect(analyzer).unflagBot(badBot.address)
      ).to.emit(botDetector, "BotUnflagged")
       .withArgs(badBot.address, 2); // 2 = BAD_BOT category
    });
  });

  // ==================== QUERY TESTS ====================

  describe("Query Functions", function () {
    beforeEach(async function () {
      // Set up some bots
      await botDetector.connect(analyzer).flagGoodBots(
        [user1.address, user2.address],
        [45, 50],
        ["Market Maker", "Arbitrage Bot"],
        [parseUnits("1500", "ether"), parseUnits("2000", "ether")]
      );

      await botDetector.connect(analyzer).flagBadBots(
        [goodBot.address, badBot.address],
        [70, 85],
        ["HIGH", "CRITICAL"]
      );
    });

    it("Should return correct good bots array", async function () {
      const goodBots = await botDetector.getGoodBots();
      expect(goodBots.length).to.equal(2);
      expect(goodBots).to.include(user1.address);
      expect(goodBots).to.include(user2.address);
    });

    it("Should return correct bad bots array", async function () {
      const badBots = await botDetector.getBadBots();
      expect(badBots.length).to.equal(2);
      expect(badBots).to.include(goodBot.address);
      expect(badBots).to.include(badBot.address);
    });

    it("Should return correct bot counts", async function () {
      expect(await botDetector.getGoodBotsCount()).to.equal(2);
      expect(await botDetector.getBadBotsCount()).to.equal(2);
    });

    it("Should return correct bot info", async function () {
      const info = await botDetector.getBotInfo(user1.address);
      expect(info.isFlagged).to.be.true;
      expect(info.score).to.equal(45);
      expect(info.category).to.equal(1); // GOOD_BOT
      expect(info.botType).to.equal("Market Maker");
    });
  });

  // ==================== ACCESS CONTROL TESTS ====================

  describe("Access Control", function () {
    it("Should not allow random users to flag good bots", async function () {
      await expect(
        botDetector.connect(user1).flagGoodBots(
          [user2.address],
          [45],
          ["Market Maker"],
          [parseUnits("1500", "ether")]
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should not allow random users to flag bad bots", async function () {
      await expect(
        botDetector.connect(user1).flagBadBots(
          [user2.address],
          [75],
          ["HIGH"]
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should not allow random users to unflag bots", async function () {
      await botDetector.connect(analyzer).flagBadBots(
        [badBot.address],
        [75],
        ["HIGH"]
      );

      await expect(
        botDetector.connect(user1).unflagBot(badBot.address)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow only admin to change analyzer", async function () {
      await botDetector.connect(deployer).setBotAnalyzer(user1.address);
      expect(await botDetector.botAnalyzer()).to.equal(user1.address);

      await expect(
        botDetector.connect(user2).setBotAnalyzer(user2.address)
      ).to.be.revertedWith("Only admin");
    });

    it("Should allow analyzer to flag bots", async function () {
      await expect(
        botDetector.connect(analyzer).flagGoodBots(
          [user1.address],
          [45],
          ["Market Maker"],
          [parseUnits("1500", "ether")]
        )
      ).to.not.be.reverted;
    });
  });

  // ==================== EDGE CASES ====================

  describe("Edge Cases", function () {
    it("Should handle empty arrays", async function () {
      await botDetector.connect(analyzer).flagGoodBots([], [], [], []);
      expect(await botDetector.getGoodBotsCount()).to.equal(0);
    });

    it("Should reject mismatched array lengths", async function () {
      await expect(
        botDetector.connect(analyzer).flagGoodBots(
          [user1.address],
          [45, 50], // Wrong length
          ["Market Maker"],
          [parseUnits("1500", "ether")]
        )
      ).to.be.revertedWith("Length mismatch");
    });

    it("Should not duplicate bots in arrays", async function () {
      // Flag same bot twice
      await botDetector.connect(analyzer).flagGoodBots(
        [user1.address],
        [45],
        ["Market Maker"],
        [parseUnits("1500", "ether")]
      );

      await botDetector.connect(analyzer).flagGoodBots(
        [user1.address],
        [50],
        ["Market Maker"],
        [parseUnits("2000", "ether")]
      );

      // Should still only have one entry
      expect(await botDetector.getGoodBotsCount()).to.equal(1);
    });
  });
});