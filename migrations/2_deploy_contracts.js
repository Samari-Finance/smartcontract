var Samari = artifacts.require("Samari");
var ProxyFunctions = artifacts.require("ProxyFunctions");

module.exports = async function(deployer) {
    await Promise.all([
        deployer.deploy(Samari)
    ]);
    instances = await Promise.all([
        Samari.deployed()
    ])
    SamariInst = instances[0];
    await Promise.all([
        deployer.deploy(ProxyFunctions, SamariInst.address, "0xD99D1c33F9fC3444f8101754aBC46c52416550D1")
    ]);
    instances = await Promise.all([
        ProxyFunctions.deployed(),
    ])
    ProxyFunctionsInst = instances[0];

    
    results = await Promise.all([
        SamariInst.setproxyContract(ProxyFunctionsInst.address),
        SamariInst.changeProxyState(true),
        SamariInst.changeAntiWhaleState(true)
    ]);
    
};