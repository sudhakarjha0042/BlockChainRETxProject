const { ethers } = require("ethers");
const fs = require("fs");

// Setup provider (Hardhat node)
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"); // This is the Hardhat node URL
// WARNING: Never commit private keys directly! Use environment variables or secure methods.
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default Hardhat key

const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Define the initial verification fee (e.g., 0.01 ETH in Wei)
const initialVerificationFee = ethers.utils.parseEther("0.01");

async function main() {
  // Display deployer address
  console.log("Deploying contracts with the account:", signer.address);

  // Load contract ABI and bytecode (after compiling it using Hardhat or Remix)
  const contractJson = JSON.parse(fs.readFileSync("./artifacts/contracts/FractionalNFTMarketplace.sol/FractionalNFTMarketplace.json"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;

  // Create a ContractFactory
  const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);

  // Deploy the contract with the initial verification fee argument
  console.log(`Deploying contract with initial verification fee: ${ethers.utils.formatEther(initialVerificationFee)} ETH`);
  const contract = await contractFactory.deploy(initialVerificationFee); // Pass the fee here
  console.log("Contract deploying...");

  // Wait for the deployment transaction to be mined
  await contract.deployed();

  // Log the deployed contract address
  console.log("Contract deployed to:", contract.address);

  // Save the deployed contract address and ABI in a file for frontend use
  const deploymentInfo = {
    address: contract.address,
    abi: abi, // Include ABI for easier frontend integration
    initialVerificationFee: initialVerificationFee.toString() // Save the fee used
  };
  fs.writeFileSync("./deploymentInfo.json", JSON.stringify(deploymentInfo, null, 2)); // Pretty print JSON

  console.log("Deployed contract info saved to ./deploymentInfo.json");
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
