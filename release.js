const { ethers } = require("ethers");
const creds = require('./sheet_secret.json'); 
const Samari = artifacts.require("Samari");
const MultiSend = artifacts.require("MultiSend");

const { GoogleSpreadsheet } = require('google-spreadsheet');
// Initialize the sheet - doc ID is the long id in the sheets URL

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