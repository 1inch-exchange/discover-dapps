/*global contract, config, it, embark, web3, before, describe, beforeEach*/
const TestUtils = require("../utils/testUtils");

const DAppStore = require('Embark/contracts/DAppStore');
const SNT = embark.require('Embark/contracts/SNT');


config({
  deployment: {
    accounts: [
      {
        mnemonic: "foster gesture flock merge beach plate dish view friend leave drink valley shield list enemy",
        balance: "5 ether",
        numAddresses: "10"
      }
    ]
  },
  contracts: {
    "MiniMeToken": { "deploy": false },
    "MiniMeTokenFactory": { },
    "SNT": {
      "instanceOf": "MiniMeToken",
      "args": [
        "$MiniMeTokenFactory",
        "0x0000000000000000000000000000000000000000",
        0,
        "TestMiniMeToken",
        18,
        "SNT",
        true
      ]
    },
    "DAppStore": {
      args: [ "$SNT" ]
    }
  }
}, (_err, web3_accounts) => {
  accounts = web3_accounts
});

contract("DAppStore", function () {

  this.timeout(0);

  it("should set max and safeMax values correctly", async function () {
    let resultMax = await DAppStore.methods.max().call();
    let resultSafeMax = await DAppStore.methods.safeMax().call();
    let expectedMax = Math.round(3470483788 * 588 / 1000000);
    let expectedSafeMax = Math.round(expectedMax * 0.98);
    assert.strictEqual(parseInt(resultMax, 10), expectedMax);
    assert.strictEqual(parseInt(resultSafeMax, 10), expectedSafeMax);
  });

  it("should create a new DApp and initialise it correctly", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let amount = 100000;

    await SNT.methods.generateTokens(accounts[0], amount).send();
    const encodedCall = DAppStore.methods.createDApp(id,amount).encodeABI();
    await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[0]});

    let receipt = await DAppStore.methods.dapps(0).call();
    
    let developer = accounts[0];
    assert.strictEqual(receipt.developer, developer);

    assert.strictEqual(receipt.id, id);

    // Check the DApp Store actually receives the SNT!
    let bal_receipt = await SNT.methods.balanceOf(DAppStore.options.address).call();
    let expected_bal = amount;
    assert.strictEqual(parseInt(bal_receipt, 10), expected_bal);

    // Having received the SNT, check that it updates the particular DApp balanc
    assert.strictEqual(parseInt(receipt.balance, 10), amount);

    let max = await DAppStore.methods.max().call();
    let decimals = await DAppStore.methods.decimals().call();
    let rate = Math.round(decimals - (amount * decimals/max));
    assert.strictEqual(parseInt(receipt.rate, 10), rate);

    let available = amount * rate;
    assert.strictEqual(parseInt(receipt.available, 10), available);

    let votes_minted = Math.round((available/decimals) ** (decimals/rate));
    assert.strictEqual(parseInt(receipt.votes_minted, 10), votes_minted);

    assert.strictEqual(parseInt(receipt.votes_cast, 10), 0);
    assert.strictEqual(parseInt(receipt.effective_balance, 10), amount);
  })

  it("should not create a new DApp when exceeding the ceiling or staking nothing", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let amount = 2000000;
    let amount0 = 0;
    await SNT.methods.generateTokens(accounts[0], amount).send();

    const encodedCall = DAppStore.methods.createDApp(id,amount).encodeABI();
    try {
      await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[0]});
    } catch (error) {
      TestUtils.assertJump(error);
    }

    const encodedCall0 = DAppStore.methods.createDApp(id,amount0).encodeABI();
    try {
      await SNT.methods.approveAndCall(DAppStore.options.address, amount0, encodedCall0).send({from: accounts[0]});
    } catch (error) {
      TestUtils.assertJump(error);
    }
  })

  it("should handle first upvote correctly", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let amount = 100;

    let initial = await DAppStore.methods.dapps(0).call();

    await SNT.methods.generateTokens(accounts[0], amount).send();
    const encodedCall = DAppStore.methods.upvote(id,amount).encodeABI();
    await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[0]});

    let receipt = await DAppStore.methods.dapps(0).call();
    
    let developer = accounts[0];
    assert.strictEqual(receipt.developer, developer);

    assert.strictEqual(receipt.id, id);

    // Check the DApp Store actually receives the SNT!
    // At this stage, we have 100 000 SNT in the store from the first creation event.
    let bal_receipt = await SNT.methods.balanceOf(DAppStore.options.address).call();
    let expected_bal = 100000 + amount;
    assert.strictEqual(parseInt(bal_receipt, 10), expected_bal);

    // Having received the SNT, check that it updates the particular DApp balance
    let upvotedBalance = parseInt(initial.balance, 10) + amount
    assert.strictEqual(parseInt(receipt.balance, 10), upvotedBalance);

    let max = await DAppStore.methods.max().call();
    let decimals = await DAppStore.methods.decimals().call();
    let rate = Math.round(decimals - (upvotedBalance * decimals/max));
    assert.strictEqual(parseInt(receipt.rate, 10), rate);

    let available = upvotedBalance * rate;
    assert.strictEqual(parseInt(receipt.available, 10), available);

    let votes_minted = Math.round((available/decimals) ** (decimals/rate));
    assert.strictEqual(parseInt(receipt.votes_minted, 10), votes_minted);

    assert.strictEqual(parseInt(receipt.votes_cast, 10), 0);

    assert.strictEqual(parseInt(receipt.effective_balance, 10), upvotedBalance);
  })

  it("should not let you upvote without spending SNT", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let amount = 0;

    await SNT.methods.generateTokens(accounts[0], 10000).send();
    const encodedCall = DAppStore.methods.upvote(id,amount).encodeABI();
    try {
      await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[0]});
    } catch (error) {
      TestUtils.assertJump(error);
    }
  })

  it("should not let you upvote by an amount that exceeds the ceiling", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let amount = 2000000;

    await SNT.methods.generateTokens(accounts[0], amount).send();
    const encodedCall = DAppStore.methods.upvote(id,amount).encodeABI();
    try {
      await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[0]});
    } catch (error) {
      TestUtils.assertJump(error);
    }
  })

  it("should handle first downvote correctly", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let cost = await DAppStore.methods.downvoteCost(id).call()
    let amount = parseInt(cost.c, 10);

    let initial = await DAppStore.methods.dapps(0).call();

    await SNT.methods.generateTokens(accounts[1], amount).send();
    const encodedCall = DAppStore.methods.downvote(id,amount).encodeABI();
    await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[1]});
    
    let receipt = await DAppStore.methods.dapps(0).call();

    let developer = accounts[0];
    assert.strictEqual(receipt.developer, developer);

    assert.strictEqual(receipt.id, id);

    // Check the developer actually receives the SNT!
    // By this stage, we have minted 4 010 000 SNT in accounts[0], so let's take that into account.
    let bal_receipt = await SNT.methods.balanceOf(developer).call();
    let expected_bal = 4010000 + amount;
    assert.strictEqual(parseInt(bal_receipt, 10), expected_bal);

    // Balance, rate, and votes_minted remain unchanged for downvotes
    assert.strictEqual(receipt.balance, initial.balance);

    assert.strictEqual(receipt.rate, initial.rate);

    assert.strictEqual(receipt.votes_minted, initial.votes_minted);

    let available = parseInt(initial.available, 10) - parseInt(cost.c, 10);
    assert.strictEqual(parseInt(receipt.available, 10), available);

    assert.strictEqual(parseInt(receipt.votes_cast, 10), parseInt(cost.v_r, 10));

    let e_balance = parseInt(initial.effective_balance, 10) - parseInt(cost.b, 10);
    assert.strictEqual(parseInt(receipt.effective_balance, 10), e_balance);
  })

  it("should not let you downvote by the wrong amount", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let amount = 10000;

    await SNT.methods.generateTokens(accounts[1], amount).send();
    const encodedCall = DAppStore.methods.downvote(id,amount).encodeABI();
    try {
      await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[1]});
    } catch (error) {
      TestUtils.assertJump(error);
    }
  })

  it("should handle upvotes correctly when votes have been cast", async function () {
    let id = "0x7465737400000000000000000000000000000000000000000000000000000000";
    let amount = 500;

    let initial = await DAppStore.methods.dapps(0).call();

    await SNT.methods.generateTokens(accounts[0], amount).send();
    const encodedCall = DAppStore.methods.upvote(id,amount).encodeABI();
    await SNT.methods.approveAndCall(DAppStore.options.address, amount, encodedCall).send({from: accounts[0]});

    let receipt = await DAppStore.methods.dapps(0).call();
    
    let developer = accounts[0];
    assert.strictEqual(receipt.developer, developer);

    assert.strictEqual(receipt.id, id);

    // Check the DApp Store actually receives the SNT!
    // At this stage, we have 100 100 SNT in the store from the first create and upvote events.
    let bal_receipt = await SNT.methods.balanceOf(DAppStore.options.address).call();
    let expected_bal = 100100 + amount;
    assert.strictEqual(parseInt(bal_receipt, 10), expected_bal);

    // Having received the SNT, check that it updates the particular DApp balance
    let upvotedBalance = parseInt(initial.balance, 10) + amount
    assert.strictEqual(parseInt(receipt.balance, 10), upvotedBalance);

    let max = await DAppStore.methods.max().call();
    let decimals = await DAppStore.methods.decimals().call();
    let rate = Math.round(decimals - (upvotedBalance * decimals/max));
    assert.strictEqual(parseInt(receipt.rate, 10), rate);

    let available = upvotedBalance * rate;
    assert.strictEqual(parseInt(receipt.available, 10), available);

    let votes_minted = parseInt(receipt.votes_minted, 10);

    // Votes have been cast by this stage, so we need to check how many there are
    // and confirm that `upvote` still calculates the effective_balance correctly
    let votes_cast = parseInt(receipt.votes_cast, 10);
    let e_balance = Math.round(upvotedBalance - ((votes_cast*rate/decimals)*(available/decimals/votes_minted)));

    assert.strictEqual(parseInt(receipt.effective_balance, 10), e_balance);
  })
});
