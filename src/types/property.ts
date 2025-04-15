export interface Property {
  id: string
  name: string
  rent: number
  currency: string
  currentValue: number
  purchaseValue: number
  priceHistory: {
    date: string
    value: number
  }[]
}

export interface PropertyCollection {
  totalProperties: number
  totalValue: number
  properties: Property[]
}

