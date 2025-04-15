require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const providerUrl = process.env.PROVIDER_URL; // e.g., "http://127.0.0.1:8545" or Infura URL
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;

// Set up Hardhat provider and signer
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const signer = new ethers.Wallet(privateKey, provider);

// Load the ABI of the contract
const contractJSON = JSON.parse(
    fs.readFileSync("./artifacts/contracts/FractionalNFTMarketplace.sol/FractionalNFTMarketplace.json")
);
const contractABI = contractJSON.abi; // Ensure this is an array

// Check if the ABI is an array
if (!Array.isArray(contractABI)) {
    console.log(contractABI);
    throw new Error("ABI is not in the correct format!");
}

// Create a contract instance with the signer
const contract = new ethers.Contract(contractAddress, contractABI, signer);

/**
 * List a property on the marketplace.
 * @param {number} totalFractions - Total number of fractions for the property.
 * @param {number} pricePerFraction - Price per fraction in Wei.
 */
async function listProperty(totalFractions, pricePerFraction) {
    try {
        const tx = await contract.listProperty(totalFractions, pricePerFraction);
        console.log("Transaction sent:", tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Property listed, transaction receipt:", receipt);
    } catch (error) {
        console.error("Error listing property:", error);
    }
}

/**
 * Buy fractions of a property.
 * @param {number} tokenId - The ID of the property token.
 * @param {number} fractions - Number of fractions to buy.
 */
async function buyFraction(tokenId, fractions) {
    try {
        const pricePerFraction = await contract.properties(tokenId).then((property) => property.pricePerFraction);
        const totalCost = ethers.BigNumber.from(pricePerFraction).mul(fractions);

        const tx = await contract.buyFraction(tokenId, fractions, { value: totalCost });
        console.log("Transaction sent:", tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Fractions bought, transaction receipt:", receipt);
    } catch (error) {
        console.error("Error buying fraction:", error);
    }
}

/**
 * Sell fractions of a property back to the marketplace.
 * @param {number} tokenId - The ID of the property token.
 * @param {number} fractions - Number of fractions to sell.
 */
async function sellFraction(tokenId, fractions) {
    try {
        const tx = await contract.sellFraction(tokenId, fractions);
        console.log("Transaction sent:", tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Fractions sold, transaction receipt:", receipt);
    } catch (error) {
        console.error("Error selling fraction:", error);
    }
}

/**
 * Get all active property listings from the marketplace.
 */
async function getAllListings() {
    try {
        const listings = await contract.getAllListings();
        console.log("Active listings:", listings);
        return listings;
    } catch (error) {
        console.error("Error fetching listings:", error);
    }
}

module.exports = { listProperty, buyFraction, sellFraction, getAllListings };
