#!/bin/sh
sudo npm install @openzeppelin/contracts
sudo npm install -g truffle
sudo npm uninstall @truffle/hdwallet-provider
sudo npm install @truffle/hdwallet-provider@1.2.3
sudo npm install -D truffle-plugin-verify
sudo npm install ethers
sudo npm install google-spreadsheet