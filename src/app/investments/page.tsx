"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const COMPATIBLE_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function properties(uint256) external view returns (uint256 tokenId, address owner, string name, string propertyAddress, string imageUrl, string documentUrl, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)",
  "function totalSupply() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function submitPropertyForVerification(string memory _name, string memory _propertyAddress, string memory _imageUrl, string memory _documentUrl, uint256 _totalFractions, uint256 _pricePerFraction) external payable",
  "function verifyProperty(uint256 tokenId, bool approve) external",
  "function nextTokenId() external view returns (uint256)",
  "function getAllListings() external view returns (tuple(uint256 tokenId, address owner, string name, string propertyAddress, string imageUrl, string documentUrl, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)[] memory)",
  "event PropertySubmitted(uint256 indexed tokenId, address indexed owner, string name, string propertyAddress, string imageUrl, string documentUrl, uint256 totalFractions, uint256 pricePerFraction)"
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const VERIFICATION_FEE = "10000000000000000";

const ipfsToGatewayUrl = (ipfsUrl: string): string => {
  if (!ipfsUrl || !ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl || '/placeholder-image.png';
  }
  const hash = ipfsUrl.substring(7);
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
};

interface OwnedProperty {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  documentUrl: string;
  totalFractions: number;
  pricePerFraction: number;
  ownedFractions: number;
  percentageOwned: number;
  status: string;
}

export default function InvestmentsPage() {
  const [walletAddress, setWalletAddress] = React.useState("");
  const [ownedProperties, setOwnedProperties] = React.useState<OwnedProperty[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [newPropertyData, setNewPropertyData] = React.useState({
    name: "",
    propertyAddress: "",
    imageFile: null,
    documentFile: null,
    totalFractions: 100,
    pricePerFraction: 0.01,
  });
  const [manualPropertyId, setManualPropertyId] = React.useState("");
  const [isCheckingProperty, setIsCheckingProperty] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
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
        console.warn("Could not fetch all listings:", err);
        throw new Error("Failed to retrieve property list from contract.");
      }

      console.log("Processing properties to check ownership...");
      for (const listing of allListings) {
        const tokenId = Number(listing.tokenId);
        const tokenIdStr = tokenId.toString();
        const propertyOwner = listing.owner;
        const totalFractions = Number(listing.totalFractions);
        const status = Number(listing.status);
        const name = listing.name;
        const propertyAddress = listing.propertyAddress;
        const imageUrl = listing.imageUrl;
        const documentUrl = listing.documentUrl;

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
          console.log(`Found ownership for property #${tokenIdStr}: ${ownedFractions} fractions`);

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
            name: name,
            address: propertyAddress,
            imageUrl: imageUrl,
            documentUrl: documentUrl,
            totalFractions: totalFractions,
            pricePerFraction: pricePerFraction,
            ownedFractions: ownedFractions,
            percentageOwned: percentageOwned,
            status: propertyStatus,
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
        console.log("No properties found for this address.");
        setOwnedProperties([]);
        toast({
          title: "No Properties Found",
          description: "No properties found automatically. Try refreshing or use 'Lookup Property'.",
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
      const name = property.name;
      const propertyAddress = property.propertyAddress;
      const imageUrl = property.imageUrl;
      const documentUrl = property.documentUrl;

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
          name: name,
          address: propertyAddress,
          imageUrl: imageUrl,
          documentUrl: documentUrl,
          totalFractions: totalFractions,
          pricePerFraction: pricePerFraction,
          ownedFractions: ownedFractions,
          percentageOwned: percentageOwned,
          status: propertyStatus,
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

  const goToMarketplace = () => {
    router.push("/marketplace");
  };

  const uploadToIPFS = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`IPFS upload failed: ${errorData}`);
    }

    const result = await response.json();
    if (!result.ipfsUrl) {
      throw new Error("IPFS upload failed: No URL returned");
    }
    console.log("Uploaded file, IPFS URL:", result.ipfsUrl);
    return result.ipfsUrl;
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

    if (!newPropertyData.name || !newPropertyData.propertyAddress) {
      toast({
        title: "Invalid Data",
        description: "Property name and address are required",
        variant: "destructive",
      });
      return;
    }

    if (!newPropertyData.imageFile || !newPropertyData.documentFile) {
      toast({
        title: "Invalid Data",
        description: "Property image and document are required",
        variant: "destructive",
      });
      return;
    }

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

    let txHash = '';
    let newTokenId = '';
    let imageUrl = '';
    let documentUrl = '';

    try {
      toast({
        title: "Uploading Files",
        description: "Uploading property image and document to IPFS...",
      });
      imageUrl = await uploadToIPFS(newPropertyData.imageFile);
      documentUrl = await uploadToIPFS(newPropertyData.documentFile);
      toast({
        title: "Upload Complete",
        description: "Files uploaded successfully.",
        variant: "success",
      });

      let provider;
      let signer;

      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, COMPATIBLE_ABI, signer);

      let priceInWei;
      try {
        if (typeof ethers.parseEther === "function") {
          priceInWei = ethers.parseEther(newPropertyData.pricePerFraction.toString());
        } else {
          priceInWei = ethers.utils.parseEther(newPropertyData.pricePerFraction.toString());
        }
      } catch (error: any) {
        console.error("Error parsing price to wei:", error);
        throw new Error(`Could not convert price to wei: ${error.message || 'Unknown error'}`);
      }

      let verificationFee = VERIFICATION_FEE;
      try {
        if (contract.interface.getFunction("getVerificationFee")) {
          verificationFee = await contract.getVerificationFee();
          console.log("Got verification fee from contract:", verificationFee.toString());
        }
      } catch (error) {
        console.warn("Could not get verification fee from contract, using default:", error);
      }

      toast({
        title: "Submitting Property",
        description: "Please confirm the transaction in your wallet...",
      });

      const tx = await contract.submitPropertyForVerification(
        newPropertyData.name,
        newPropertyData.propertyAddress,
        imageUrl,
        documentUrl,
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

      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);

      newTokenId = await extractTokenIdFromReceipt(receipt, contract);
      if (!newTokenId || newTokenId === "unknown") {
        newTokenId = await getLatestTokenId(contract, provider);
      }

      if (newTokenId && newTokenId !== "unknown") {
        const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${newTokenId}`;
        localStorage.setItem(storageKey, newPropertyData.totalFractions.toString());
        console.log(`Recorded ownership of ${newPropertyData.totalFractions} fractions of property #${newTokenId} in localStorage`);
      }

      toast({
        title: "Property Submitted Successfully",
        description: `Your property "${newPropertyData.name}" has been submitted${newTokenId && newTokenId !== "unknown" ? ` with ID ${newTokenId}` : ''}. It is now pending verification.`,
        variant: "success",
      });

      if (process.env.NODE_ENV !== 'production' && newTokenId && newTokenId !== "unknown") {
        try {
          let verifyProvider;
          let verifySigner;
          if (typeof ethers.BrowserProvider === "function") {
            verifyProvider = new ethers.BrowserProvider(window.ethereum);
            verifySigner = await verifyProvider.getSigner();
          } else {
            verifyProvider = new ethers.providers.Web3Provider(window.ethereum);
            verifySigner = verifyProvider.getSigner();
          }
          const verificationContract = new ethers.Contract(CONTRACT_ADDRESS, COMPATIBLE_ABI, verifySigner);
          await autoVerifyProperty(verificationContract, newTokenId);
        } catch (error) {
          console.error("Auto-verification failed:", error);
        }
      }

      const newProperty: OwnedProperty = {
        id: newTokenId || Date.now().toString(),
        name: newPropertyData.name,
        address: newPropertyData.propertyAddress,
        imageUrl: imageUrl,
        documentUrl: documentUrl,
        totalFractions: newPropertyData.totalFractions,
        pricePerFraction: newPropertyData.pricePerFraction,
        ownedFractions: newPropertyData.totalFractions,
        percentageOwned: 100,
        status: "Pending",
      };
      setOwnedProperties(prev => [...prev, newProperty]);

      setNewPropertyData({
        name: "",
        propertyAddress: "",
        imageFile: null,
        documentFile: null,
        totalFractions: 100,
        pricePerFraction: 0.01,
      });

      const imageInput = document.getElementById('imageFile') as HTMLInputElement;
      if (imageInput) imageInput.value = '';
      const docInput = document.getElementById('documentFile') as HTMLInputElement;
      if (docInput) docInput.value = '';

      setTimeout(() => {
        refreshProperties();
      }, 5000);

    } catch (error: any) {
      console.error("Error submitting property:", error);
      let errorMessage = "Failed to submit property";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message && error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (error.message && error.message.includes("user rejected transaction")) {
        errorMessage = "Transaction cancelled";
      } else if (error.message) {
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
    if (!contract.interface.getFunction("verifyProperty")) {
      console.warn("Contract ABI does not include verifyProperty function. Skipping auto-verification.");
      return false;
    }

    try {
      toast({
        title: "Auto-Verifying (Dev)",
        description: `Automatically verifying property #${tokenId} for testing...`,
      });

      const tx = await contract.verifyProperty(tokenId, true);
      const receipt = await tx.wait();
      console.log(`Auto-verification transaction mined:`, receipt);

      toast({
        title: "Property Auto-Verified (Dev)",
        description: `Property #${tokenId} has been automatically verified. Refresh may be needed.`,
        variant: "success",
      });

      setOwnedProperties(prev =>
        prev.map(p =>
          p.id === tokenId ? { ...p, status: 'Verified' } : p
        )
      );

      return true;
    } catch (error: any) {
      console.error("Error auto-verifying property:", error);
      toast({
        title: "Auto-Verification Failed (Dev)",
        description: error.message || "Failed to automatically verify property",
        variant: "destructive",
      });
      return false;
    }
  };

  const extractTokenIdFromReceipt = async (receipt: any, contract: any): Promise<string> => {
    if (!receipt || !receipt.logs) return "unknown";

    try {
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
          continue;
        }
      }

      console.warn("Could not find tokenId in transaction logs");
      return "unknown";
    } catch (error) {
      console.error("Error extracting token ID from receipt:", error);
      return "unknown";
    }
  };

  const getLatestTokenId = async (contract: any, provider: any): Promise<string> => {
    try {
      console.log("Trying alternative methods to determine token ID");

      try {
        const nextToken = await contract.nextTokenId();
        const tokenId = (Number(nextToken) - 1).toString();
        console.log("Estimated tokenId from nextTokenId:", tokenId);
        return tokenId;
      } catch (error) {
        console.warn("Failed to get nextTokenId:", error);
      }

      try {
        const totalSupply = await contract.totalSupply();
        const tokenId = totalSupply.toString();
        console.log("Estimated tokenId from totalSupply:", tokenId);
        return tokenId;
      } catch (error) {
        console.warn("Failed to get totalSupply:", error);
      }

      try {
        const blockNumber = await provider.getBlockNumber();
        const events = await contract.queryFilter("Transfer", blockNumber - 10, blockNumber);

        if (events && events.length > 0) {
          const latestEvent = events[events.length - 1];
          const tokenId = latestEvent.args.tokenId.toString();
          console.log("Found tokenId from recent events:", tokenId);
          return tokenId;
        }
      } catch (error) {
        console.warn("Failed to check recent events:", error);
      }

      return Date.now().toString();

    } catch (error) {
      console.error("All methods to determine token ID failed:", error);
      return "unknown";
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
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              {property.imageUrl && (
                                <img src={property.imageUrl} alt={property.name} className="w-16 h-16 object-cover rounded" />
                              )}
                              <div>
                                <h3 className="font-medium">{property.name || `Property #${property.id}`}</h3>
                                <p className="text-sm text-gray-600">{property.address}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {property.ownedFractions} / {property.totalFractions} fractions ({property.percentageOwned.toFixed(2)}%)
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="font-medium">{property.pricePerFraction.toFixed(4)} ETH/fraction</p>
                              <p className={`text-sm font-semibold ${
                                property.status === 'Verified' ? 'text-green-600' :
                                property.status === 'Pending' ? 'text-yellow-600' :
                                property.status === 'Rejected' ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                Status: {property.status}
                              </p>
                              {property.documentUrl && (
                                <a
                                  href={property.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Document
                                </a>
                              )}
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
                      <Label htmlFor="propertyName">Property Name *</Label>
                      <Input
                        id="propertyName"
                        placeholder="e.g. Beachfront Villa"
                        value={newPropertyData.name}
                        onChange={(e) => setNewPropertyData({...newPropertyData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="propertyAddress">Property Address *</Label>
                      <Textarea
                        id="propertyAddress"
                        placeholder="e.g. 123 Ocean Drive, Miami, FL 33139"
                        value={newPropertyData.propertyAddress}
                        onChange={(e) => setNewPropertyData({...newPropertyData, propertyAddress: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imageFile">Property Image *</Label>
                      <Input
                        id="imageFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewPropertyData({...newPropertyData, imageFile: e.target.files ? e.target.files[0] : null})}
                        required
                      />
                      {newPropertyData.imageFile && <p className="text-xs text-muted-foreground">Selected: {newPropertyData.imageFile.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="documentFile">Legal Document (PDF) *</Label>
                      <Input
                        id="documentFile"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setNewPropertyData({...newPropertyData, documentFile: e.target.files ? e.target.files[0] : null})}
                        required
                      />
                      {newPropertyData.documentFile && <p className="text-xs text-muted-foreground">Selected: {newPropertyData.documentFile.name}</p>}
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
                      <Label htmlFor="price">Price per Fraction (ETH) *</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={newPropertyData.pricePerFraction}
                        onChange={(e) => setNewPropertyData({...newPropertyData, pricePerFraction: parseFloat(e.target.value) || 0})}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={isLoading || !newPropertyData.name || !newPropertyData.propertyAddress || !newPropertyData.imageFile || !newPropertyData.documentFile || newPropertyData.totalFractions <= 0 || newPropertyData.pricePerFraction <= 0}
                    onClick={submitNewProperty}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? 'Submitting...' : 'Submit Property for Verification'}
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
    </div>
  );
}
