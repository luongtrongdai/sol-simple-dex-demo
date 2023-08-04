import { ethers } from "hardhat";

async function main() {
  const initAmount = ethers.parseEther("0.001");

  const [deployer, approver1, approver2] = ['0x2adfD59e10B43a04692b7bF222C6897c5E49F7C4', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266','0x70997970C51812dc3A010C7d01b50e0d17dc79C8' ];
  const approvers = [deployer, approver1, approver2];
  const wallet = await ethers.deployContract("Wallet", [approvers, 3], {
    value: initAmount
  });

  await wallet.waitForDeployment();

  console.log(
    `Wallet with ${ethers.formatEther(
      initAmount
    )}ETH deployed to ${wallet.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
