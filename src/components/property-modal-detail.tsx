'use client'

import Image from 'next/image'
import { X, Loader2 } from 'lucide-react'
import { Property } from '../types/marketplace'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

interface PropertyDetailModalProps {
  property: Property | null
  isOpen: boolean
  onClose: () => void
  onBuyNow: () => void
  walletConnected: boolean
  isTransacting?: boolean
}

export function PropertyDetailModal({
  property,
  isOpen,
  onClose,
  onBuyNow,
  walletConnected,
  isTransacting = false,
}: PropertyDetailModalProps) {
  if (!property) return null

  const soldPercentage = (property.soldNFTs / property.totalNFTs) * 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square">
            <Image
              src={property.image}
              alt={`Property in ${property.location}`}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                ${property.estimatedValue.toLocaleString()}
              </DialogTitle>
              <DialogDescription>{property.location}</DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">NFTs Sold</span>
                  <span className="text-sm font-medium">
                    {property.soldNFTs} / {property.totalNFTs}
                  </span>
                </div>
                <Progress value={soldPercentage} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Price per NFT
                  </span>
                  <span className="font-medium">${property.pricePerNFT}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="font-medium">{property.type}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {property.description}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={isTransacting}>
                  Close
                </Button>
                <Button 
                  onClick={onBuyNow} 
                  disabled={isTransacting}
                >
                  {isTransacting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : walletConnected ? (
                    "Buy Now"
                  ) : (
                    "Connect Wallet to Buy"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

