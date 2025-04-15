"use client";

import * as React from "react";
import { Property, FilterState } from "@/types/marketplace";
import { SidebarFilters } from "@/components/sidebar-filters";
import { PropertyCard } from "@/components/property-card";
import { PropertyDetailModal } from "@/components/property-modal-detail";
// Correctly import the named export WalletConnectModal
import { WalletConnectModal } from "@/components/wallet-connect";

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

  const handleBuyNow = () => setShowWalletConnect(true);

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
      <main className="flex-1 overflow-auto">
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
      />

      {/* Use the correct component name WalletConnectModal */}
      {showWalletConnect && <WalletConnectModal onClose={() => setShowWalletConnect(false)} />}
    </div>
  );
}
