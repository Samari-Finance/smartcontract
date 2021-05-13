const { ethers } = require("ethers");
const creds = require('./sheet_secret.json'); 

const { GoogleSpreadsheet } = require('google-spreadsheet');
// Initialize the sheet - doc ID is the long id in the sheets URL

module.exports = async function(callback) {
    const doc = new GoogleSpreadsheet('1mw8T4AEIIzvZ2xPbPGsgOEcHsWlvZhAX9nEpHKNbGV4');
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo(); // loads document properties and worksheets
    console.log(doc.title);
    var sheet = doc.sheetsByIndex[0];

    var rows = await sheet.getRows();
    console.log(rows.length);
    var adressarray = [];
    var balancearray = []
    for(i = 0; i < rows.length; i++){
        adressarray.push(rows[i].Address);
        balancearray.push(ethers.utils.parseUnits(rows[i].Balance.replace(/,/g, ""), 'gwei').toString());
    }
    if(adressarray.length != balancearray.length){
        throw error("Adress array and value array had different lengths!");
    }
    console.log("All airdrop data loaded!");

    const SamariIns = await Samari.deployed();
    const MultiSendIns = await MultiSend.deployed();

    console.log("Found Samari contract at :" + SamariIns.Address + " and multisend at :" + MultiSendIns.Address);

    const totaltokens = await SamariIns.totalSupply();
    await SamariIns.approve(MultiSendIns.Address, totaltokens);
    console.log("Multi send contract approved!");
    await SamariIns.pause();
    var aidropcounter = 0;
    console.log("Token paused!");
    while(adressarray.length > 0){
        var tmpaddressarray;
        var tmpbalancearray;
        if(adressarray.length >= 50){
            aidropcounter += 50;
            tmpaddressarray = adressarray.splice(0, 50);
            tmpbalancearray = balancearray.splice(0, 50);
        }
        else{
            aidropcounter += adressarray.length;
            tmpaddressarray = adressarray.splice(0, adressarray.length);
            tmpbalancearray = balancearray.splice(0, adressarray.length);
        }
        await MultiSendIns.multiSend(SamariIns.Address, tmpaddressarray, tmpbalancearray);
        console.log("Airdrop send to " + aidropcounter + "adresses!");
    }
    console.log("All airdrops send!");
    await SamariIns.changeAntiWhaleState(true);
    console.log("Antiwhale system enabled!");
    callback();
}