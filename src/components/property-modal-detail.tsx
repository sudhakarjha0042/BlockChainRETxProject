'use client'

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Property } from "@/types/marketplace";
import { Loader2 } from "lucide-react";

// Helper to convert IPFS URL to HTTP Gateway URL (same as in PropertyCard)
const ipfsToGatewayUrl = (ipfsUrl: string): string => {
    if (!ipfsUrl || !ipfsUrl.startsWith('ipfs://')) {
        return ipfsUrl || '/placeholder-image.png';
    }
    const hash = ipfsUrl.substring(7);
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
};

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: () => void;
  walletConnected: boolean;
  isTransacting: boolean;
  quantity: number;
  onQuantityChange: (value: number) => void;
  maxQuantity: number;
}

export function PropertyDetailModal({
  property,
  isOpen,
  onClose,
  onBuyNow,
  walletConnected,
  isTransacting,
  quantity,
  onQuantityChange,
  maxQuantity,
}: PropertyDetailModalProps) {
  if (!property) return null;

  const displayImageUrl = ipfsToGatewayUrl(property.imageUrl);
  const displayDocumentUrl = ipfsToGatewayUrl(property.documentUrl); // Also convert doc URL if needed, or link directly if gateway handles it

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) {
      value = 1;
    } else if (value > maxQuantity) {
      value = maxQuantity;
    }
    onQuantityChange(value);
  };

  const totalCost = (property.pricePerNFT * quantity).toFixed(6); // Calculate total cost

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{property.name}</DialogTitle>
          <DialogDescription>{property.address}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <img
              src={displayImageUrl}
              alt={property.name}
              className="max-w-full h-64 object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.png';
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="font-semibold">Price/Fraction:</span> {property.pricePerNFT.toFixed(4)} ETH</div>
            <div><span className="font-semibold">Available:</span> {property.availableFractions} / {property.totalNFTs}</div>
            <div><span className="font-semibold">Owner:</span> {property.owner.slice(0, 8)}...{property.owner.slice(-6)}</div>
            {/* Add Document Link */}
            {property.documentUrl && (
                 <div>
                    <span className="font-semibold">Document:</span>{' '}
                    <a
                        href={displayDocumentUrl} // Use gateway URL or direct IPFS link
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                        View Legal Document
                    </a>
                 </div>
            )}
            {/* Add more details if needed */}
            {/* <div><span className="font-semibold">Est. Value:</span> {property.estimatedValue.toLocaleString()} ETH</div> */}
          </div>

          {/* Purchase Section */}
          {property.availableFractions > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold mb-2">Purchase Fractions</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="quantity">Quantity (Max: {maxQuantity})</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={quantity}
                    onChange={handleQuantityChange}
                    disabled={isTransacting || maxQuantity === 0}
                  />
                </div>
                <div className="text-right mt-5"> {/* Adjusted margin */}
                   <p className="text-sm">Total Cost:</p>
                   <p className="font-semibold text-lg">{totalCost} ETH</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {property.availableFractions > 0 ? (
            walletConnected ? (
              <Button
                onClick={onBuyNow}
                disabled={isTransacting || quantity <= 0 || quantity > maxQuantity}
                className="w-full"
              >
                {isTransacting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isTransacting ? "Processing..." : `Buy ${quantity} Fraction${quantity > 1 ? 's' : ''}`}
              </Button>
            ) : (
              <Button onClick={onBuyNow} className="w-full">Connect Wallet to Buy</Button> // Button text indicates action needed
            )
          ) : (
             <p className="text-center text-red-600 font-semibold w-full">Sold Out</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

