const truffleAssert = require('truffle-assertions');
const timeMachine = require('ganache-time-traveler');
const ProxyContractV2 = artifacts.require("ProxyFunctionsV2");
const Samari = artifacts.require("Samari");


contract("ProxyContract V2 Anti Whale", accounts => {
  let maxsell;
  let proxyinstance;
  let samariinstance;
  let permille = web3.utils.toBN(1000);
  let oneadd = web3.utils.toBN(1);
  let totalsupply;
  let allowedvalue;
  let pairaddress;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("Check roles!", async () => {
    proxyinstance = await ProxyContractV2.deployed();
    samariinstance = await Samari.deployed();
    await truffleAssert.reverts(
      proxyinstance.beforeSend(accounts[1], accounts[2], oneadd),
      "You are not allowed to call this function!"
    );
  });

  it("Stop selling more than 1%!", async () => {
    proxyinstance = await ProxyContractV2.deployed();
    samariinstance = await Samari.deployed();
    await proxyinstance.grantRole((await proxyinstance.TOKEN_ROLE()), accounts[0]);
    pairaddress = await proxyinstance.uniswapV2Pair();
    maxsell = await proxyinstance.maxsellpermille();
    totalsupply = await samariinstance.totalSupply();
    allowedvalue = totalsupply.mul(maxsell).div(permille);
    failvalue = allowedvalue.add(oneadd);
    await truffleAssert.reverts(
      proxyinstance.beforeSend(accounts[1], pairaddress, failvalue),
      "You have reached your sell limit!"
    );
  });

  it("Allow selling 1% or less", async () => {
    await proxyinstance.grantRole((await proxyinstance.TOKEN_ROLE()), accounts[0]);
    await truffleAssert.passes(
      proxyinstance.beforeSend(accounts[1], pairaddress, allowedvalue)
    );
  });

  it("Check if selling limit is kept during the timeframe", async () => {
    await proxyinstance.grantRole((await proxyinstance.TOKEN_ROLE()), accounts[0]);
    await proxyinstance.beforeSend(accounts[1], pairaddress, allowedvalue.div(web3.utils.toBN(2)));
    await proxyinstance.beforeSend(accounts[1], pairaddress, allowedvalue.div(web3.utils.toBN(2)));
    timeMachine.advanceTimeAndBlock(60 * 59);
    await truffleAssert.reverts(
      proxyinstance.beforeSend(accounts[1], pairaddress, oneadd),
      "You have reached your sell limit!"
    );
  });

  it("Check if selling after time limit is allowed again", async () => {
    await proxyinstance.grantRole((await proxyinstance.TOKEN_ROLE()), accounts[0]);
    await proxyinstance.beforeSend(accounts[1], pairaddress, allowedvalue.div(web3.utils.toBN(2)));
    await proxyinstance.beforeSend(accounts[1], pairaddress, allowedvalue.div(web3.utils.toBN(2)));
    timeMachine.advanceTimeAndBlock(60 * 60);
    await truffleAssert.passes(
      proxyinstance.beforeSend(accounts[1], pairaddress, allowedvalue)
    );
  });

});

contract("ProxyContract V2 Fee Wallet", accounts => {

  let proxyinstance;
  describe('Check access control', function () {
    it("Check if roles are working for withdrawDonationAll", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawDonationAll.call(accounts[1], { from: accounts[1] }),
        "AccessControl: account"
      );
    });

    it("Check if roles are working withdrawMarketingAll", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawMarketingAll.call(accounts[1], { from: accounts[1] }),
        "AccessControl: account"
      );
    });

    it("Check if roles are working withdrawOtherAll", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawOtherAll.call(accounts[1], { from: accounts[1] }),
        "AccessControl: account"
      );
    });

    it("Check if roles are working withdrawDonation", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawDonation.call(accounts[1], 1, { from: accounts[1] }),
        "AccessControl: account"
      );
    });

    it("Check if roles are working withdrawMarketing", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawMarketing.call(accounts[1], 1, { from: accounts[1] }),
        "AccessControl: account"
      );
    });

    it("Check if roles are working withdrawOther", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawOther.call(accounts[1], 1, { from: accounts[1] }),
        "AccessControl: account"
      );
    });
  });

  describe('Check limits', function () {
    it("Check for limit withdrawDonationAll", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawDonationAll.call(accounts[1], { from: accounts[0] }),
        "There isnt enough BNB in this contract!"
      );
    });

    it("Check for limit withdrawMarketingAll!", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawMarketingAll.call(accounts[1], { from: accounts[0] }),
        "There isnt enough BNB in this contract!"
      );
    });

    it("Check for limit withdrawOtherAll!", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawOtherAll.call(accounts[1], { from: accounts[0] }),
        "There isnt enough BNB in this contract!"
      );
    });

    it("Check for limit withdrawDonation!", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawDonation.call(accounts[1], 1, { from: accounts[0] }),
        "There isnt enough BNB in this contract!"
      );
    });

    it("Check for limit withdrawDonation!", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawDonation.call(accounts[1], 1, { from: accounts[0] }),
        "There isnt enough BNB in this contract!"
      );
    });

    it("Check for limit withdrawDonation!", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await truffleAssert.reverts(
        proxyinstance.withdrawDonation.call(accounts[1], 1, { from: accounts[0] }),
        "There isnt enough BNB in this contract!"
      );
    });
  });

  let sendamount = web3.utils.toBN(300);
  let donation = web3.utils.toBN(3);
  let marketing = web3.utils.toBN(5);
  let other = web3.utils.toBN(1);
  let totalfee = donation.add(marketing).add(other);

  describe('Fee distrubiution', function () {

    it("Check shown marketing balance", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      await proxyinstance.updateFees(donation, marketing, 0, other);
      await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
      let marketingbalance = sendamount.mul(marketing).div(totalfee);
      let shownmarketingbalance = await proxyinstance.showMarketingBalance();
      assert(shownmarketingbalance.toString() == marketingbalance.toString(), "The shown marketingbalance is wrong!");
    });

    it("Check shown donation balance", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      let donationbalance = sendamount.mul(donation).div(totalfee);
      let showndonationbalance = await proxyinstance.showDonationBalance();
      assert(showndonationbalance.toString() == donationbalance.toString(), "The shown donation is wrong!");
    });

    it("Check shown other balance", async () => {
      proxyinstance = await ProxyContractV2.deployed();
      let otherbalance = sendamount.mul(other).div(totalfee);
      let shownotherbalance = await proxyinstance.showOtherBalance();
      assert(otherbalance.toString() == shownotherbalance.toString(), "The shown other is wrong!");
    });
  });

  describe('Fee withdraw ALL functions', function () {
    var countervar = 4;
    while (countervar) {
      var contractbalance = web3.utils.toBN(0);
      var calculateddonation = web3.utils.toBN(0);
      var calculatedmarketing = web3.utils.toBN(0);
      var calculatedother = web3.utils.toBN(0);
      it("Send BNB to contract", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let assesedbalance = await proxyinstance.assesedbalance();
        calculateddonation = await proxyinstance.asseseddonationbalance();
        calculatedmarketing = await proxyinstance.assesedmarketingbalance();
        calculatedother = await proxyinstance.assesedotherbalance();
        let sendamount = web3.utils.toBN((301 * (Math.floor(Math.random() * 10) + 1)).toString());
        initialbalance = await web3.eth.getBalance(proxyinstance.address);
        initialbalance = web3.utils.toBN(initialbalance);
        await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
        let afterbalance = await web3.eth.getBalance(proxyinstance.address);
        afterbalance = web3.utils.toBN(afterbalance);
        contractbalance = afterbalance.sub(assesedbalance);
        assert(afterbalance.sub(initialbalance).toString() == sendamount.toString(), "Send balance is wrong!");
      });

      it("Check withdraw all donations", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let donationbalance = contractbalance.mul(donation).div(totalfee).add(calculateddonation);
        await proxyinstance.withdrawDonationAll(accounts[1]);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == donationbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + donationbalance.toString());
      });

      it("Check withdraw all marketing", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let marketingbalance = contractbalance.mul(marketing).div(totalfee).add(calculatedmarketing);
        await proxyinstance.withdrawMarketingAll(accounts[1]);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == marketingbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + marketingbalance.toString());
      });

      it("Check withdraw all other", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let otherbalance = contractbalance.mul(other).div(totalfee).add(calculatedother);
        await proxyinstance.withdrawOtherAll(accounts[1]);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == otherbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + otherbalance.toString());
      });

      it("Check assesed balance is 0", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let assesedbalance = await proxyinstance.assesedbalance();
        assert(assesedbalance.toString() == "0", "The assesed balance is wrong!");
      });

      countervar--;
    }

  });

  describe('Fee withdraw amount functions', function () {
    var countervar = 4;
    while (countervar) {
      var contractbalance = web3.utils.toBN(0);
      var calculateddonation = web3.utils.toBN(0);
      var calculatedmarketing = web3.utils.toBN(0);
      var calculatedother = web3.utils.toBN(0);
      it("Send BNB to contract", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let assesedbalance = await proxyinstance.assesedbalance();
        calculateddonation = await proxyinstance.asseseddonationbalance();
        calculatedmarketing = await proxyinstance.assesedmarketingbalance();
        calculatedother = await proxyinstance.assesedotherbalance();
        let sendamount = web3.utils.toBN((301 * (Math.floor(Math.random() * 10) + 1)).toString());
        initialbalance = await web3.eth.getBalance(proxyinstance.address);
        initialbalance = web3.utils.toBN(initialbalance);
        await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
        let afterbalance = await web3.eth.getBalance(proxyinstance.address);
        afterbalance = web3.utils.toBN(afterbalance);
        contractbalance = afterbalance.sub(assesedbalance);
        assert(afterbalance.sub(initialbalance).toString() == sendamount.toString(), "Send balance is wrong!");
      });

      it("Check withdraw donations", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let donationbalance = contractbalance.mul(donation).div(totalfee).add(calculateddonation);
        await proxyinstance.withdrawDonation(accounts[1], donationbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == donationbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + donationbalance.toString());
      });

      it("Check withdraw marketing", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let marketingbalance = contractbalance.mul(marketing).div(totalfee).add(calculatedmarketing);
        await proxyinstance.withdrawMarketing(accounts[1], marketingbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == marketingbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + marketingbalance.toString());
      });

      it("Check withdraw other", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let otherbalance = contractbalance.mul(other).div(totalfee).add(calculatedother);
        await proxyinstance.withdrawOther(accounts[1], otherbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == otherbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + otherbalance.toString());
      });

      it("Check assesed balance is 0", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let assesedbalance = await proxyinstance.assesedbalance();
        assert(assesedbalance.toString() == "0", "The assesed balance is wrong!");
      });

      countervar--;
    }

  });

  describe('Fee withdraw combined functions', function () {
    var countervar = 4;
    while (countervar) {
      var contractbalance = web3.utils.toBN(0);
      var calculateddonation = web3.utils.toBN(0);
      var calculatedmarketing = web3.utils.toBN(0);
      var calculatedother = web3.utils.toBN(0);
      it("Send BNB to contract", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let assesedbalance = await proxyinstance.assesedbalance();
        calculateddonation = await proxyinstance.asseseddonationbalance();
        calculatedmarketing = await proxyinstance.assesedmarketingbalance();
        calculatedother = await proxyinstance.assesedotherbalance();
        let sendamount = web3.utils.toBN((301 * (Math.floor(Math.random() * 10) + 1)).toString());
        initialbalance = await web3.eth.getBalance(proxyinstance.address);
        initialbalance = web3.utils.toBN(initialbalance);
        await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
        let afterbalance = await web3.eth.getBalance(proxyinstance.address);
        afterbalance = web3.utils.toBN(afterbalance);
        contractbalance = afterbalance.sub(assesedbalance);
        assert(afterbalance.sub(initialbalance).toString() == sendamount.toString(), "Send balance is wrong!");
      });

      it("Check withdraw donations", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let donationbalance = contractbalance.mul(donation).div(totalfee).add(calculateddonation).div(web3.utils.toBN(2));
        await proxyinstance.withdrawDonation(accounts[1], donationbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == donationbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + donationbalance.toString());
      });

      it("Check withdraw marketing", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let marketingbalance = contractbalance.mul(marketing).div(totalfee).add(calculatedmarketing).div(web3.utils.toBN(2));
        await proxyinstance.withdrawMarketing(accounts[1], marketingbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == marketingbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + marketingbalance.toString());
      });

      it("Check withdraw other", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let otherbalance = contractbalance.mul(other).div(totalfee).add(calculatedother).div(web3.utils.toBN(2));
        await proxyinstance.withdrawOther(accounts[1], otherbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == otherbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + otherbalance.toString());
      });

      it("Check withdraw all donations", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let donationbalance = contractbalance.mul(donation).div(totalfee).add(calculateddonation).div(web3.utils.toBN(2));
        await proxyinstance.withdrawDonation(accounts[1], donationbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == donationbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + donationbalance.toString());
      });

      it("Check withdraw all marketing", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let marketingbalance = contractbalance.mul(marketing).div(totalfee).add(calculatedmarketing).div(web3.utils.toBN(2));
        await proxyinstance.withdrawMarketing(accounts[1], marketingbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == marketingbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + marketingbalance.toString());
      });

      it("Check withdraw all other", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let initialbalance = await web3.eth.getBalance(accounts[1]);
        initialbalance = web3.utils.toBN(initialbalance);
        let otherbalance = contractbalance.mul(other).div(totalfee).add(calculatedother).div(web3.utils.toBN(2));
        await proxyinstance.withdrawOther(accounts[1], otherbalance);
        let afterbalance = await web3.eth.getBalance(accounts[1]);
        afterbalance = web3.utils.toBN(afterbalance);
        let balancedifference = afterbalance.sub(initialbalance);
        assert(balancedifference.toString() == otherbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + otherbalance.toString());
      });;

      it("Check assesed balance is integrity", async () => {
        proxyinstance = await ProxyContractV2.deployed();
        let assesedbalance = await proxyinstance.assesedbalance();
        calculateddonation = await proxyinstance.asseseddonationbalance();
        calculatedmarketing = await proxyinstance.assesedmarketingbalance();
        calculatedother = await proxyinstance.assesedotherbalance();
        let totalbalance = calculateddonation.add(calculatedmarketing).add(calculatedother);
        assert(assesedbalance.toString() == totalbalance.toString(), "The assesed balance is wrong!");
      });

      countervar--;
    }

    describe('Check add between withdraw functions', function () {
      var countervar = 4;
      while (countervar) {
        var contractbalance = web3.utils.toBN(0);
        var calculateddonation = web3.utils.toBN(0);
        var calculatedmarketing = web3.utils.toBN(0);
        var calculatedother = web3.utils.toBN(0);

        it("Send BNB to contract", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let assesedbalance = await proxyinstance.assesedbalance();
          calculateddonation = await proxyinstance.asseseddonationbalance();
          calculatedmarketing = await proxyinstance.assesedmarketingbalance();
          calculatedother = await proxyinstance.assesedotherbalance();
          let sendamount = web3.utils.toBN((301 * (Math.floor(Math.random() * 10) + 1)).toString());
          initialbalance = await web3.eth.getBalance(proxyinstance.address);
          initialbalance = web3.utils.toBN(initialbalance);
          await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
          let afterbalance = await web3.eth.getBalance(proxyinstance.address);
          afterbalance = web3.utils.toBN(afterbalance);
          contractbalance = afterbalance.sub(assesedbalance);
          assert(afterbalance.sub(initialbalance).toString() == sendamount.toString(), "Send balance is wrong!");
        });

        it("Check withdraw donations", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let initialbalance = await web3.eth.getBalance(accounts[1]);
          initialbalance = web3.utils.toBN(initialbalance);
          let donationbalance = contractbalance.mul(donation).div(totalfee).add(calculateddonation).div(web3.utils.toBN(2));
          let showndonationbalance = await proxyinstance.showDonationBalance();
          await proxyinstance.withdrawDonation(accounts[1], donationbalance);
          let afterbalance = await web3.eth.getBalance(accounts[1]);
          afterbalance = web3.utils.toBN(afterbalance);
          let balancedifference = afterbalance.sub(initialbalance);
          assert(balancedifference.toString() == donationbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + donationbalance.toString());
        });

        it("Send BNB to contract", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let assesedbalance = await proxyinstance.assesedbalance();
          calculateddonation = await proxyinstance.asseseddonationbalance();
          calculatedmarketing = await proxyinstance.assesedmarketingbalance();
          calculatedother = await proxyinstance.assesedotherbalance();
          let sendamount = web3.utils.toBN((301 * (Math.floor(Math.random() * 10) + 1)).toString());
          initialbalance = await web3.eth.getBalance(proxyinstance.address);
          initialbalance = web3.utils.toBN(initialbalance);
          await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
          let afterbalance = await web3.eth.getBalance(proxyinstance.address);
          afterbalance = web3.utils.toBN(afterbalance);
          contractbalance = afterbalance.sub(assesedbalance);
          assert(afterbalance.sub(initialbalance).toString() == sendamount.toString(), "Send balance is wrong!");
        });

        it("Check withdraw marketing", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let initialbalance = await web3.eth.getBalance(accounts[1]);
          initialbalance = web3.utils.toBN(initialbalance);
          let marketingbalance = contractbalance.mul(marketing).div(totalfee).add(calculatedmarketing).div(web3.utils.toBN(2));
          await proxyinstance.withdrawMarketing(accounts[1], marketingbalance);
          let afterbalance = await web3.eth.getBalance(accounts[1]);
          afterbalance = web3.utils.toBN(afterbalance);
          let balancedifference = afterbalance.sub(initialbalance);
          assert(balancedifference.toString() == marketingbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + marketingbalance.toString());
        });

        it("Send BNB to contract", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let assesedbalance = await proxyinstance.assesedbalance();
          calculateddonation = await proxyinstance.asseseddonationbalance();
          calculatedmarketing = await proxyinstance.assesedmarketingbalance();
          calculatedother = await proxyinstance.assesedotherbalance();
          let sendamount = web3.utils.toBN((301 * (Math.floor(Math.random() * 10) + 1)).toString());
          initialbalance = await web3.eth.getBalance(proxyinstance.address);
          initialbalance = web3.utils.toBN(initialbalance);
          await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
          let afterbalance = await web3.eth.getBalance(proxyinstance.address);
          afterbalance = web3.utils.toBN(afterbalance);
          contractbalance = afterbalance.sub(assesedbalance);
          assert(afterbalance.sub(initialbalance).toString() == sendamount.toString(), "Send balance is wrong!");
        });

        it("Check withdraw other", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let initialbalance = await web3.eth.getBalance(accounts[1]);
          initialbalance = web3.utils.toBN(initialbalance);
          let otherbalance = contractbalance.mul(other).div(totalfee).add(calculatedother).div(web3.utils.toBN(2));
          await proxyinstance.withdrawOther(accounts[1], otherbalance);
          let afterbalance = await web3.eth.getBalance(accounts[1]);
          afterbalance = web3.utils.toBN(afterbalance);
          let balancedifference = afterbalance.sub(initialbalance);
          assert(balancedifference.toString() == otherbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + otherbalance.toString());
        });

        it("Send BNB to contract", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let assesedbalance = await proxyinstance.assesedbalance();
          calculateddonation = await proxyinstance.asseseddonationbalance();
          calculatedmarketing = await proxyinstance.assesedmarketingbalance();
          calculatedother = await proxyinstance.assesedotherbalance();
          let sendamount = web3.utils.toBN((301 * (Math.floor(Math.random() * 10) + 1)).toString());
          initialbalance = await web3.eth.getBalance(proxyinstance.address);
          initialbalance = web3.utils.toBN(initialbalance);
          await web3.eth.sendTransaction({ from: accounts[0], to: proxyinstance.address, value: sendamount });
          let afterbalance = await web3.eth.getBalance(proxyinstance.address);
          afterbalance = web3.utils.toBN(afterbalance);
          contractbalance = afterbalance.sub(assesedbalance);
          assert(afterbalance.sub(initialbalance).toString() == sendamount.toString(), "Send balance is wrong!");
        });

        it("Check withdraw all donations", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let initialbalance = await web3.eth.getBalance(accounts[1]);
          initialbalance = web3.utils.toBN(initialbalance);
          let donationbalance = contractbalance.mul(donation).div(totalfee).add(calculateddonation);
          await proxyinstance.withdrawDonationAll(accounts[1]);
          let afterbalance = await web3.eth.getBalance(accounts[1]);
          afterbalance = web3.utils.toBN(afterbalance);
          let balancedifference = afterbalance.sub(initialbalance);
          assert(balancedifference.toString() == donationbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + donationbalance.toString());
        });

        it("Check withdraw all marketing", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let initialbalance = await web3.eth.getBalance(accounts[1]);
          initialbalance = web3.utils.toBN(initialbalance);
          let marketingbalance = contractbalance.mul(marketing).div(totalfee).add(calculatedmarketing);
          await proxyinstance.withdrawMarketingAll(accounts[1]);
          let afterbalance = await web3.eth.getBalance(accounts[1]);
          afterbalance = web3.utils.toBN(afterbalance);
          let balancedifference = afterbalance.sub(initialbalance);
          assert(balancedifference.toString() == marketingbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + marketingbalance.toString());
        });

        it("Check withdraw all other", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let initialbalance = await web3.eth.getBalance(accounts[1]);
          initialbalance = web3.utils.toBN(initialbalance);
          let otherbalance = contractbalance.mul(other).div(totalfee).add(calculatedother);
          await proxyinstance.withdrawOtherAll(accounts[1]);
          let afterbalance = await web3.eth.getBalance(accounts[1]);
          afterbalance = web3.utils.toBN(afterbalance);
          let balancedifference = afterbalance.sub(initialbalance);
          assert(balancedifference.toString() == otherbalance.toString(), "The withdrawn balance is wrong! Recieved:" + balancedifference.toString() + " calculated:" + otherbalance.toString());
        });

        it("Check assesed balance is 0", async () => {
          proxyinstance = await ProxyContractV2.deployed();
          let assesedbalance = await proxyinstance.assesedbalance();
          assert(assesedbalance.toString() == "0", "The assesed balance is wrong!");
        });

        countervar--;
      }

    });

  });

});