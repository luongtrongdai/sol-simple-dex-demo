import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("wallet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployWalletFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, addrTo, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

    const approvers = [addr1, addr2, addr3, addr4, addr5];
    const Wallet = await ethers.getContractFactory("Wallet");
    const wallet = await Wallet.deploy(approvers, 3, { value: 1000 });

    return { wallet, owner, approvers, addrTo };
  }

  describe("Deployment", function () {
    it("Should deploy Wallet with correct approvers and quorum", async function () {
      const { wallet, approvers } = await loadFixture(deployWalletFixture);

      expect(await wallet.quorum()).to.equal(3);
      const listApprover = await wallet.getApprovers();
      expect(listApprover[0]).to.equal(approvers[0].address);
      expect(listApprover[1]).to.equal(approvers[1].address);
      expect(listApprover[2]).to.equal(approvers[2].address);
      expect(listApprover[3]).to.equal(approvers[3].address);
      expect(listApprover[4]).to.equal(approvers[4].address);
    });

    it ("Should receive ethers",async () => {
      const { wallet, approvers } = await loadFixture(deployWalletFixture);
      
      await approvers[0].sendTransaction({
        to: wallet.getAddress(),
        value: 1000 // Sends exactly 1.0 ether
      });
      expect(await ethers.provider.getBalance(wallet.getAddress())).to.eq(2000);
    });
  });

  describe("Transfer", function () {
    it("Should allow approvers create transfer", async function () {
      const { wallet, approvers, addrTo } = await loadFixture(deployWalletFixture);
      
      const transfers = await wallet.getTransfers();
      await wallet.connect(approvers[0]).createTransfer(100, addrTo.address);
      const transfersNew = await wallet.getTransfers();

      expect(transfers.length + 1).to.eq(transfersNew.length);
      const tranfer = transfersNew[transfersNew.length - 1];
      expect(tranfer.id).to.eq(transfersNew.length - 1);
      expect(tranfer.amount).to.eq(100);
      expect(tranfer.to).to.eq(addrTo.address);
      expect(tranfer.approvals).to.eq(0);
      expect(tranfer.sent).to.eq(false);
    });

    it("Should revert if address is not approvers create transfer", async function () {
      const { wallet, addrTo } = await loadFixture(deployWalletFixture);
      
      await expect(wallet.connect(addrTo).createTransfer(100, addrTo.address)).to.be.revertedWith('only approvers allowed');
    });
  });

  describe("approveTransfer", function () {
    it("Should allow approvers approveTransfer", async function () {
      const { wallet, approvers, addrTo } = await loadFixture(deployWalletFixture);
      
      await wallet.connect(approvers[0]).createTransfer(100, addrTo.address);
      let transfer = await wallet.transfers(0);
      expect(transfer.sent).to.eq(false);
      await wallet.connect(approvers[0]).approveTransfer(0);
      transfer = await wallet.transfers(0);
      expect(transfer.approvals).to.eq(1);
      expect(await wallet.getArrovals(approvers[0].address, 0)).to.eq(true);
    });

    it("Should revert if approver approve multiple times",async () => {
      const { wallet, approvers, addrTo } = await loadFixture(deployWalletFixture);
      
      await wallet.connect(approvers[0]).createTransfer(100, addrTo.address);
      let transfer = await wallet.transfers(0);
      expect(transfer.sent).to.eq(false);
      await wallet.connect(approvers[0]).approveTransfer(0);
      await expect(wallet.connect(approvers[0]).approveTransfer(0)).to.be.rejectedWith("can not approve transfer multiple times");
    });

    it ("Should transfer when enough approved",async () => {
      const { wallet, approvers, addrTo } = await loadFixture(deployWalletFixture);
      
      await approvers[0].sendTransaction({
        to: wallet.getAddress(),
        value: 1000 // Sends exactly 1.0 ether
      });
      
      const toBalance = await ethers.provider.getBalance(addrTo.address);

      const contractBalance = await ethers.provider.getBalance(wallet.getAddress());
      await wallet.connect(approvers[0]).createTransfer(100, addrTo.address);
      await wallet.connect(approvers[0]).approveTransfer(0);
      await wallet.connect(approvers[1]).approveTransfer(0);
      await wallet.connect(approvers[2]).approveTransfer(0);
      const transfer = await wallet.transfers(0);
      expect(transfer.approvals).to.eq(3);
      expect(transfer.sent).to.eq(true);
      expect(await ethers.provider.getBalance(addrTo.address)).to.gt(toBalance);
      expect(await ethers.provider.getBalance(wallet.getAddress())).to.lt(contractBalance)
    });

    it ("Should revert for send transfer",async () => {
      const { wallet, approvers, addrTo } = await loadFixture(deployWalletFixture);
      
      await approvers[0].sendTransaction({
        to: wallet.getAddress(),
        value: 1000 // Sends exactly 1.0 ether
      });

      await wallet.connect(approvers[0]).createTransfer(100, addrTo.address);
      await wallet.connect(approvers[0]).approveTransfer(0);
      await wallet.connect(approvers[1]).approveTransfer(0);
      await wallet.connect(approvers[2]).approveTransfer(0);
      await expect(wallet.connect(approvers[3]).approveTransfer(0)).to.be.revertedWith('transfer has already been sent');
    });

    it ("Should revert if contract not enough ether",async () => {
      const { wallet, approvers, addrTo } = await loadFixture(deployWalletFixture);
    
      await wallet.connect(approvers[0]).createTransfer(2000, addrTo.address);
      await expect(wallet.connect(approvers[0]).approveTransfer(0)).to.revertedWith("not enough money");
    });
  });
});
