"use client";

import * as React from "react";
import { Property, FilterState } from "@/types/marketplace";
import { SidebarFilters } from "@/components/sidebar-filters";
import { PropertyCard } from "@/components/property-card";
import { PropertyDetailModal } from "@/components/property-modal-detail";
import { WalletConnectModal } from "@/components/wallet-connect";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";

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

  const isWalletConnected = !!walletAddress;

  // Handle wallet connection
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        setWalletError("MetaMask is not installed. Please install it from metamask.io");
        return;
      }

      let address;

      // For both ethers v5 and v6
      if (typeof ethers.BrowserProvider === "function") {
        // ethers v6 approach
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        address = await signer.getAddress();
      } else {
        // ethers v5 approach
        const provider = new ethers.providers.Web3Provider(window.ethereum);
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

  // Handle buy now action - only process if wallet is connected
  const handleBuyNow = () => {
    if (isWalletConnected) {
      // Directly proceed with purchase logic
      console.log("Processing purchase with connected wallet:", walletAddress);
      // Add your purchase logic here
      alert(`Purchase initiated with wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
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
