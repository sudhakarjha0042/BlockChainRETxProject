import { Button } from "@/components/ui/button";
import { Property } from "@/types/marketplace";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  resaleOfferings?: Array<{
    seller: string;
    fractions: number;
    pricePerFraction: number;
  }>;
  onResalePurchase?: (seller: string, quantity: number, price: number) => void;
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
  resaleOfferings = [],
  onResalePurchase
}: PropertyDetailModalProps) {
  const [resaleQuantity, setResaleQuantity] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState("initial");
  
  if (!isOpen || !property) return null;
  
  const hasResaleOfferings = resaleOfferings && resaleOfferings.length > 0;
  const totalResaleAvailable = resaleOfferings.reduce((sum, offering) => sum + offering.fractions, 0);
  
  const handleResaleQuantityChange = (seller: string, maxQty: number, value: string) => {
    const qty = parseInt(value) || 0;
    const validQty = Math.min(Math.max(0, qty), maxQty);
    setResaleQuantity({
      ...resaleQuantity,
      [seller]: validQty
    });
  };
  
  const isResaleFractionsSoldOut = maxQuantity === 0;
  const isAllFractionsSoldOut = isResaleFractionsSoldOut && totalResaleAvailable === 0;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{property.location}</h2>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
          
          <div className="mb-6">
            <img 
              src={property.image || "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg"} 
              alt={property.location} 
              className="w-full h-64 object-cover rounded-lg mb-4" 
            />
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Estimated Value</p>
                <p className="font-medium">${property.estimatedValue?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fractions</p>
                <p className="font-medium">{property.availableFractions} of {property.totalNFTs} available</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price per Fraction</p>
                <p className="font-medium">{property.pricePerNFT} ETH</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sold</p>
                <p className="font-medium">{property.soldNFTs} fractions</p>
              </div>
            </div>
            
            <p className="text-gray-700">{property.description}</p>
          </div>
          
          <Tabs defaultValue="initial" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="initial" disabled={isResaleFractionsSoldOut}>
                Initial Offering {isResaleFractionsSoldOut && "(Sold Out)"}
              </TabsTrigger>
              <TabsTrigger value="resale" disabled={!hasResaleOfferings}>
                Resale Offerings {!hasResaleOfferings && "(None Available)"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="initial">
              {!isResaleFractionsSoldOut ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="mb-2 text-sm font-medium">Quantity</p>
                      <Input
                        type="number"
                        min="1"
                        max={maxQuantity}
                        value={quantity}
                        onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
                        disabled={isTransacting}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="mb-2 text-sm font-medium">Total Cost</p>
                      <p className="text-lg font-semibold">
                        {(quantity * property.pricePerNFT).toFixed(6)} ETH
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={onBuyNow}
                    disabled={isTransacting || quantity < 1 || quantity > maxQuantity}
                  >
                    {isTransacting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing
                      </>
                    ) : walletConnected ? (
                      "Buy Now"
                    ) : (
                      "Connect Wallet to Buy"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">All initial offering fractions have been sold.</p>
                  {hasResaleOfferings && (
                    <Button variant="outline" className="mt-2" onClick={() => setActiveTab("resale")}>
                      Check Resale Offerings
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="resale">
              {hasResaleOfferings ? (
                <div className="space-y-4">
                  <h3 className="font-semibold mb-2">Available Resale Offerings</h3>
                  {resaleOfferings.map((offering, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <div>
                          <p className="text-sm text-gray-500">Seller</p>
                          <p className="font-medium text-xs">
                            {offering.seller.slice(0, 6)}...{offering.seller.slice(-4)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Available</p>
                          <p className="font-medium">{offering.fractions} fractions</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Price Per Fraction</p>
                          <p className="font-medium">{offering.pricePerFraction} ETH</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="1"
                            max={offering.fractions}
                            value={resaleQuantity[offering.seller] || 1}
                            onChange={(e) => handleResaleQuantityChange(
                              offering.seller, 
                              offering.fractions, 
                              e.target.value
                            )}
                            disabled={isTransacting}
                            placeholder="Quantity"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium">Total: {
                            ((resaleQuantity[offering.seller] || 1) * offering.pricePerFraction).toFixed(6)
                          } ETH</p>
                          {offering.pricePerFraction !== property.pricePerNFT && (
                            <p className={`text-xs ${offering.pricePerFraction > property.pricePerNFT ? 'text-red-500' : 'text-green-500'}`}>
                              {offering.pricePerFraction > property.pricePerNFT ? 'Premium' : 'Discount'}: {
                                (Math.abs(offering.pricePerFraction - property.pricePerNFT) / property.pricePerNFT * 100).toFixed(2)
                              }%
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm"
                          disabled={isTransacting || !resaleQuantity[offering.seller]}
                          onClick={() => onResalePurchase?.(
                            offering.seller, 
                            resaleQuantity[offering.seller] || 1, 
                            offering.pricePerFraction
                          )}
                        >
                          Buy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No resale offerings available for this property.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {isAllFractionsSoldOut && (
            <div className="mt-6 text-center">
              <p className="text-red-500 font-medium">
                This property is currently unavailable for purchase.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                All fractions have been sold and there are no resale offerings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

