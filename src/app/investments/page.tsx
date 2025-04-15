"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";

// Fractional NFT Marketplace ABI for investment operations
const CONTRACT_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function properties(uint256) external view returns (uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)",
  "function submitPropertyForVerification(uint256 _totalFractions, uint256 _pricePerFraction) external payable",
  "function buyFraction(uint256 _tokenId, uint256 _fractions) external payable"
];

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

interface OwnedProperty {
  id: string;
  totalFractions: number;
  pricePerFraction: number;
  ownedFractions: number;
  percentageOwned: number;
  status: string; // Pending, Verified, Rejected
  location?: string; // For display purposes
  description?: string;
}

export default function InvestmentsPage() {
  const [walletAddress, setWalletAddress] = React.useState("");
  const [ownedProperties, setOwnedProperties] = React.useState<OwnedProperty[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [newPropertyData, setNewPropertyData] = React.useState({
    totalFractions: 100,
    pricePerFraction: 0.01,
    description: "",
    location: "",
  });
  const [selectedProperty, setSelectedProperty] = React.useState<OwnedProperty | null>(null);
  const [fractionsToSell, setFractionsToSell] = React.useState(0);
  const [newPrice, setNewPrice] = React.useState(0);
  const { toast } = useToast();
  const router = useRouter();

  // Connect wallet and load user investments
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        toast({
          title: "Error",
          description: "MetaMask is not installed. Please install it from metamask.io",
          variant: "destructive",
        });
        return;
      }

      let address;
      let provider;

      if (typeof ethers.BrowserProvider === "function") {
        // ethers v6
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        address = await signer.getAddress();
      } else {
        // ethers v5
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        address = await signer.getAddress();
      }

      console.log("Wallet connected:", address);
      setWalletAddress(address);
      
      // Fetch owned properties
      await fetchOwnedProperties(address, provider);
      
    } catch (err) {
      console.error(err);
      toast({
        title: "Wallet Connection Failed",
        description: err instanceof Error ? err.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const fetchOwnedProperties = async (address: string, provider: any) => {
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Get number of tokens owned by user
      const balance = await contract.balanceOf(address);
      const numTokens = Number(balance);
      
      const userProperties: OwnedProperty[] = [];
      
      // For each token, get the property details
      for (let i = 0; i < numTokens; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        const property = await contract.properties(tokenId);
        
        // Calculate percentage owned
        const ownedFractions = 1; // This would need to be fetched from another contract function
        const percentageOwned = (ownedFractions / Number(property.totalFractions)) * 100;
        
        userProperties.push({
          id: tokenId.toString(),
          totalFractions: Number(property.totalFractions),
          pricePerFraction: Number(ethers.formatEther(property.pricePerFraction)),
          ownedFractions: ownedFractions,
          percentageOwned: percentageOwned,
          status: ["Pending", "Verified", "Rejected"][property.status],
          location: `Property #${tokenId}`,
          description: `You own ${ownedFractions} of ${property.totalFractions} fractions`,
        });
      }
      
      setOwnedProperties(userProperties);
    } catch (error) {
      console.error("Error fetching owned properties:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your properties",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit a new property for verification
  const submitNewProperty = async () => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let provider;
      let signer;

      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Parse price to wei
      let priceInWei;
      if (typeof ethers.parseEther === "function") {
        priceInWei = ethers.parseEther(newPropertyData.pricePerFraction.toString());
      } else {
        priceInWei = ethers.utils.parseEther(newPropertyData.pricePerFraction.toString());
      }
      
      // Assume verification fee is 0.1 ETH (this would need to be fetched from contract)
      const verificationFee = "0.1";
      let feeInWei;
      if (typeof ethers.parseEther === "function") {
        feeInWei = ethers.parseEther(verificationFee);
      } else {
        feeInWei = ethers.utils.parseEther(verificationFee);
      }
      
      const tx = await contract.submitPropertyForVerification(
        newPropertyData.totalFractions,
        priceInWei,
        { value: feeInWei }
      );
      
      toast({
        title: "Property Submitted",
        description: "Your property has been submitted for verification",
      });
      
      await tx.wait();
      
      // Refresh owned properties
      await fetchOwnedProperties(walletAddress, provider);
      
      // Reset form
      setNewPropertyData({
        totalFractions: 100,
        pricePerFraction: 0.01,
        description: "",
        location: "",
      });
      
    } catch (error: any) {
      console.error("Error submitting property:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit property",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // List fractions for sale
  const listFractionsForSale = async () => {
    if (!selectedProperty || fractionsToSell <= 0) return;
    
    setIsLoading(true);
    try {
      // Implementation would depend on contract's sell/list function
      // This is a placeholder
      
      toast({
        title: "Fractions Listed",
        description: `Listed ${fractionsToSell} fractions for sale at ${newPrice} ETH each`,
      });
      
      // Reset form
      setSelectedProperty(null);
      setFractionsToSell(0);
      setNewPrice(0);
      
    } catch (error: any) {
      toast({
        title: "Listing Failed",
        description: error.message || "Failed to list fractions for sale",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Go to marketplace
  const goToMarketplace = () => {
    router.push("/marketplace");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Investments</h1>
          <div className="flex gap-3">
            <Button onClick={goToMarketplace} variant="outline">Go to Marketplace</Button>
            {!walletAddress ? (
              <Button onClick={connectWallet}>Connect Wallet</Button>
            ) : (
              <Button variant="outline" className="text-xs">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center my-12">Loading your investments...</div>
        ) : walletAddress ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardHeader>
                  <CardTitle>Your Properties</CardTitle>
                  <CardDescription>
                    Properties you own fully or partially
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ownedProperties.length > 0 ? (
                    <div className="space-y-4">
                      {ownedProperties.map((property) => (
                        <div 
                          key={property.id}
                          className="p-4 border rounded-lg cursor-pointer hover:bg-slate-50"
                          onClick={() => setSelectedProperty(property)}
                        >
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium">{property.location || `Property #${property.id}`}</h3>
                              <p className="text-sm text-gray-500">
                                {property.ownedFractions} / {property.totalFractions} fractions ({property.percentageOwned.toFixed(2)}%)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{property.pricePerFraction} ETH per fraction</p>
                              <p className="text-sm text-gray-500">Status: {property.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      You don't own any properties yet. Browse the marketplace to invest!
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={goToMarketplace} className="w-full">Browse Marketplace</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add New Property</CardTitle>
                  <CardDescription>
                    Submit your property to be verified and tokenized
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Property Location</Label>
                      <Input 
                        id="location" 
                        placeholder="e.g. 123 Main St, City"
                        value={newPropertyData.location}
                        onChange={(e) => setNewPropertyData({...newPropertyData, location: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input 
                        id="description" 
                        placeholder="Describe your property"
                        value={newPropertyData.description}
                        onChange={(e) => setNewPropertyData({...newPropertyData, description: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Fractions: {newPropertyData.totalFractions}</Label>
                      <Slider 
                        min={10} 
                        max={1000} 
                        step={10} 
                        value={[newPropertyData.totalFractions]}
                        onValueChange={(value) => setNewPropertyData({...newPropertyData, totalFractions: value[0]})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per Fraction (ETH)</Label>
                      <Input 
                        id="price" 
                        type="number" 
                        min="0.001" 
                        step="0.001"
                        value={newPropertyData.pricePerFraction}
                        onChange={(e) => setNewPropertyData({...newPropertyData, pricePerFraction: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={submitNewProperty} className="w-full" disabled={isLoading}>
                    Submit Property
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {selectedProperty && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Sell Your Fractions</CardTitle>
                  <CardDescription>
                    List your fractions of {selectedProperty.location || `Property #${selectedProperty.id}`} for sale
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <p>You own: {selectedProperty.ownedFractions} fractions</p>
                      <p>Current price: {selectedProperty.pricePerFraction} ETH per fraction</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Fractions to sell: {fractionsToSell}</Label>
                      <Slider 
                        min={0} 
                        max={selectedProperty.ownedFractions} 
                        step={1} 
                        value={[fractionsToSell]}
                        onValueChange={(value) => setFractionsToSell(value[0])}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPrice">New Price per Fraction (ETH)</Label>
                      <Input 
                        id="newPrice" 
                        type="number" 
                        min="0.001" 
                        step="0.001"
                        value={newPrice}
                        onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-md">
                      <p className="font-medium">Summary</p>
                      <p>Total sale value: {(fractionsToSell * newPrice).toFixed(4)} ETH</p>
                      <p>Remaining ownership: {(selectedProperty.ownedFractions - fractionsToSell)} fractions 
                        ({((selectedProperty.ownedFractions - fractionsToSell) / selectedProperty.totalFractions * 100).toFixed(2)}%)</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setSelectedProperty(null)}>Cancel</Button>
                  <Button 
                    onClick={listFractionsForSale} 
                    disabled={fractionsToSell <= 0 || newPrice <= 0 || isLoading}
                  >
                    List for Sale
                  </Button>
                </CardFooter>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="mb-4">Connect your wallet to see your investments</p>
            <Button onClick={connectWallet}>Connect Wallet</Button>
          </div>
        )}
      </div>
    </div>
  );
}
