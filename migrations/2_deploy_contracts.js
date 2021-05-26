const Samari = artifacts.require("Samari");
var ProxyFunctions = artifacts.require("ProxyFunctions");
const MultiSend = artifacts.require("MultiSend");

module.exports = async function(deployer) {
    await Promise.all([
        deployer.deploy(Samari)
    ]);
    instances = await Promise.all([
        Samari.deployed()
    ])
    SamariInst = instances[0];
    await Promise.all([
        deployer.deploy(ProxyFunctions, SamariInst.address, "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"),
        deployer.deploy(MultiSend)
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