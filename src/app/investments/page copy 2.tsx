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
  "function getAllListings() external view returns (tuple(uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)[] memory)"
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

  const extractTokenIdFromReceipt = async (receipt: any, contract: any) => {
    try {
      // Try to find the PropertySubmitted event that contains the token ID
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "PropertySubmitted") {
              return parsedLog.args.tokenId.toString();
            }
          } catch (error) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      }
      return "unknown";
    } catch (error) {
      console.error("Error extracting token ID from receipt:", error);
      return "unknown";
    }
  };

  const getLatestTokenId = async (contract: any, provider: any) => {
    try {
      // Try to get the nextTokenId from the contract
      const nextTokenId = await contract.nextTokenId();
      // The last minted token ID should be one less than the next
      return (Number(nextTokenId) - 1).toString();
    } catch (error) {
      console.error("Error getting latest token ID:", error);
      return "unknown";
    }
  };

  const listFractionsForSale = async () => {
    if (!selectedProperty || !walletAddress) return;

    // Validate input parameters
    if (fractionsToSell <= 0 || fractionsToSell > selectedProperty.ownedFractions) {
        toast({
            title: "Invalid Input",
            description: "The number of fractions to sell must be greater than 0 and less than or equal to your owned fractions.",
            variant: "destructive",
        });
        return;
    }

    if (newPrice <= 0) {
        toast({
            title: "Invalid Input",
            description: "The price per fraction must be greater than 0.",
            variant: "destructive",
        });
        return;
    }

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

        // This contract doesn't have a dedicated listFractionsForSale function
        // Instead, we'll use localStorage to track the available fractions and price
        const tokenId = selectedProperty.id;
        const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${tokenId}`;
        const availabilityKey = `property_availability_${tokenId}`;
        const priceKey = `property_price_${tokenId}`;
        
        // Update the local record of ownership
        const newOwnership = selectedProperty.ownedFractions - fractionsToSell;
        localStorage.setItem(storageKey, newOwnership.toString());
        
        // Track the available fractions and price in localStorage
        const currentAvailable = localStorage.getItem(availabilityKey) 
            ? parseInt(localStorage.getItem(availabilityKey) || "0") 
            : 0;
        const newAvailable = currentAvailable + fractionsToSell;
        localStorage.setItem(availabilityKey, newAvailable.toString());
        localStorage.setItem(priceKey, newPrice.toString());

        // Update the UI
        const updatedProperties = ownedProperties.map((prop) => {
            if (prop.id === selectedProperty.id) {
                return {
                    ...prop,
                    ownedFractions: newOwnership,
                    percentageOwned: (newOwnership / prop.totalFractions) * 100,
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
        
        // Note to user about implementation
        toast({
            title: "Note",
            description: "In the current implementation, listings are simulated in the frontend. Future versions will use on-chain listings.",
            variant: "default",
        });
    } catch (error: any) {
        console.error("Error listing fractions for sale:", error);

        // Provide detailed error feedback
        let errorMessage = "Failed to list fractions for sale.";
        if (error.reason) {
            errorMessage = error.reason;
        } else if (error.data && error.data.message) {
            errorMessage = error.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast({
            title: "Listing Failed",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
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
                          onClick={() => setSelectedProperty(property)}
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
      </div>

      {/* Property Selling Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Sell Property Fractions</CardTitle>
              <CardDescription>
                {selectedProperty.location || `Property #${selectedProperty.id}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    You own {selectedProperty.ownedFractions} of {selectedProperty.totalFractions} fractions 
                    ({(selectedProperty.percentageOwned).toFixed(2)}%)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current price: {selectedProperty.pricePerFraction} ETH per fraction
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fractionsToSell">Number of fractions to sell</Label>
                  <Input 
                    id="fractionsToSell" 
                    type="number" 
                    min="1" 
                    max={selectedProperty.ownedFractions}
                    value={fractionsToSell}
                    onChange={(e) => setFractionsToSell(Math.min(
                      parseInt(e.target.value) || 0, 
                      selectedProperty.ownedFractions
                    ))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPrice">Selling price per fraction (ETH)</Label>
                  <Input 
                    id="newPrice" 
                    type="number" 
                    min="0.001" 
                    step="0.001"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-medium">Sale Summary</p>
                  <p className="text-sm">Total value: {(newPrice * fractionsToSell).toFixed(4)} ETH</p>
                  <p className="text-sm">Remaining ownership: {(((selectedProperty.ownedFractions - fractionsToSell) / selectedProperty.totalFractions) * 100).toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedProperty(null);
                  setFractionsToSell(0);
                  setNewPrice(0);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={listFractionsForSale}
                disabled={isLoading || fractionsToSell <= 0 || newPrice <= 0 || fractionsToSell > selectedProperty.ownedFractions}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  "List for Sale"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
