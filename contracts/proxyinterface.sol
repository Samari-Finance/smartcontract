// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IproxyContract {
    function tokensSend(uint256) external;
    function beforeSend(address, uint256) external;
}