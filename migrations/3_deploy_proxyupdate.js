const Samari = artifacts.require("Samari");
const ProxyFunctions2 = artifacts.require("ProxyFunctionsV2");
const ProxyFunctions = artifacts.require("ProxyFunctions");

module.exports = async function(deployer) {
    instances = await Promise.all([
        Samari.deployed(),
        ProxyFunctions.deployed()
    ])
    SamariInst = instances[0];
    OldProxyInst = instances[1];
    routeraddress = await OldProxyInst.uniswapV2Router();
    console.log("Router address: " + routeraddress);
    pairaddress = await OldProxyInst.uniswapV2Pair();
    console.log("Pair address: " + pairaddress);
    await Promise.all([
        deployer.deploy(ProxyFunctions2, SamariInst.address, routeraddress, pairaddress),
    ]);
    instances = await Promise.all([
        ProxyFunctions2.deployed(),
    ])
    ProxyFunctionsInst = instances[0];

    
    results = await Promise.all([
        SamariInst.setproxyContract(ProxyFunctionsInst.address)
    ]);   

    
};