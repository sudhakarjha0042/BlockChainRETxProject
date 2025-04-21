export type PropertyType = 'Land' | 'Commercial' | 'House';

export interface Property {
  id: string;
  name: string; // Added
  address: string; // Added
  imageUrl: string; // Added (was 'image' before?)
  documentUrl: string; // Added
  estimatedValue: number; // Consider if this should be calculated on the fly
  pricePerNFT: number;
  totalNFTs: number;
  soldNFTs: number; // Consider if this should be calculated on the fly (totalNFTs - availableFractions)
  location?: string; // Optional: Keep if used for filtering/display alongside address
  type: string; // e.g., "Fractional NFT"
  description?: string; // Optional: Can be generated dynamically
  owner: string;
  availableFractions: number;
}

export interface FilterState {
  area: string;
  propertyTypes: string[];
  priceRange: [number, number];
  nftPriceRange: [number, number];
}

