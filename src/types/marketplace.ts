export type PropertyType = 'Land' | 'Commercial' | 'House';

export interface Property {
  id: string;
  image?: string;
  estimatedValue: number;
  pricePerNFT: number;
  totalNFTs: number;
  soldNFTs: number;
  location: string;
  type: string;
  description: string;
  owner: string;
  availableFractions: number;
}

export interface ResaleOffering {
  seller: string;
  fractions: number;
  pricePerFraction: number;
  listedDate?: string;
}

export interface FilterState {
  area: string;
  propertyTypes: string[];
  priceRange: [number, number];
  nftPriceRange: [number, number];
}

