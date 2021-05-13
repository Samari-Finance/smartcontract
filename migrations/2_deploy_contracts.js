var Samari = artifacts.require("Samari");
var ProxyFunctions = artifacts.require("ProxyFunctions");
var MultiSend = artifacts.require("MultiSend");

module.exports = async function(deployer) {
    await Promise.all([
        deployer.deploy(Samari)
    ]);
    instances = await Promise.all([
        Samari.deployed()
    ])
    SamariInst = instances[0];
    await Promise.all([
        deployer.deploy(ProxyFunctions, SamariInst.address, "0x10ED43C718714eb63d5aA57B78B54704E256024E")
    ]);
    instances = await Promise.all([
        ProxyFunctions.deployed(),
        MultiSend.deployed()
    ])
    ProxyFunctionsInst = instances[0];

    
    results = await Promise.all([
        SamariInst.setproxyContract(ProxyFunctionsInst.address)
    ]);   

    
};