var Samari = artifacts.require("Samari");
var feeProxy = artifacts.require("feeProxy");
module.exports = async function(deployer) {
    await Promise.all([
        deployer.deploy(Samari),
        // Additional contracts can be deployed here
        deployer.deploy(feeProxy)
    ]);
    instances = await Promise.all([
        Samari.deployed(),
        feeProxy.deployed()
    ])

    SamariInst = instances[0];
    feeProxyInst = instances[1];
    
    results = await Promise.all([
        SamariInst.setOtherFeeContract(feeProxyInst.address)
      ]);
    
};