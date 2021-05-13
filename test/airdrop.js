const { ethers } = require("ethers");
const creds = require('../sheet_secret.json'); 
var Samari = artifacts.require("Samari");
var ProxyFunctions = artifacts.require("ProxyFunctions");
var MultiSend = artifacts.require("MultiSend");

const { GoogleSpreadsheet } = require('google-spreadsheet');
// Initialize the sheet - doc ID is the long id in the sheets URL
const doc = new GoogleSpreadsheet('1mw8T4AEIIzvZ2xPbPGsgOEcHsWlvZhAX9nEpHKNbGV4');

async function loadData() {
    await doc.useServiceAccountAuth(creds);

    await doc.loadInfo(); // loads document properties and worksheets
    console.log(doc.title);
    sheet = doc.sheetsByIndex[0];

    rows = await sheet.getRows();
    console.log(rows.length);
    adressarray = [];
    valuearray = []
    for(i = 0; i < rows.length; i++){
        adressarray.push(rows[i].Address);
        adressarray.push(ethers.utils.parseUnits(rows[i].Balance.replace(/,/g, ""), 'gwei').toString());
    }
    if(adressarray.length != valuearray.length){
        throw error("Adress array and value array had different lengths!");
    }
    console.log("All airdrop data lodad!");
    return adressarray, valuearray;
}

async function sendAirdrop(adressarray,balncearray){
    let SamariIns = await Samari.deployed();
    let ProxyIns = await ProxyFunctions.deployed();
    let MultiSendIns = await MultiSend.deployed();
    var totaltokens = await SamariIns.totalSupply();
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
            tmpbalancearray = balncearray.splice(0, 50);
        }
        else{
            aidropcounter += adressarray.length;
            tmpaddressarray = adressarray.splice(0, adressarray.length);
            tmpbalancearray = balncearray.splice(0, adressarray.length);
        }
        await MultiSendIns.multiSend(SamariIns.Address, tmpaddressarray, tmpbalancearray);
        console.log("Airdrop send to " + aidropcounter + "adresses!");
    }
    console.log("All airdrops send!");
    await SamariIns.changeAntiWhaleState(true);
    console.log("Antiwhale system enabled!");
}

let {adresses, balances} = loadData();

sendAirdrop(adresses, balances);