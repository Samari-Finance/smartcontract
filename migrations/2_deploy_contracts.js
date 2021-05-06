var Samari = artifacts.require("Samari");
var feeProxy = artifacts.require("feeProxy");
var UniswapExample = artifacts.require("UniswapExample");
module.exports = async function(deployer) {
    await Promise.all([
        deployer.deploy(Samari)
    ]);
    instances = await Promise.all([
        Samari.deployed()
    ])
    SamariInst = instances[0];
    await Promise.all([
        deployer.deploy(feeProxy, SamariInst.address),
        deployer.deploy(UniswapExample, SamariInst.address)
    ]);
    instances = await Promise.all([
        feeProxy.deployed()
    ])
    feeProxyInst = instances[0];

    
    results = await Promise.all([
        SamariInst.setOtherFeeContract(feeProxyInst.address, "0xD99D1c33F9fC3444f8101754aBC46c52416550D1")
    ]);
    
};