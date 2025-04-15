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

// Simple ABI for property NFT purchases
const CONTRACT_ABI = [
  "function purchasePropertyNFT(uint256 propertyId, uint256 amount) public payable returns (bool)",
  "function getPropertyPrice(uint256 propertyId) external view returns (uint256)"
];

// Contract address from backend .env
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const SAMPLE_PROPERTIES: Property[] = [
  {
    id: "1",
    image:
      "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?cs=srgb&dl=pexels-binyaminmellish-186077.jpg&fm=jpg",
    estimatedValue: 5000000,
    pricePerNFT: 20,
    totalNFTs: 1000,
    soldNFTs: 800,
    location: "Downtown, City A",
    type: "Commercial",
    description: "Prime commercial property in the heart of downtown.",
  },
  {
    id: "2",
    image:
      "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?cs=srgb&dl=pexels-binyaminmellish-186077.jpg&fm=jpg",
    estimatedValue: 750000,
    pricePerNFT: 15,
    totalNFTs: 500,
    soldNFTs: 250,
    location: "Suburb, City B",
    type: "House",
    description: "Spacious family home in a quiet suburban neighborhood.",
  },
  {
    id: "3",
    image:
      "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?cs=srgb&dl=pexels-binyaminmellish-186077.jpg&fm=jpg",
    estimatedValue: 2000000,
    pricePerNFT: 25,
    totalNFTs: 800,
    soldNFTs: 600,
    location: "Beachfront, City C",
    type: "Land",
    description: "Rare beachfront land with development potential.",
  },
  {
    id: "4",
    image:
      "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?cs=srgb&dl=pexels-binyaminmellish-186077.jpg&fm=jpg",
    estimatedValue: 3500000,
    pricePerNFT: 30,
    totalNFTs: 1200,
    soldNFTs: 900,
    location: "Tech Park, City D",
    type: "Commercial",
    description: "Modern office space in a thriving tech park.",
  },
  {
    id: "5",
    image:
      "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?cs=srgb&dl=pexels-binyaminmellish-186077.jpg&fm=jpg",
    estimatedValue: 1200000,
    pricePerNFT: 18,
    totalNFTs: 600,
    soldNFTs: 450,
    location: "Historic District, City E",
    type: "House",
    description: "Charming historic home with modern amenities.",
  },
  {
    id: "6",
    image:
      "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?cs=srgb&dl=pexels-binyaminmellish-186077.jpg&fm=jpg",
    estimatedValue: 8000000,
    pricePerNFT: 40,
    totalNFTs: 2000,
    soldNFTs: 1500,
    location: "Financial District, City F",
    type: "Commercial",
    description: "High-rise office building in the financial hub.",
  },
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
  const { toast } = useToast();

  const isWalletConnected = !!walletAddress;

  // Connect wallet function
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

      console.log("Wallet connected:", address);
      setWalletAddress(address);
      setWalletError("");

      // Close modal if it was open
      if (showWalletConnect) {
        setShowWalletConnect(false);
      }
    } catch (err) {
      console.error(err);
      setWalletError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

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

      // Calculate price (price per NFT * quantity) - handle both v5 and v6 approaches
      let totalPrice;
      if (typeof ethers.parseEther === "function") {
        // ethers v6
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

      // Call the purchase function on the contract
      const tx = await contract.purchasePropertyNFT(property.id, quantity, { value: totalPrice });

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

      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased ${quantity} NFT(s) for property ${property.id}`,
        variant: "success",
      });

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

  // Handle buy now action
  const handleBuyNow = () => {
    if (!selectedProperty) return;

    if (isWalletConnected) {
      // Process actual blockchain transaction
      purchasePropertyNFT(selectedProperty, 1);
    } else {
      // Show wallet connect modal if not connected
      setShowWalletConnect(true);
    }
  };

  const filteredProperties = SAMPLE_PROPERTIES.filter((property) => {
    return (
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
        {/* Wallet Connection Button in top right corner */}
        <div className="absolute top-4 right-4 z-10">
          {isWalletConnected ? (
            <Button variant="outline" className="text-xs">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </Button>
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
              <p>No properties match the selected filters.</p>
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
