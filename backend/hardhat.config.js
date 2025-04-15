require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545", // Local Hardhat network
    },
  },
};

// npx hardhat run scripts/deploy.js --network localhost
// npx hardhat node
