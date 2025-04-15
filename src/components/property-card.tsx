import Image from 'next/image'
import { Property } from '../types/marketplace'

interface PropertyCardProps {
  property: Property
  onClick: () => void
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-all hover:shadow-md"
    >
      <div className="aspect-video w-full overflow-hidden">
        <Image
          src={property.image}
          alt={`Property in ${property.location}`}
          width={400}
          height={300}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <div className="mb-2 text-lg font-semibold">
          ${property.estimatedValue.toLocaleString()}
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>NFT Price: ${property.pricePerNFT}</p>
          <p>Total NFTs: {property.totalNFTs}</p>
          <p>{property.location}</p>
        </div>
      </div>
    </button>
  )
}

