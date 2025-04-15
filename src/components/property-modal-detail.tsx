'use client'

import { Property } from "@/types/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ethers } from "ethers";

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: () => void;
  walletConnected: boolean;
  isTransacting: boolean;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
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
  maxQuantity
}: PropertyDetailModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate total cost
  const totalCost = property ? quantity * property.pricePerNFT : 0;

  // Calculate ownership percentage
  const ownershipPercentage = property 
    ? (quantity / property.totalNFTs) * 100 
    : 0;

  if (!property) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Property Details</DialogTitle>
          <DialogDescription>
            Review property information and purchase NFT fractions
          </DialogDescription>
        </DialogHeader>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="grid gap-4 py-4">
          <div>
            <img
              src={property.image}
              alt={property.location}
              className="rounded-lg h-48 w-full object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Location</p>
              <p className="text-sm">{property.location}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Type</p>
              <p className="text-sm">{property.type}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Description</p>
            <p className="text-sm">{property.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Estimated Value</p>
              <p className="text-sm">{formatCurrency(property.estimatedValue)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Price per NFT</p>
              <p className="text-sm">{property.pricePerNFT} ETH</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Total NFTs</p>
              <p className="text-sm">{property.totalNFTs}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Available NFTs</p>
              <p className="text-sm">{property.totalNFTs - property.soldNFTs}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (Max: {maxQuantity})</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => onQuantityChange(parseInt(e.target.value))}
              disabled={isTransacting}
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-md">
            <div className="flex justify-between">
              <p className="text-sm font-medium">Total Cost:</p>
              <p className="text-sm font-bold">{totalCost.toFixed(4)} ETH</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm font-medium">Ownership Percentage:</p>
              <p className="text-sm">{ownershipPercentage.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onBuyNow}
            disabled={isTransacting || quantity <= 0 || quantity > maxQuantity}
            className="w-full"
          >
            {isTransacting
              ? "Processing..."
              : walletConnected
              ? `Buy ${quantity} Fraction${quantity > 1 ? "s" : ""}`
              : "Connect Wallet to Buy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

