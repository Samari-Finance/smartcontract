const Samari = artifacts.require("Samari");
const ProxyFunctions2 = artifacts.require("ProxyFunctionsV2");
const ProxyFunctions = artifacts.require("ProxyFunctions");

module.exports = async function(deployer, accounts) {
    instances = await Promise.all([
        Samari.at("0xb255cddf7fbaf1cbcc57d16fe2eaffffdbf5a8be"),
        ProxyFunctions.at("0x148fc609378af4256f2e799ebceea032fc346474")
    ])
    SamariInst = instances[0];
    OldProxyInst = instances[1];
    routeraddress = await OldProxyInst.uniswapV2Router();
    console.log("Router address: " + routeraddress);
    pairaddress = await OldProxyInst.uniswapV2Pair();
    console.log("Pair address: " + pairaddress);
    await Promise.all([
        deployer.deploy(ProxyFunctions2, SamariInst.address, routeraddress, pairaddress, {from: accounts[3]}),
    ]);
    instances = await Promise.all([
        ProxyFunctions2.deployed(),
    ])
    ProxyFunctionsInst = instances[0];

    
    results = await Promise.all([
        SamariInst.setproxyContract(ProxyFunctionsInst.address, {from: accounts[3]})
    ]);   

    
};