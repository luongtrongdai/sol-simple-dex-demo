//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract MyContract {
    uint public immutable a;

    constructor(uint _a) {
        a = _a;
    }
}