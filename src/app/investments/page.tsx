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
import { Loader2 } from "lucide-react";

// Import the full ABI from deploymentInfo.json to ensure compatibility
// We'll create a compatibility ABI with only the functions we use
const COMPATIBLE_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function properties(uint256) external view returns (uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)",
  "function totalSupply() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function submitPropertyForVerification(uint256 _totalFractions, uint256 _pricePerFraction) external payable",
  "function verifyProperty(uint256 tokenId, bool approve) external",
  "function nextTokenId() external view returns (uint256)",
  "function getAllListings() external view returns (tuple(uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)[] memory)"
];

// Contract address from backend .env
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Add verification fee constant from the contract's initialValue (0.01 ETH)
const VERIFICATION_FEE = "10000000000000000"; // 0.01 ETH in wei

// Sample investments for testing when blockchain connection fails
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
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [manualPropertyId, setManualPropertyId] = React.useState("");
  const [isCheckingProperty, setIsCheckingProperty] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        address = await signer.getAddress();
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        address = await signer.getAddress();
      }

      console.log("Wallet connected:", address);
      setWalletAddress(address);
      
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
      console.log("Using contract address:", CONTRACT_ADDRESS);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, COMPATIBLE_ABI, provider);
      
      try {
        await contract.totalSupply();
        console.log("Contract connection successful");
      } catch (testError) {
        console.error("Contract connection test failed:", testError);
        throw new Error("Failed to connect to contract. Check ABI and address.");
      }
      
      let userProperties: OwnedProperty[] = [];
      
      try {
        console.log("Checking if user owns any property tokens directly...");
        const balance = await contract.balanceOf(address);
        const numTokens = Number(balance);
        console.log(`User directly owns ${numTokens} property tokens`);
        
        for (let i = 0; i < numTokens; i++) {
          try {
            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
            console.log(`User owns token ID: ${tokenId}`);
            
            const property = await contract.properties(tokenId);
            const tokenIdStr = tokenId.toString();
            
            let pricePerFraction;
            if (typeof ethers.formatEther === "function") {
              pricePerFraction = Number(ethers.formatEther(property.pricePerFraction));
            } else {
              pricePerFraction = Number(ethers.utils.formatEther(property.pricePerFraction));
            }
            
            userProperties.push({
              id: tokenIdStr,
              totalFractions: Number(property.totalFractions),
              pricePerFraction: pricePerFraction,
              ownedFractions: Number(property.availableFractions),
              percentageOwned: (Number(property.availableFractions) / Number(property.totalFractions)) * 100,
              status: ["Pending", "Verified", "Rejected"][property.status] || "Unknown",
              location: `Property #${tokenIdStr}`,
              description: `You own ${property.availableFractions} of ${property.totalFractions} fractions`,
            });
          } catch (err) {
            console.error(`Error processing token at index ${i}:`, err);
          }
        }
      } catch (err) {
        console.warn("Error checking direct token ownership:", err);
      }
      
      if (userProperties.length === 0) {
        try {
          console.log("Checking marketplace listings for fractional ownership...");
          const totalSupply = await contract.totalSupply();
          
          for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
            try {
              const primaryOwner = await contract.ownerOf(tokenId);
              const isPrimaryOwner = primaryOwner.toLowerCase() === address.toLowerCase();
              
              const property = await contract.properties(tokenId);
              
              const storageKey = `fraction_ownership_${address.toLowerCase()}_${tokenId}`;
              const storedOwnership = localStorage.getItem(storageKey);
              let ownedFractions = 0;
              
              if (isPrimaryOwner) {
                ownedFractions = Number(property.availableFractions);
              } else if (storedOwnership) {
                ownedFractions = parseInt(storedOwnership);
              }
              
              if (ownedFractions > 0) {
                console.log(`Found ownership for property #${tokenId}: ${ownedFractions} fractions`);
                
                let pricePerFraction;
                if (typeof ethers.formatEther === "function") {
                  pricePerFraction = Number(ethers.formatEther(property.pricePerFraction));
                } else {
                  pricePerFraction = Number(ethers.utils.formatEther(property.pricePerFraction));
                }
                
                userProperties.push({
                  id: tokenId.toString(),
                  totalFractions: Number(property.totalFractions),
                  pricePerFraction: pricePerFraction,
                  ownedFractions: ownedFractions,
                  percentageOwned: (ownedFractions / Number(property.totalFractions)) * 100,
                  status: ["Pending", "Verified", "Rejected"][property.status] || "Unknown",
                  location: `Property #${tokenId}`,
                  description: `You own ${ownedFractions} of ${property.totalFractions} fractions`,
                });
              }
            } catch (err) {
              console.log(`Property #${tokenId} doesn't exist or error:`, err);
            }
          }
        } catch (err) {
          console.warn("Error checking all properties:", err);
        }
      }
      
      if (userProperties.length > 0) {
        console.log("Final properties found:", userProperties);
        setOwnedProperties(userProperties);
        toast({
          title: "Properties Found",
          description: `Found ${userProperties.length} properties in your portfolio`,
          variant: "success",
        });
      } else {
        console.log("No properties found via automatic detection");
        setOwnedProperties([]);
        toast({
          title: "No Properties Found",
          description: "No properties found automatically. Try using the 'Lookup Property' option below.",
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Error fetching owned properties:", error);
      setOwnedProperties([]);
      toast({
        title: "Error",
        description: "Failed to fetch your properties. Try the manual lookup option below.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const checkPropertyById = async () => {
    if (!walletAddress || !manualPropertyId) {
      toast({
        title: "Error",
        description: "Please connect your wallet and enter a property ID",
        variant: "destructive",
      });
      return;
    }
    
    setIsCheckingProperty(true);
    
    try {
      const propertyId = parseInt(manualPropertyId);
      if (isNaN(propertyId) || propertyId <= 0) {
        throw new Error("Please enter a valid property ID (positive number)");
      }
      
      let provider;
      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, COMPATIBLE_ABI, provider);
      
      const property = await contract.properties(propertyId);
      console.log(`Property #${propertyId} details:`, property);
      
      const isPrimaryOwner = property.owner.toLowerCase() === walletAddress.toLowerCase();
      
      const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${propertyId}`;
      const storedOwnership = localStorage.getItem(storageKey);
      
      let ownedFractions = 0;
      
      if (isPrimaryOwner) {
        ownedFractions = Number(property.availableFractions);
      } else if (storedOwnership) {
        ownedFractions = parseInt(storedOwnership);
      }
      
      if (ownedFractions === 0) {
        const userInput = prompt(`Enter how many fractions of Property #${propertyId} you own:`);
        if (userInput && !isNaN(parseInt(userInput)) && parseInt(userInput) > 0) {
          ownedFractions = parseInt(userInput);
          localStorage.setItem(storageKey, ownedFractions.toString());
        }
      }
      
      if (ownedFractions > 0) {
        let pricePerFraction;
        if (typeof ethers.formatEther === "function") {
          pricePerFraction = Number(ethers.formatEther(property.pricePerFraction));
        } else {
          pricePerFraction = Number(ethers.utils.formatEther(property.pricePerFraction));
        }
        
        const totalFractions = Number(property.totalFractions);
        const percentageOwned = (ownedFractions / totalFractions) * 100;
        
        const newProperty = {
          id: propertyId.toString(),
          totalFractions: totalFractions,
          pricePerFraction: pricePerFraction,
          ownedFractions: ownedFractions,
          percentageOwned: percentageOwned,
          status: ["Pending", "Verified", "Rejected"][property.status] || "Unknown",
          location: `Property #${propertyId}`,
          description: `You own ${ownedFractions} of ${totalFractions} fractions`,
        };
        
        const exists = ownedProperties.some(p => p.id === propertyId.toString());
        
        if (!exists) {
          setOwnedProperties([...ownedProperties, newProperty]);
          toast({
            title: "Property Added",
            description: `Property #${propertyId} added to your portfolio with ${ownedFractions} fractions`,
            variant: "success",
          });
        } else {
          const updated = ownedProperties.map(p => 
            p.id === propertyId.toString() ? newProperty : p
          );
          setOwnedProperties(updated);
          toast({
            title: "Property Updated",
            description: `Property #${propertyId} updated with ${ownedFractions} fractions`,
            variant: "success",
          });
        }
      } else {
        toast({
          title: "No Ownership Found",
          description: `You don't appear to own any fractions of Property #${propertyId}`,
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Error checking property:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check property",
        variant: "destructive",
      });
    } finally {
      setIsCheckingProperty(false);
      setManualPropertyId("");
    }
  };
  
  const refreshProperties = async () => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsRefreshing(true);
    toast({
      title: "Refreshing",
      description: "Checking blockchain for your properties...",
    });
    
    try {
      let provider;
      if (typeof ethers.BrowserProvider === "function") {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }
      
      await fetchOwnedProperties(walletAddress, provider);
    } catch (error) {
      console.error("Error refreshing properties:", error);
      setIsRefreshing(false);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh properties. Try connecting your wallet again.",
        variant: "destructive",
      });
    }
  };

  const loadSampleInvestments = () => {
    setOwnedProperties(SAMPLE_INVESTMENTS);
    toast({
      title: "Sample Data Loaded",
      description: "Loaded sample investment data for testing",
    });
  };

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
              <div className="flex gap-2">
                <Button 
                  onClick={refreshProperties} 
                  variant="outline" 
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    "Refresh Properties"
                  )}
                </Button>
                <Button variant="outline" className="text-xs">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center my-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your investments...</p>
          </div>
        ) : walletAddress ? (
          <>
            {process.env.NODE_ENV !== 'production' && (
              <div className="mb-4 flex gap-2">
                <Button onClick={loadSampleInvestments} variant="outline">
                  Load Sample Investments
                </Button>
                <Button 
                  onClick={() => {
                    console.log("Current state:", {
                      walletAddress,
                      ownedProperties,
                      CONTRACT_ADDRESS,
                      COMPATIBLE_ABI
                    });
                    toast({
                      title: "Debug Info Logged",
                      description: "Check browser console for detailed state information",
                    });
                  }} 
                  variant="outline"
                >
                  Log Debug Info
                </Button>
              </div>
            )}

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Property Lookup</CardTitle>
                <CardDescription>
                  Manually check a property you own by ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter property ID (e.g. 3)"
                    value={manualPropertyId}
                    onChange={(e) => setManualPropertyId(e.target.value)}
                  />
                  <Button 
                    onClick={checkPropertyById}
                    disabled={isCheckingProperty || !manualPropertyId}
                  >
                    {isCheckingProperty ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking
                      </>
                    ) : (
                      "Check Property"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  If you know you own fractions of a property, enter its ID above to add it to your portfolio
                </p>
              </CardContent>
            </Card>

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
                  <Button className="w-full" disabled={isLoading}>
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
