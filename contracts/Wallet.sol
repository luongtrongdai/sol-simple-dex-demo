//SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;


contract Wallet {
    address[] public approvers;
    uint public quorum;

    struct Transfer {
        uint id;
        uint amount;
        address payable to;
        uint approvals;
        bool sent;
    }
    Transfer[] public transfers;
    mapping (address=>mapping (uint=>bool)) public approvals;

    modifier onlyApprover() {
        bool allowed = false;
        for (uint i = 0; i < approvers.length; i++) {
            if (approvers[i] == msg.sender) {
                allowed = true;
                break;
            }
        }
        require(allowed == true, "only approvers allowed");
        _;
    }

    constructor(address[] memory _approvers, uint _quorum) payable {
        approvers = _approvers;
        quorum = _quorum; 
    }

    function getApprovers() external view returns (address[] memory) {
        return approvers;
    }

    function getTransfers() external view returns (Transfer[] memory) {
        return transfers;
    }

    function getArrovals(address appr, uint idx) external view returns (bool) {
        return approvals[appr][idx];
    }

    function createTransfer(uint _amount, address payable _to) external onlyApprover() {
        transfers.push(Transfer(transfers.length, _amount, _to, 0, false));
    }

    function approveTransfer(uint id) external onlyApprover() {
        require(transfers[id].sent == false, "transfer has already been sent");
        require(approvals[msg.sender][id] == false, "can not approve transfer multiple times");
        uint amount = transfers[id].amount;
        require(address(this).balance >= amount, "not enough money");
        approvals[msg.sender][id] = true;
        transfers[id].approvals++;

        if (transfers[id].approvals >= quorum) {
            transfers[id].sent = true;
            address payable to = transfers[id].to;
            to.transfer(amount);
        }
    }

    receive() external payable {}
}