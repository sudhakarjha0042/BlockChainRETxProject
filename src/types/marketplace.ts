export type PropertyType = 'Land' | 'Commercial' | 'House';

export interface Property {
  id: string;
  image: string;
  estimatedValue: number;
  pricePerNFT: number;
  totalNFTs: number;
  soldNFTs: number;
  location: string;
  type: string;
  description: string;
  owner?: string; // Address of the property owner
  availableFractions?: number; // Number of fractions available for sale
}

export interface FilterState {
  area: string;
  propertyTypes: string[];
  priceRange: [number, number];
  nftPriceRange: [number, number];
}

