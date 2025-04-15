export type PropertyType = 'Land' | 'Commercial' | 'House'

export interface Property {
  id: string
  image: string
  estimatedValue: number
  pricePerNFT: number
  totalNFTs: number
  soldNFTs: number
  location: string
  type: PropertyType
  description: string
}

export interface FilterState {
  area: string
  propertyTypes: PropertyType[]
  priceRange: [number, number]
  nftPriceRange: [number, number]
}

