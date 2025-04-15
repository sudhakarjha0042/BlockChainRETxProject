"use client";

import * as React from "react";
import { Property, FilterState } from "@/types/marketplace";
import { SidebarFilters } from "@/components/sidebar-filters";
import { PropertyCard } from "@/components/property-card";
import { PropertyDetailModal } from "@/components/property-modal-detail";
import { WalletConnectModal } from "@/components/wallet-connect";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

// Updated ABI to match FractionalNFTMarketplace contract
const CONTRACT_ABI = [
  "function buyFraction(uint256 _tokenId, uint256 _fractions) external payable",
  "function getAllListings() external view returns (tuple(uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)[] memory)",
  "function properties(uint256) external view returns (uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)"
];

// Contract address from backend .env
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Updated property type to match contract structure
interface BlockchainProperty {
  tokenId: number;
  owner: string;
  totalFractions: number;
  pricePerFraction: number;
  availableFractions: number;
  status: number; // 0: Pending, 1: Verified, 2: Rejected
}

// Sample properties as fallback when blockchain connection fails
const SAMPLE_PROPERTIES: Property[] = [
  {
    id: "1",
    image: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg",
    estimatedValue: 500000,
    pricePerNFT: 0.5,
    totalNFTs: 1000,
    soldNFTs: 400,
    location: "Downtown Property #1",
    type: "Fractional NFT",
    description: "600/1000 fractions available",
    owner: "0x1234567890123456789012345678901234567890",
    availableFractions: 600,
  },
  {
    id: "2",
    image: "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg",
    estimatedValue: 750000,
    pricePerNFT: 0.75,
    totalNFTs: 1000,
    soldNFTs: 250,
    location: "Suburb Property #2",
    type: "Fractional NFT",
    description: "750/1000 fractions available",
    owner: "0x1234567890123456789012345678901234567890",
    availableFractions: 750,
  }
];

export default function Marketplace() {
  const [filters, setFilters] = React.useState<FilterState>({
    area: "",
    propertyTypes: [],
    priceRange: [0, 10000000],
    nftPriceRange: [0, 1000],
  });

  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);
  const [showWalletConnect, setShowWalletConnect] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string>("");
  const [walletError, setWalletError] = React.useState<string>("");
  const [isTransacting, setIsTransacting] = React.useState(false);
  const [transaction, setTransaction] = React.useState<any>(null);
  const [properties, setProperties] = React.useState<Property[]>(SAMPLE_PROPERTIES);
  const [purchaseQuantity, setPurchaseQuantity] = React.useState<number>(1);
  const { toast } = useToast();
  const router = useRouter();

  const isWalletConnected = !!walletAddress;

  // Improved property fetching with better error handling
  const fetchProperties = React.useCallback(async () => {
    if (!isWalletConnected) return;

    try {
      console.log("Attempting to fetch properties from blockchain...");
      
      let provider;
      if (typeof ethers.BrowserProvider === "function") {
        console.log("Using ethers v6 BrowserProvider");
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        console.log("Using ethers v5 Web3Provider");
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }
      
      console.log("Connecting to contract at address:", CONTRACT_ADDRESS);
      console.log("Using ABI:", CONTRACT_ABI);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Test contract connection with a simple call first
      try {
        // Try to get the first property as a test
        await contract.properties(1);
        console.log("Contract connection test successful");
      } catch (testError) {
        console.error("Test property fetch failed:", testError);
        throw new Error("Contract connection test failed");
      }
      
      // Now try to get all listings
      console.log("Fetching property listings from contract");
      const listings = await contract.getAllListings();
      console.log("Received listings:", listings);
      
      if (!listings || listings.length === 0) {
        console.log("No property listings found on the blockchain");
        toast({
          title: "No Properties",
          description: "No property listings found on the blockchain",
          variant: "default",
        });
        return;
      }
      
      // Convert blockchain data to Property format
      console.log("Converting blockchain data to Property format");
      const propertiesFromChain = listings.map((listing: BlockchainProperty) => {
        try {
          const formattedPrice = typeof ethers.formatEther === "function" 
            ? ethers.formatEther(listing.pricePerFraction) 
            : ethers.utils.formatEther(listing.pricePerFraction);
          
          return {
            id: listing.tokenId.toString(),
            image: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg",
            estimatedValue: Number(listing.totalFractions) * Number(formattedPrice),
            pricePerNFT: Number(formattedPrice),
            totalNFTs: Number(listing.totalFractions),
            soldNFTs: Number(listing.totalFractions) - Number(listing.availableFractions),
            location: "Property #" + listing.tokenId.toString(),
            type: "Fractional NFT",
            description: `${listing.availableFractions}/${listing.totalFractions} fractions available`,
            owner: listing.owner,
            availableFractions: Number(listing.availableFractions),
          };
        } catch (err) {
          console.error("Error converting listing to Property format:", err, listing);
          return null;
        }
      }).filter(Boolean);
      
      console.log("Converted properties:", propertiesFromChain);
      
      if (propertiesFromChain && propertiesFromChain.length > 0) {
        setProperties(propertiesFromChain);
        toast({
          title: "Success",
          description: `Loaded ${propertiesFromChain.length} properties from blockchain`,
          variant: "default",
        });
      } else {
        throw new Error("No valid properties found after conversion");
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      
      toast({
        title: "Error",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? `Failed to fetch properties: ${error.message}` 
          : "Failed to fetch properties from blockchain. Check console for details.",
        variant: "destructive",
      });
      
      // Suggest using sample data for testing
      toast({
        title: "Tip",
        description: "You can use 'Load Sample Data' to test with sample properties.",
        variant: "default",
      });
    }
  }, [isWalletConnected, toast]);

  // Connect wallet function by calling a simpler method first
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        setWalletError("MetaMask is not installed. Please install it from metamask.io");
        return;
      }

      let address;
      let provider;
      
      // For both ethers v5 and v6
      if (typeof ethers.BrowserProvider === "function") {
        // ethers v6 approach
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        address = await signer.getAddress();
      } else {
        // ethers v5 approach
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        address = await signer.getAddress();
      }

      setWalletAddress(address);
      setWalletError("");
      console.log("Wallet connected:", address);
      
      // Close modal if it was open
      if (showWalletConnect) {
        setShowWalletConnect(false);
      }
    } catch (err) {
      console.error(err);
      setWalletError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  // Call fetchProperties when wallet is connected
  React.useEffect(() => {
    if (isWalletConnected) {
      fetchProperties();
    }
  }, [isWalletConnected, fetchProperties]);

  // Function to purchase property NFTs
  const purchasePropertyNFT = async (property: Property, quantity: number = 1) => {
    if (!property || !isWalletConnected) return;
    setIsTransacting(true);
    
    try {
      // Get provider and signer
      let provider;
      let signer;
      
      if (typeof ethers.BrowserProvider === "function") {
        // ethers v6
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } else {
        // ethers v5
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }
      
      // Create contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Calculate price (price per NFT * quantity)
      let totalPrice;
      if (typeof ethers.parseEther === "function") {
        // ethers v6 approach
        totalPrice = ethers.parseEther(
          (property.pricePerNFT * quantity).toString()
        );
      } else if (ethers.utils && typeof ethers.utils.parseEther === "function") {
        // ethers v5
        totalPrice = ethers.utils.parseEther(
          (property.pricePerNFT * quantity).toString()
        );
      } else {
        throw new Error("Unable to use ethers.parseEther or ethers.utils.parseEther");
      }
      
      // Call the buyFraction function on the contract
      const tx = await contract.buyFraction(property.id, quantity, { value: totalPrice });
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash}`,
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      setTransaction({
        hash: receipt.transactionHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
      });
      
      // Record the purchase in localStorage to help investments page find it
      recordPurchase(property.id, quantity);
      
      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased ${quantity} fraction(s) of property #${property.id}`,
        variant: "success",
      });
      
      // Refresh properties after purchase
      fetchProperties();

      // Close the property modal
      setSelectedProperty(null);
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to purchase property NFT",
        variant: "destructive",
      });
    } finally {
      setIsTransacting(false);
    }
  };

  // Add a function to record purchases in localStorage
  const recordPurchase = (propertyId: string, fractions: number) => {
    if (!walletAddress) return;
    
    const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${propertyId}`;
    const existingOwnership = localStorage.getItem(storageKey);
    const newOwnership = existingOwnership ? (parseInt(existingOwnership) + fractions) : fractions;
    
    localStorage.setItem(storageKey, newOwnership.toString());
    console.log(`Recorded purchase of ${fractions} fractions of property #${propertyId}`);
  };

  // Handle buy now action
  const handleBuyNow = () => {
    if (!selectedProperty) return;
    
    if (isWalletConnected) {
      // Process actual blockchain transaction
      purchasePropertyNFT(selectedProperty, purchaseQuantity);
    } else {
      // Show wallet connect modal if not connected
      setShowWalletConnect(true);
    }
  };

  // Navigate to investments page
  const goToInvestments = () => {
    router.push("/investments");
  };

  // Enhanced loadSampleData function to provide better feedback
  const loadSampleData = () => {
    setProperties(SAMPLE_PROPERTIES);
    toast({
      title: "Sample Data Loaded",
      description: `Loaded ${SAMPLE_PROPERTIES.length} sample properties for testing`,
      variant: "default",
    });
  };

  const filteredProperties = properties.filter((property) => {
    return (
      property.availableFractions > 0 && // Only show properties with available fractions
      (!filters.area || property.location.includes(filters.area)) &&
      (filters.propertyTypes.length === 0 || filters.propertyTypes.includes(property.type)) &&
      property.estimatedValue >= filters.priceRange[0] &&
      property.estimatedValue <= filters.priceRange[1] &&
      property.pricePerNFT >= filters.nftPriceRange[0] &&
      property.pricePerNFT <= filters.nftPriceRange[1]
    );
  });

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarFilters filters={filters} onFilterChange={setFilters} />
      
      <main className="flex-1 overflow-auto relative">
        {/* Wallet Connection and My Investments Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {isWalletConnected ? (
            <>
              <Button onClick={goToInvestments} className="mr-2">My Investments</Button>
              <Button variant="outline" className="text-xs">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Button>
            </>
          ) : (
            <Button onClick={connectWallet}>Connect Wallet</Button>
          )}
          {walletError && <p className="text-red-500 text-xs mt-1">{walletError}</p>}
        </div>

        <div className="container mx-auto py-8 px-4">
          <h1 className="mb-6 text-3xl font-bold">Property Marketplace</h1>

          {transaction && (
            <div className="mb-6 p-4 border rounded-lg bg-green-50">
              <h3 className="font-semibold">Latest Transaction</h3>
              <p className="text-sm">Hash: {transaction.hash}</p>
              <p className="text-sm">Status: {transaction.status ? "Success" : "Failed"}</p>
              <p className="text-sm">Block: {transaction.blockNumber}</p>
            </div>
          )}

          {/* Add a debug button for loading sample data during development */}
          {process.env.NODE_ENV !== 'production' && (
            <Button onClick={loadSampleData} variant="outline" className="mb-4">
              Load Sample Data
            </Button>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => setSelectedProperty(property)}
                />
              ))
            ) : (
              <p>No properties match the selected filters or are available for purchase.</p>
            )}
          </div>
        </div>
      </main>

      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onBuyNow={handleBuyNow}
        walletConnected={isWalletConnected}
        isTransacting={isTransacting}
        quantity={purchaseQuantity}
        onQuantityChange={setPurchaseQuantity}
        maxQuantity={selectedProperty?.availableFractions || 0}
      />

      {showWalletConnect && (
        <WalletConnectModal
          onClose={() => setShowWalletConnect(false)}
          onConnect={connectWallet}
        />
      )}
    </div>
  );
}
