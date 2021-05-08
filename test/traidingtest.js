var Samari = artifacts.require("Samari");
var ProxyFunctions = artifacts.require("ProxyFunctions");
var Router = artifacts.require("IUniswapV2Router02");




contract("Traiding test", async accounts => {
    it("It should add liquidity", async () => {
        const routerinstance = await Router.at("0x10ED43C718714eb63d5aA57B78B54704E256024E");
      const samari_inst = await Samari.deployed();
      const proxy_inst = await ProxyFunctions.deployed();
        await routerinstance.addLiquidityETH.call(samari_inst.address, BN.from("124072744887300000000"), BN.from("124072744887300000000"), ethers.utils.ParseEther(2), accounts[0], Date.now + 500);
        var liquidityaddress = sproxy_inst.uniswapV2Pair.sendTransaction();
        var liquiditybalance = samari_inst.balanceOf.sendTransaction(liquidityaddress);
      assert(liquiditybalance>0);
    });
  
    // it("should call a function that depends on a linked library", async () => {
    //   const meta = await MetaCoin.deployed();
    //   const outCoinBalance = await meta.getBalance.call(accounts[0]);
    //   const metaCoinBalance = outCoinBalance.toNumber();
    //   const outCoinBalanceEth = await meta.getBalanceInEth.call(accounts[0]);
    //   const metaCoinEthBalance = outCoinBalanceEth.toNumber();
    //   assert.equal(metaCoinEthBalance, 2 * metaCoinBalance);
    // });
  
    // it("should send coin correctly", async () => {
    //   // Get initial balances of first and second account.
    //   const account_one = accounts[0];
    //   const account_two = accounts[1];
  
    //   const amount = 10;
  
    //   const instance = await MetaCoin.deployed();
    //   const meta = instance;
  
    //   const balance = await meta.getBalance.call(account_one);
    //   const account_one_starting_balance = balance.toNumber();
  
    //   balance = await meta.getBalance.call(account_two);
    //   const account_two_starting_balance = balance.toNumber();
    //   await meta.sendCoin(account_two, amount, { from: account_one });
  
    //   balance = await meta.getBalance.call(account_one);
    //   const account_one_ending_balance = balance.toNumber();
  
    //   balance = await meta.getBalance.call(account_two);
    //   const account_two_ending_balance = balance.toNumber();
  
    //   assert.equal(
    //     account_one_ending_balance,
    //     account_one_starting_balance - amount,
    //     "Amount wasn't correctly taken from the sender"
    //   );
    //   assert.equal(
    //     account_two_ending_balance,
    //     account_two_starting_balance + amount,
    //     "Amount wasn't correctly sent to the receiver"
    //   );
    //});
  });
