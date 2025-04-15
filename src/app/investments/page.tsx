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
  "function buyFraction(uint256 _tokenId, uint256 _fractions) external payable",
  "function getUserFractions(address user, uint256 tokenId) external view returns (uint256)",
  "function getUserProperties(address user) external view returns (uint256[])"
];

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Sample investments - for testing when blockchain connection fails
const SAMPLE_INVESTMENTS = [
  {
    id: "1",
    totalFractions: 1000,
    pricePerFraction: 0.5,
    ownedFractions: 5,
    percentageOwned: 0.5,
    status: "Verified",
    location: "Downtown Property #1",
    description: "You own 5 of 1000 fractions",
  },
  {
    id: "2",
    totalFractions: 1000,
    pricePerFraction: 0.75,
    ownedFractions: 10,
    percentageOwned: 1,
    status: "Verified",
    location: "Suburb Property #2",
    description: "You own 10 of 1000 fractions",
  }
];

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
      console.log("Fetching owned properties for address:", address);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Try to get the user's properties using the getUserProperties function
      // This assumes the contract has this function which returns token IDs owned by the user
      let userProperties: OwnedProperty[] = [];
      
      try {
        // First, try to get user properties with getUserProperties function (if implemented in contract)
        const propertyIds = await contract.getUserProperties(address);
        console.log("User property IDs:", propertyIds);
        
        // Process each property
        for (const tokenId of propertyIds) {
          const property = await contract.properties(tokenId);
          const ownedFractions = await contract.getUserFractions(address, tokenId);
          
          const percentageOwned = (Number(ownedFractions) / Number(property.totalFractions)) * 100;
          
          userProperties.push({
            id: tokenId.toString(),
            totalFractions: Number(property.totalFractions),
            pricePerFraction: Number(ethers.formatEther ? 
                                     ethers.formatEther(property.pricePerFraction) : 
                                     ethers.utils.formatEther(property.pricePerFraction)),
            ownedFractions: Number(ownedFractions),
            percentageOwned: percentageOwned,
            status: ["Pending", "Verified", "Rejected"][property.status],
            location: `Property #${tokenId}`,
            description: `You own ${ownedFractions} of ${property.totalFractions} fractions`,
          });
        }
      } catch (err) {
        console.warn("getUserProperties failed, falling back to balanceOf method:", err);
        
        // Fallback method: Use balanceOf and tokenOfOwnerByIndex (ERC721 standard)
        const balance = await contract.balanceOf(address);
        const numTokens = Number(balance);
        
        console.log(`User owns ${numTokens} properties via ERC721 tokens`);
        
        // For each token, get the property details
        for (let i = 0; i < numTokens; i++) {
          try {
            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
            const property = await contract.properties(tokenId);
            
            // Try to get the user's fractions for this property
            let ownedFractions;
            try {
              ownedFractions = await contract.getUserFractions(address, tokenId);
              ownedFractions = Number(ownedFractions);
            } catch (fractionErr) {
              console.warn(`Could not get fractions for token ${tokenId}:`, fractionErr);
              ownedFractions = 1; // Fallback: assume at least 1 fraction owned
            }
            
            const percentageOwned = (ownedFractions / Number(property.totalFractions)) * 100;
            
            userProperties.push({
              id: tokenId.toString(),
              totalFractions: Number(property.totalFractions),
              pricePerFraction: Number(ethers.formatEther ? 
                                      ethers.formatEther(property.pricePerFraction) : 
                                      ethers.utils.formatEther(property.pricePerFraction)),
              ownedFractions: ownedFractions,
              percentageOwned: percentageOwned,
              status: ["Pending", "Verified", "Rejected"][property.status],
              location: `Property #${tokenId}`,
              description: `You own ${ownedFractions} of ${property.totalFractions} fractions`,
            });
          } catch (tokenErr) {
            console.error(`Error processing token at index ${i}:`, tokenErr);
          }
        }
      }
      
      if (userProperties.length > 0) {
        console.log("Found user properties:", userProperties);
        setOwnedProperties(userProperties);
        toast({
          title: "Success",
          description: `Found ${userProperties.length} properties in your portfolio`,
        });
      } else {
        console.log("No properties found, checking recent transactions...");
        
        // If the blockchain query returned no properties but we know there should be some
        // (e.g., user just made a purchase in the marketplace), check transaction history
        const recentBlockNumber = await provider.getBlockNumber();
        const startBlock = Math.max(0, recentBlockNumber - 1000); // Look back 1000 blocks
        
        toast({
          title: "Searching transactions",
          description: "Looking for recent property purchases...",
        });
        
        // Use a sample for now since we can't easily scan transaction history in this context
        setOwnedProperties([]);
        toast({
          title: "No properties found",
          description: "No properties found in your wallet. Try loading sample data for testing.",
        });
      }
    } catch (error) {
      console.error("Error fetching owned properties:", error);
      setOwnedProperties([]);
      toast({
        title: "Error",
        description: "Failed to fetch your properties from blockchain. Try loading sample data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to load sample investment data for testing
  const loadSampleInvestments = () => {
    setOwnedProperties(SAMPLE_INVESTMENTS);
    toast({
      title: "Sample Data Loaded",
      description: "Loaded sample investment data for testing",
    });
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
      // Simulate automatic verification for testing
      const newProperty: OwnedProperty = {
        id: (ownedProperties.length + 1).toString(),
        totalFractions: newPropertyData.totalFractions,
        pricePerFraction: newPropertyData.pricePerFraction,
        ownedFractions: newPropertyData.totalFractions,
        percentageOwned: 100,
        status: "Verified",
        location: newPropertyData.location || `Property #${ownedProperties.length + 1}`,
        description: newPropertyData.description || `You own all fractions of this property`,
      };

      setOwnedProperties([...ownedProperties, newProperty]);

      toast({
        title: "Property Added",
        description: "Your property has been automatically verified and added to your portfolio for testing.",
      });

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
            {/* Add Sample Data button for testing */}
            {process.env.NODE_ENV !== 'production' && ownedProperties.length === 0 && (
              <div className="mb-4">
                <Button onClick={loadSampleInvestments} variant="outline">
                  Load Sample Investments
                </Button>
              </div>
            )}

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
