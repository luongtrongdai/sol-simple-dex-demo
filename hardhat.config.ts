import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// import "@nomiclabs/hardhat-etherscan";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname+'/.env' });

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  paths: {
    artifacts: './fe/src/contracts'
  },
  networks: {
    goerli: {
      url: process.env.ALCHEMY_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};

export default config;
