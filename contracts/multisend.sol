// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/Address.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract MultiSend is Ownable{
    using Address for address;

  function multiSend(address _token, address[] memory addresses, uint256[] memory amount) public onlyOwner() {
    IERC20 token = IERC20(_token);
    require(addresses.length == amount.length, "Amount and address length must be the same!");
    require(addresses.length <= 50, "Maximum 50 transfers pr call are allowed!");
    for(uint i = 0; i < addresses.length; i++) {
      require(token.transferFrom(msg.sender, addresses[i], amount[i]));
    }
  }
}