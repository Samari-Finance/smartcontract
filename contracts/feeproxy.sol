// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;



import "../node_modules/@openzeppelin/contracts/access/AccessControl.sol";
import "uniswapinterface.sol"

interface otherFeeReciever {
    function tokensSend() external;
}

contract feeProxy is Context, AccessControl, otherFeeReciever  {
    
        uint256 public _liquidityFee = 50;
        uint256 public _donationFee = 20;
        uint256 public _marketingFee = 20;
        uint256 public _otherFee = 10;

        event TokensRecieved();
        constructor () {
        }
        
        /**
        * @dev Contract needs to receive/hold BNB.
        */
        receive() external payable {}
        
        function tokensSend() external override {
            emit TokensRecieved();
        }

        function send(address payable reciever, uint256 amount) public {
            require(amount > 0, "You need to send more than 0!");
            require(address(this).balance <= amount, "There isnt enough BNB in this contract!");
            reciever.transfer(amount);
        }
        
        function sendMax(address payable reciever) public {
            require(address(this).balance > 0, "There is no BNB in this contract!");
            reciever.transfer(address(this).balance);
        }
        
}