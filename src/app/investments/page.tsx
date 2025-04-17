"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const COMPATIBLE_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function properties(uint256) external view returns (uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)",
  "function totalSupply() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function submitPropertyForVerification(uint256 _totalFractions, uint256 _pricePerFraction) external payable",
  "function verifyProperty(uint256 tokenId, bool approve) external",
  "function nextTokenId() external view returns (uint256)",
  "function getAllListings() external view returns (tuple(uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)[] memory)",
  "function listFractionsForSale(uint256 _tokenId, uint256 _fractions, uint256 _pricePerFraction) external",
  "function getPropertyResaleOfferings(uint256 _tokenId) external view returns (tuple(address seller, uint256 fractions, uint256 pricePerFraction)[] memory)",
  "function cancelResaleListing(uint256 _tokenId) external"
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const VERIFICATION_FEE = "10000000000000000";

const SAMPLE_INVESTMENTS = [
  {
    id: "1",
    totalFractions: 1000,
    pricePerFraction: 0.5,
    ownedFractions: 5,
    percentageOwned: 0.5,
    status: "Verified",
    location: "Downtown Property #1",
    description: "You own 5 of 1000 fractions",
  },
  {
    id: "2",
    totalFractions: 1000,
    pricePerFraction: 0.75,
    ownedFractions: 10,
    percentageOwned: 1,
    status: "Verified",
    location: "Suburb Property #2",
    description: "You own 10 of 1000 fractions",
  }
];

interface OwnedProperty {
  id: string;
  totalFractions: number;
  pricePerFraction: number;
  ownedFractions: number;
  percentageOwned: number;
  status: string;
  location?: string;
  description?: string;
  originalPurchasePrice?: number;
  resaleHistory?: {
    date: string;
    price: number;
    quantity: number;
  }[];
}

export default function InvestmentsPage() {
  const [walletAddress, setWalletAddress] = React.useState("");
  const [ownedProperties, setOwnedProperties] = React.useState<OwnedProperty[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [newPropertyData, setNewPropertyData] = React.useState({
    totalFractions: 100,
    pricePerFraction: 0.01,
    description: "",
    location: "",
  });
  const [selectedProperty, setSelectedProperty] = React.useState<OwnedProperty | null>(null);
  const [fractionsToSell, setFractionsToSell] = React.useState(0);
  const [newPrice, setNewPrice] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [manualPropertyId, setManualPropertyId] = React.useState("");
  const [isCheckingProperty, setIsCheckingProperty] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"details" | "resell" | null>(null);
  const [resaleHistory, setResaleHistory] = React.useState<any[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        toast({
          title: "Error",
          description: "MetaMask is not installed. Please install it from metamask.io",
          variant: "destructive",
        });
        return;
      }

      let address;
      let provider;

      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        address = await signer.getAddress();
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        address = await signer.getAddress();
      }

      console.log("Wallet connected:", address);
      setWalletAddress(address);
      
      await fetchOwnedProperties(address, provider);
      
    } catch (err) {
      console.error(err);
      toast({
        title: "Wallet Connection Failed",
        description: err instanceof Error ? err.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const fetchOwnedProperties = async (address: string, provider: any) => {
    setIsLoading(true);
    try {
      console.log("Fetching owned properties for address:", address);
      console.log("Using contract address:", CONTRACT_ADDRESS);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, COMPATIBLE_ABI, provider);
      
      let userPropertiesMap = new Map<string, OwnedProperty>();
      
      let allListings: any[] = [];
      try {
        console.log("Fetching all listings from contract...");
        allListings = await contract.getAllListings();
        console.log(`Found ${allListings.length} listings.`);
      } catch (err) {
        console.warn("Could not fetch all listings, falling back to totalSupply:", err);
        try {
          const totalSupply = await contract.totalSupply();
          console.log(`Total supply: ${totalSupply}. Iterating through potential token IDs.`);
          for (let i = 1; i <= Number(totalSupply); i++) {
            try {
              const property = await contract.properties(i);
              allListings.push({
                tokenId: property.tokenId,
                owner: property.owner,
                totalFractions: property.totalFractions,
                pricePerFraction: property.pricePerFraction,
                availableFractions: property.availableFractions,
                status: property.status
              });
            } catch (innerErr) {}
          }
        } catch (supplyErr) {
           console.error("Failed to get totalSupply, cannot fetch properties.", supplyErr);
           throw new Error("Failed to retrieve property list from contract.");
        }
      }

      console.log("Processing properties to check ownership...");
      for (const listing of allListings) {
        const tokenId = Number(listing.tokenId);
        const tokenIdStr = tokenId.toString();
        const propertyOwner = listing.owner;
        const totalFractions = Number(listing.totalFractions);
        const status = Number(listing.status);

        const storageKey = `fraction_ownership_${address.toLowerCase()}_${tokenIdStr}`;
        const storedOwnership = localStorage.getItem(storageKey);
        let ownedFractions = storedOwnership ? parseInt(storedOwnership) : 0;

        if (ownedFractions === 0 && propertyOwner.toLowerCase() === address.toLowerCase()) {
           const contractAvailable = Number(listing.availableFractions);
           if (contractAvailable > 0) {
               console.log(`User is primary owner of #${tokenIdStr}, contract shows ${contractAvailable} available fractions. Using this as owned count.`);
               ownedFractions = contractAvailable;
           }
        }

        if (ownedFractions > 0 && totalFractions > 0) {
          console.log(`Found ownership for property #${tokenIdStr}: ${ownedFractions} fractions (Source: ${storedOwnership ? 'localStorage' : 'primary owner check'})`);

          let pricePerFraction;
          try {
            if (typeof ethers.formatEther === "function") {
              pricePerFraction = Number(ethers.formatEther(listing.pricePerFraction));
            } else {
              pricePerFraction = Number(ethers.utils.formatEther(listing.pricePerFraction));
            }
          } catch (formatError) {
             console.error(`Error formatting price for token ${tokenIdStr}:`, formatError);
             pricePerFraction = 0;
          }

          const percentageOwned = (ownedFractions / totalFractions) * 100;
          const propertyStatus = ["Pending", "Verified", "Rejected"][status] || "Unknown";

          userPropertiesMap.set(tokenIdStr, {
            id: tokenIdStr,
            totalFractions: totalFractions,
            pricePerFraction: pricePerFraction,
            ownedFractions: ownedFractions,
            percentageOwned: percentageOwned,
            status: propertyStatus,
            location: `Property #${tokenIdStr}`,
            description: `You own ${ownedFractions} of ${totalFractions} fractions`,
          });
        }
      }
      
      const userProperties = Array.from(userPropertiesMap.values());

      if (userProperties.length > 0) {
        console.log("Final properties found:", userProperties);
        setOwnedProperties(userProperties);
        toast({
          title: "Properties Found",
          description: `Found ${userProperties.length} properties in your portfolio`,
          variant: "success",
        });
      } else {
        console.log("No properties found for this address after checking listings and localStorage.");
        setOwnedProperties([]);
        toast({
          title: "No Properties Found",
          description: "No properties found automatically. If you recently purchased, try refreshing. You can also use 'Lookup Property'.",
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Error fetching owned properties:", error);
      setOwnedProperties([]);
      toast({
        title: "Error",
        description: "Failed to fetch your properties. Try the manual lookup option below.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const checkPropertyById = async () => {
    if (!walletAddress || !manualPropertyId) {
      toast({
        title: "Error",
        description: "Please connect your wallet and enter a property ID",
        variant: "destructive",
      });
      return;
    }
    
    setIsCheckingProperty(true);
    
    try {
      const propertyId = parseInt(manualPropertyId);
      if (isNaN(propertyId) || propertyId <= 0) {
        throw new Error("Please enter a valid property ID (positive number)");
      }
      
      let provider;
      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, COMPATIBLE_ABI, provider);
      
      const property = await contract.properties(propertyId);
      console.log(`Property #${propertyId} details:`, property);
      const propertyOwner = property.owner;
      const totalFractions = Number(property.totalFractions);
      const status = Number(property.status);

      const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${propertyId}`;
      const storedOwnership = localStorage.getItem(storageKey);
      let ownedFractions = storedOwnership ? parseInt(storedOwnership) : 0;

      if (ownedFractions === 0 && propertyOwner.toLowerCase() === walletAddress.toLowerCase()) {
          const contractAvailable = Number(property.availableFractions);
          if (contractAvailable > 0) {
              console.log(`User is primary owner of #${propertyId}, contract shows ${contractAvailable} available fractions.`);
              ownedFractions = contractAvailable;
          }
      }

      if (ownedFractions === 0) {
        const userInput = prompt(`We couldn't automatically detect your ownership for Property #${propertyId}. If you own fractions, please enter the quantity:`);
        if (userInput && !isNaN(parseInt(userInput)) && parseInt(userInput) > 0) {
          ownedFractions = parseInt(userInput);
          localStorage.setItem(storageKey, ownedFractions.toString());
          console.log(`User manually entered ${ownedFractions} fractions for #${propertyId}. Saved to localStorage.`);
        }
      }
      
      if (ownedFractions > 0 && totalFractions > 0) {
        let pricePerFraction;
        if (typeof ethers.formatEther === "function") {
          pricePerFraction = Number(ethers.formatEther(property.pricePerFraction));
        } else {
          pricePerFraction = Number(ethers.utils.formatEther(property.pricePerFraction));
        }
        
        const percentageOwned = (ownedFractions / totalFractions) * 100;
        const propertyStatus = ["Pending", "Verified", "Rejected"][status] || "Unknown";
        
        const newPropertyData = {
          id: propertyId.toString(),
          totalFractions: totalFractions,
          pricePerFraction: pricePerFraction,
          ownedFractions: ownedFractions,
          percentageOwned: percentageOwned,
          status: propertyStatus,
          location: `Property #${propertyId}`,
          description: `You own ${ownedFractions} of ${totalFractions} fractions`,
        };
        
        setOwnedProperties(prev => {
            const existingIndex = prev.findIndex(p => p.id === propertyId.toString());
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = newPropertyData;
                return updated;
            } else {
                return [...prev, newPropertyData];
            }
        });

        toast({
          title: "Property Updated",
          description: `Property #${propertyId} updated/added to your portfolio with ${ownedFractions} fractions`,
          variant: "success",
        });

      } else {
        toast({
          title: "No Ownership Found",
          description: `Could not confirm ownership for Property #${propertyId} via contract or local storage.`,
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Error checking property:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check property",
        variant: "destructive",
      });
    } finally {
      setIsCheckingProperty(false);
      setManualPropertyId("");
    }
  };

  const refreshProperties = async () => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsRefreshing(true);
    toast({
      title: "Refreshing",
      description: "Checking blockchain for your properties...",
    });
    
    try {
      let provider;
      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }
      
      await fetchOwnedProperties(walletAddress, provider);
    } catch (error) {
      console.error("Error refreshing properties:", error);
      setIsRefreshing(false);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh properties. Try connecting your wallet again.",
        variant: "destructive",
      });
    }
  };

  const loadSampleInvestments = () => {
    setOwnedProperties(SAMPLE_INVESTMENTS);
    toast({
      title: "Sample Data Loaded",
      description: "Loaded sample investment data for testing",
    });
  };

  const goToMarketplace = () => {
    router.push("/marketplace");
  };

  const submitNewProperty = async () => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // Validate property data before submission
    if (!newPropertyData.totalFractions || newPropertyData.totalFractions < 10) {
      toast({
        title: "Invalid Data",
        description: "Number of fractions must be at least 10",
        variant: "destructive",
      });
      return;
    }

    if (!newPropertyData.pricePerFraction || newPropertyData.pricePerFraction <= 0) {
      toast({
        title: "Invalid Data",
        description: "Price per fraction must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Transaction state tracking
    let txHash = '';
    let newTokenId = '';
    
    try {
      // Get provider and signer
      let provider;
      let signer;
      
      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }
      
      // Attempt to get full ABI with fallback
      let contractABI = COMPATIBLE_ABI;
      try {
        const response = await fetch('/api/contract-abi');
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        if (data && data.abi) {
          contractABI = data.abi;
          console.log("Using full ABI from API");
        } else {
          console.warn("API response did not contain valid ABI");
        }
      } catch (error) {
        console.warn("Could not fetch ABI from API, using compatible ABI:", error);
      }
      
      // Create contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      // First check if contract has the required function
      if (!contract.interface.getFunction("submitPropertyForVerification")) {
        throw new Error("Contract does not support property submission function");
      }
      
      // Format price to wei
      let priceInWei;
      try {
        if (typeof ethers.parseEther === "function") {
          priceInWei = ethers.parseEther(newPropertyData.pricePerFraction.toString());
        } else {
          priceInWei = ethers.utils.parseEther(newPropertyData.pricePerFraction.toString());
        }
      } catch (error) {
        console.error("Error parsing price to wei:", error);
        throw new Error(`Could not convert price to wei: ${error.message || 'Unknown error'}`);
      }
      
      // Try to get the verification fee from contract if available
      let verificationFee = VERIFICATION_FEE;
      try {
        if (contract.interface.getFunction("getVerificationFee")) {
          verificationFee = await contract.getVerificationFee();
          console.log("Got verification fee from contract:", verificationFee.toString());
        }
      } catch (error) {
        console.warn("Could not get verification fee from contract, using default:", error);
      }
      
      // Display confirmation toast before sending transaction
      toast({
        title: "Submitting Property",
        description: "Please confirm the transaction in your wallet...",
      });
      
      // Send transaction
      console.log("Submitting property with params:", {
        totalFractions: newPropertyData.totalFractions,
        pricePerFraction: priceInWei.toString(),
        verificationFee
      });
      
      const tx = await contract.submitPropertyForVerification(
        newPropertyData.totalFractions,
        priceInWei,
        { value: verificationFee }
      );
      
      txHash = tx.hash;
      console.log("Transaction submitted:", txHash);
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${txHash}`,
      });
      
      // Wait for transaction receipt
      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);
      
      // Attempt to extract token ID from transaction logs
      newTokenId = await extractTokenIdFromReceipt(receipt, contract);
      
      if (!newTokenId || newTokenId === "unknown") {
        // Fallback methods if we couldn't extract from receipt logs
        newTokenId = await getLatestTokenId(contract, provider);
      }
      
      // Create a record in localStorage
      if (newTokenId && newTokenId !== "unknown") {
        const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${newTokenId}`;
        localStorage.setItem(storageKey, newPropertyData.totalFractions.toString());
        console.log(`Recorded ownership of ${newPropertyData.totalFractions} fractions of property #${newTokenId} in localStorage`);
      }
      
      toast({
        title: "Property Submitted Successfully",
        description: `Your property has been submitted${newTokenId && newTokenId !== "unknown" ? ` with ID ${newTokenId}` : ''}. It may take a moment to appear in your portfolio.`,
        variant: "success",
      });
      
      // Auto-verify for development/testing environments
      if (process.env.NODE_ENV !== 'production' && newTokenId && newTokenId !== "unknown") {
        try {
          await autoVerifyProperty(contract, newTokenId);
        } catch (error) {
          console.error("Auto-verification failed:", error);
          toast({
            title: "Auto-Verification Failed",
            description: "Your property was submitted, but auto-verification failed. The property owner will need to verify it.",
            variant: "warning",
          });
        }
      }
      
      // Add the new property to state
      const newProperty: OwnedProperty = {
        id: newTokenId || Date.now().toString(),
        totalFractions: newPropertyData.totalFractions,
        pricePerFraction: newPropertyData.pricePerFraction,
        ownedFractions: newPropertyData.totalFractions,
        percentageOwned: 100,
        status: newTokenId && newTokenId !== "unknown" && process.env.NODE_ENV !== 'production' ? "Verified" : "Pending",
        location: newPropertyData.location || `Property #${newTokenId || 'New'}`,
        description: newPropertyData.description || `You own all fractions of this property`,
      };
      
      setOwnedProperties(prev => [...prev, newProperty]);
      
      // Reset form
      setNewPropertyData({
        totalFractions: 100,
        pricePerFraction: 0.01,
        description: "",
        location: "",
      });
      
      // Refresh properties after a short delay to ensure contract state is updated
      setTimeout(() => {
        refreshProperties();
      }, 5000);
      
    } catch (error: any) {
      console.error("Error submitting property:", error);
      
      // More detailed error messages based on error type
      let errorMessage = "Failed to submit property";
      
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message && error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (error.message && error.message.includes("user rejected transaction")) {
        errorMessage = "Transaction cancelled";
      } else if (error.message) {
        // Truncate long error messages
        errorMessage = error.message.length > 100 
          ? error.message.substring(0, 100) + "..." 
          : error.message;
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const autoVerifyProperty = async (contract: any, tokenId: string) => {
    try {
      toast({
        title: "Auto-Verifying",
        description: "Automatically verifying property for testing...",
      });
      
      const tx = await contract.verifyProperty(tokenId, true);
      const receipt = await tx.wait();
      
      toast({
        title: "Property Verified",
        description: `Property #${tokenId} has been automatically verified and is now available in the marketplace`,
        variant: "success",
      });
      
      return true;
    } catch (error: any) {
      console.error("Error auto-verifying property:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to automatically verify property",
        variant: "destructive",
      });
      return false;
    }
  };

    // Helper function to extract token ID from transaction receipt
    const extractTokenIdFromReceipt = async (receipt: any, contract: any): Promise<string> => {
      if (!receipt || !receipt.logs) return "unknown";
      
      try {
        // Look for PropertySubmitted or Transfer events
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            if (!parsedLog) continue;
            
            if (parsedLog.name === "PropertySubmitted" && parsedLog.args.tokenId) {
              return parsedLog.args.tokenId.toString();
            }
            
            if (parsedLog.name === "Transfer" && parsedLog.args.tokenId) {
              return parsedLog.args.tokenId.toString();
            }
          } catch (e) {
            continue; // Skip logs that can't be parsed
          }
        }
        
        // If we've reached here, no matching event was found
        console.warn("Could not find tokenId in transaction logs");
        return "unknown";
      } catch (error) {
        console.error("Error extracting token ID from receipt:", error);
        return "unknown";
      }
    };
    
    // Helper function to get the latest token ID
    const getLatestTokenId = async (contract: any, provider: any): Promise<string> => {
      try {
        console.log("Trying alternative methods to determine token ID");
        
        // Method 1: Try nextTokenId if available
        try {
          const nextToken = await contract.nextTokenId();
          const tokenId = (Number(nextToken) - 1).toString();
          console.log("Estimated tokenId from nextTokenId:", tokenId);
          return tokenId;
        } catch (error) {
          console.warn("Failed to get nextTokenId:", error);
        }
        
        // Method 2: Try totalSupply
        try {
          const totalSupply = await contract.totalSupply();
          const tokenId = totalSupply.toString();
          console.log("Estimated tokenId from totalSupply:", tokenId);
          return tokenId;
        } catch (error) {
          console.warn("Failed to get totalSupply:", error);
        }
        
        // Method 3: Check recent events (last block)
        try {
          const blockNumber = await provider.getBlockNumber();
          const events = await contract.queryFilter("Transfer", blockNumber - 10, blockNumber);
          
          if (events && events.length > 0) {
            // Get the most recent Transfer event
            const latestEvent = events[events.length - 1];
            const tokenId = latestEvent.args.tokenId.toString();
            console.log("Found tokenId from recent events:", tokenId);
            return tokenId;
          }
        } catch (error) {
          console.warn("Failed to check recent events:", error);
        }
        
        // Fallback: Use timestamp as an identifier
        return Date.now().toString();
        
      } catch (error) {
        console.error("All methods to determine token ID failed:", error);
        return "unknown";
      }
    };

  const simulateListingInLocalStorage = () => {
    if (!selectedProperty || !walletAddress) return;
    
    const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${selectedProperty.id}`;
    const newOwnership = selectedProperty.ownedFractions - fractionsToSell;
    localStorage.setItem(storageKey, newOwnership.toString());
    
    const resaleKey = `resale_listing_${selectedProperty.id}`;
    const existingResales = JSON.parse(localStorage.getItem(resaleKey) || '[]');
    
    const newResaleListing = {
      seller: walletAddress,
      fractions: fractionsToSell,
      pricePerFraction: newPrice,
      listedDate: new Date().toISOString()
    };
    
    existingResales.push(newResaleListing);
    localStorage.setItem(resaleKey, JSON.stringify(existingResales));
    
    const updatedProperties = ownedProperties.map(prop => {
      if (prop.id === selectedProperty.id) {
        return {
          ...prop,
          ownedFractions: prop.ownedFractions - fractionsToSell,
          percentageOwned: ((prop.ownedFractions - fractionsToSell) / prop.totalFractions) * 100
        };
      }
      return prop;
    });
    
    setOwnedProperties(updatedProperties);
    
    setSelectedProperty(null);
    setFractionsToSell(0);
    setNewPrice(0);
    
    toast({
      title: "Fractions Listed",
      description: `Successfully listed ${fractionsToSell} fractions of Property #${selectedProperty.id} for sale at ${newPrice} ETH each.`,
      variant: "success",
    });
  };

  const fetchResaleHistory = async (propertyId: string) => {
    const resaleKey = `resale_listing_${propertyId}`;
    const localHistory = JSON.parse(localStorage.getItem(resaleKey) || '[]');
    
    try {
      if (window.ethereum) {
        let provider;
        if (typeof ethers.BrowserProvider === "function") {
          provider = new ethers.BrowserProvider(window.ethereum);
        } else {
          provider = new ethers.providers.Web3Provider(window.ethereum);
        }
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, [
          ...COMPATIBLE_ABI,
          "function getResaleHistory(uint256 _tokenId) external view returns (tuple(address seller, uint256 fractions, uint256 pricePerFraction, uint256 timestamp)[] memory)"
        ], provider);
        
        try {
          const history = await contract.getResaleHistory(propertyId);
          if (history && history.length > 0) {
            return history.map((item: any) => ({
              seller: item.seller,
              fractions: Number(item.fractions),
              pricePerFraction: typeof ethers.formatEther === "function" 
                ? Number(ethers.formatEther(item.pricePerFraction)) 
                : Number(ethers.utils.formatEther(item.pricePerFraction)),
              date: new Date(Number(item.timestamp) * 1000).toLocaleDateString()
            }));
          }
        } catch (error) {
          console.log("Contract doesn't support getResaleHistory, using localStorage");
        }
      }
    } catch (error) {
      console.error("Error fetching resale history:", error);
    }
    
    return localHistory.map((item: any) => ({
      seller: item.seller,
      fractions: Number(item.fractions),
      pricePerFraction: Number(item.pricePerFraction),
      date: new Date(item.listedDate).toLocaleDateString()
    }));
  };

  const cancelResaleListing = async () => {
    if (!selectedProperty || !walletAddress) return;
    
    setIsLoading(true);
    try {
      let provider;
      let signer;
      
      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }
      
      const expandedABI = [
        ...COMPATIBLE_ABI, 
        "function cancelResaleListing(uint256 _tokenId) external"
      ];
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, expandedABI, signer);
      
      try {
        const tx = await contract.cancelResaleListing(selectedProperty.id);
        await tx.wait();
        
        toast({
          title: "Listing Cancelled",
          description: `Your resale listing for Property #${selectedProperty.id} has been cancelled.`,
          variant: "success",
        });
      } catch (error) {
        console.warn("Contract doesn't support cancelResaleListing, using localStorage");
        
        const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${selectedProperty.id}`;
        const currentOwnership = parseInt(localStorage.getItem(storageKey) || "0");
        const resaleKey = `resale_listing_${selectedProperty.id}`;
        
        const resaleListings = JSON.parse(localStorage.getItem(resaleKey) || "[]");
        const userListings = resaleListings.filter((listing: any) => 
          listing.seller.toLowerCase() === walletAddress.toLowerCase()
        );
        
        const totalFractionsToReturn = userListings.reduce((total: number, listing: any) => 
          total + Number(listing.fractions), 0
        );
        
        localStorage.setItem(storageKey, (currentOwnership + totalFractionsToReturn).toString());
        
        const updatedListings = resaleListings.filter((listing: any) => 
          listing.seller.toLowerCase() !== walletAddress.toLowerCase()
        );
        localStorage.setItem(resaleKey, JSON.stringify(updatedListings));
        
        toast({
          title: "Listing Cancelled",
          description: `Your resale listing for Property #${selectedProperty.id} has been cancelled (simulated).`,
          variant: "success",
        });
      }
      
      refreshProperties();
      
    } catch (error) {
      console.error("Error cancelling resale listing:", error);
      toast({
        title: "Error",
        description: "Failed to cancel resale listing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedProperty(null);
    }
  };

  const listFractionsForSale = async () => {
    if (!selectedProperty || !walletAddress) return;
    
    setIsLoading(true);
    try {
      let provider;
      let signer;
      
      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }
      
      const expandedABI = [
        ...COMPATIBLE_ABI,
        "function listFractionsForSale(uint256 _tokenId, uint256 _fractions, uint256 _pricePerFraction) external"
      ];
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, expandedABI, signer);
      
      let priceInWei;
      if (typeof ethers.parseEther === "function") {
        priceInWei = ethers.parseEther(newPrice.toString());
      } else {
        priceInWei = ethers.utils.parseEther(newPrice.toString());
      }
      
      toast({
        title: "Listing Fractions",
        description: "Please confirm the transaction in your wallet...",
      });
      
      const tx = await contract.listFractionsForSale(
        selectedProperty.id, 
        fractionsToSell,
        priceInWei
      );
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash}`,
      });
      
      const receipt = await tx.wait();
      
      const updatedProperties = ownedProperties.map(prop => {
        if (prop.id === selectedProperty.id) {
          return {
            ...prop,
            ownedFractions: prop.ownedFractions - fractionsToSell,
            percentageOwned: ((prop.ownedFractions - fractionsToSell) / prop.totalFractions) * 100
          };
        }
        return prop;
      });
      
      setOwnedProperties(updatedProperties);
      
      const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${selectedProperty.id}`;
      const newOwnership = selectedProperty.ownedFractions - fractionsToSell;
      localStorage.setItem(storageKey, newOwnership.toString());
      
      setSelectedProperty(null);
      setFractionsToSell(0);
      setNewPrice(0);
      
      toast({
        title: "Fractions Listed",
        description: `Successfully listed ${fractionsToSell} fractions of Property #${selectedProperty.id} for sale at ${newPrice} ETH each.`,
        variant: "success",
      });
      
    } catch (error: any) {
      console.error("Error listing fractions for sale:", error);
      
      if (error.message && error.message.includes("unrecognized-selector")) {
        toast({
          title: "Contract Limitation",
          description: "Your contract doesn't support the listFractionsForSale function. Using fallback method.",
          variant: "warning",
        });
        
        simulateListingInLocalStorage();
      } else {
        toast({
          title: "Listing Failed",
          description: error.message || "Failed to list fractions for sale",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Investments</h1>
          <div className="flex gap-3">
            <Button onClick={goToMarketplace} variant="outline">Go to Marketplace</Button>
            {!walletAddress ? (
              <Button onClick={connectWallet}>Connect Wallet</Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={refreshProperties} 
                  variant="outline" 
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    "Refresh Properties"
                  )}
                </Button>
                <Button variant="outline" className="text-xs">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center my-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your investments...</p>
          </div>
        ) : walletAddress ? (
          <>
            {process.env.NODE_ENV !== 'production' && (
              <div className="mb-4 flex gap-2">
                <Button onClick={loadSampleInvestments} variant="outline">
                  Load Sample Investments
                </Button>
                <Button 
                  onClick={() => {
                    console.log("Current state:", {
                      walletAddress,
                      ownedProperties,
                      CONTRACT_ADDRESS,
                      COMPATIBLE_ABI
                    });
                    toast({
                      title: "Debug Info Logged",
                      description: "Check browser console for detailed state information",
                    });
                  }} 
                  variant="outline"
                >
                  Log Debug Info
                </Button>
              </div>
            )}

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Property Lookup</CardTitle>
                <CardDescription>
                  Manually check a property you own by ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter property ID (e.g. 3)"
                    value={manualPropertyId}
                    onChange={(e) => setManualPropertyId(e.target.value)}
                  />
                  <Button 
                    onClick={checkPropertyById}
                    disabled={isCheckingProperty || !manualPropertyId}
                  >
                    {isCheckingProperty ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking
                      </>
                    ) : (
                      "Check Property"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  If you know you own fractions of a property, enter its ID above to add it to your portfolio
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardHeader>
                  <CardTitle>Your Properties</CardTitle>
                  <CardDescription>
                    Properties you own fully or partially
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ownedProperties.length > 0 ? (
                    <div className="space-y-4">
                      {ownedProperties.map((property) => (
                        <div 
                          key={property.id}
                          className="p-4 border rounded-lg cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            setSelectedProperty(property);
                            fetchResaleHistory(property.id).then(history => {
                              setResaleHistory(history);
                            });
                          }}
                        >
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium">{property.location || `Property #${property.id}`}</h3>
                              <p className="text-sm text-gray-500">
                                {property.ownedFractions} / {property.totalFractions} fractions ({property.percentageOwned.toFixed(2)}%)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{property.pricePerFraction} ETH per fraction</p>
                              <p className="text-sm text-gray-500">Status: {property.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      You don't own any properties yet. Browse the marketplace to invest!
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={goToMarketplace} className="w-full">Browse Marketplace</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add New Property</CardTitle>
                  <CardDescription>
                    Submit your property to be verified and tokenized
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Property Location</Label>
                      <Input 
                        id="location" 
                        placeholder="e.g. 123 Main St, City"
                        value={newPropertyData.location}
                        onChange={(e) => setNewPropertyData({...newPropertyData, location: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input 
                        id="description" 
                        placeholder="Describe your property"
                        value={newPropertyData.description}
                        onChange={(e) => setNewPropertyData({...newPropertyData, description: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Fractions: {newPropertyData.totalFractions}</Label>
                      <Slider 
                        min={10} 
                        max={1000} 
                        step={10} 
                        value={[newPropertyData.totalFractions]}
                        onValueChange={(value) => setNewPropertyData({...newPropertyData, totalFractions: value[0]})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per Fraction (ETH)</Label>
                      <Input 
                        id="price" 
                        type="number" 
                        min="0.001" 
                        step="0.001"
                        value={newPropertyData.pricePerFraction}
                        onChange={(e) => setNewPropertyData({...newPropertyData, pricePerFraction: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={isLoading}
                    onClick={submitNewProperty}
                  >
                    Submit Property
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="mb-4">Connect your wallet to see your investments</p>
            <Button onClick={connectWallet}>Connect Wallet</Button>
          </div>
        )}

        {selectedProperty && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {selectedProperty.location || `Property #${selectedProperty.id}`}
                  </h2>
                  <Button variant="ghost" onClick={() => {
                    setSelectedProperty(null);
                    setViewMode(null);
                    setFractionsToSell(0);
                    setNewPrice(0);
                  }}>×</Button>
                </div>
                
                {viewMode === null && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-500">Total Fractions</p>
                        <p className="font-medium">{selectedProperty.totalFractions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Owned Fractions</p>
                        <p className="font-medium">{selectedProperty.ownedFractions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Price Per Fraction</p>
                        <p className="font-medium">{selectedProperty.pricePerFraction} ETH</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium">{selectedProperty.status}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 justify-center mb-4">
                      <Button onClick={() => setViewMode("details")}>View Details</Button>
                      <Button 
                        onClick={() => setViewMode("resell")}
                        disabled={selectedProperty.ownedFractions === 0}
                      >
                        Resell Fractions
                      </Button>
                    </div>
                  </>
                )}
                
                {viewMode === "details" && (
                  <>
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Property Details</h3>
                      <p>{selectedProperty.description}</p>
                      <p className="mt-2">You own {selectedProperty.percentageOwned.toFixed(2)}% of this property.</p>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Resale History</h3>
                      {resaleHistory.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {resaleHistory.map((item, index) => (
                                <tr key={index}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.date}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.pricePerFraction} ETH</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.fractions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500">No resale history available for this property.</p>
                      )}
                    </div>
                    
                    <Button onClick={() => setViewMode(null)} className="w-full">Back</Button>
                  </>
                )}
                
                {viewMode === "resell" && (
                  <>
                    <div className="space-y-4 mb-6">
                      <div className="space-y-2">
                        <Label htmlFor="fractionsToSell">Fractions to Sell</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="fractionsToSell"
                            type="number"
                            min="1"
                            max={selectedProperty.ownedFractions}
                            value={fractionsToSell}
                            onChange={(e) => setFractionsToSell(parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-gray-500">
                            Max: {selectedProperty.ownedFractions}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPrice">Price per Fraction (ETH)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="newPrice"
                            type="number"
                            min="0.000001"
                            step="0.000001"
                            value={newPrice}
                            onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-sm text-gray-500">
                            Original: {selectedProperty.pricePerFraction} ETH
                          </span>
                        </div>
                        
                        {newPrice > 0 && fractionsToSell > 0 && (
                          <div className="text-sm mt-2">
                            <p>Total value: {(newPrice * fractionsToSell).toFixed(6)} ETH</p>
                            {newPrice > selectedProperty.pricePerFraction && (
                              <p className="text-green-600">
                                Profit: {((newPrice - selectedProperty.pricePerFraction) * fractionsToSell).toFixed(6)} ETH
                                ({(((newPrice / selectedProperty.pricePerFraction) - 1) * 100).toFixed(2)}%)
                              </p>
                            )}
                            {newPrice < selectedProperty.pricePerFraction && (
                              <p className="text-red-600">
                                Loss: {((selectedProperty.pricePerFraction - newPrice) * fractionsToSell).toFixed(6)} ETH
                                ({(((1 - (newPrice / selectedProperty.pricePerFraction)) * 100)).toFixed(2)}%)
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setViewMode(null)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      
                      <Button
                        onClick={listFractionsForSale}
                        disabled={!fractionsToSell || !newPrice || isLoading || fractionsToSell > selectedProperty.ownedFractions}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Listing...
                          </>
                        ) : (
                          "List for Sale"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
