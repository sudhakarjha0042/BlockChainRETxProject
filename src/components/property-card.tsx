import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/types/marketplace"; // Ensure this type includes the new fields
import { Badge } from "@/components/ui/badge"; // Optional: for displaying type/status

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
}

// Helper to convert IPFS URL to HTTP Gateway URL
const ipfsToGatewayUrl = (ipfsUrl: string): string => {
  if (!ipfsUrl || !ipfsUrl.startsWith('ipfs://')) {
    // Return a placeholder or the original URL if it's not a valid IPFS URL
    return ipfsUrl || '/placeholder-image.png'; // Provide a path to a placeholder image
  }
  const hash = ipfsUrl.substring(7); // Remove 'ipfs://'
  // Use a public gateway or your preferred one
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
};

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const displayImageUrl = ipfsToGatewayUrl(property.imageUrl);

  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden">
      <CardHeader className="p-0">
        <img
          src={displayImageUrl}
          alt={property.name}
          className="w-full h-48 object-cover" // Fixed height for consistency
          onError={(e) => {
            // Handle image loading errors, e.g., show a placeholder
            (e.target as HTMLImageElement).src = '/placeholder-image.png';
          }}
        />
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-1 truncate">{property.name}</CardTitle>
        <CardDescription className="text-sm text-gray-600 mb-2 truncate">{property.address}</CardDescription>
        <div className="flex justify-between items-center text-sm mb-2">
          <span>Price/Fraction:</span>
          <span className="font-semibold">{property.pricePerNFT.toFixed(4)} ETH</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Available:</span>
          <span>{property.availableFractions} / {property.totalNFTs}</span>
        </div>
        {/* Optional: Add badge for type */}
        {/* <Badge variant="outline" className="mt-2">{property.type}</Badge> */}
      </CardContent>
      {/* Footer can be used for actions or more info if needed */}
      {/* <CardFooter className="p-4 pt-0">
        <p className="text-xs text-muted-foreground">Owner: {property.owner.slice(0, 6)}...{property.owner.slice(-4)}</p>
      </CardFooter> */}
    </Card>
  );
}

