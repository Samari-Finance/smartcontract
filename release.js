const { ethers } = require("ethers");
const Samari = artifacts.require("Samari");

module.exports = async function(callback) {
    try {
        let SamariIns = await Samari.deployed();
        await SamariIns.changeProxyState(true);
        await SamariIns.changeAntiWhaleState(true);
        await SamariIns.unpause();
        return;
    } catch (error) {
        console.log(error);
        return;
    }
}