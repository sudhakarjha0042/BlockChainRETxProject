"use client";

import * as React from "react";
import { Property, FilterState } from "@/types/marketplace";
import { SidebarFilters } from "@/components/sidebar-filters";
import { PropertyCard } from "@/components/property-card";
import { PropertyDetailModal } from "@/components/property-modal-detail";
import { WalletConnectModal } from "@/components/wallet-connect";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

const CONTRACT_ABI = [
  "function buyFraction(uint256 _tokenId, uint256 _fractions) external payable",
  "function getAllListings() external view returns (tuple(uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)[] memory)", // Corrected closing parenthesis
  "function properties(uint256) external view returns (uint256 tokenId, address owner, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function getPropertyResaleOfferings(uint256 _tokenId) external view returns (tuple(address seller, uint256 fractions, uint256 pricePerFraction)[] memory)"
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

interface BlockchainProperty {
  tokenId: number;
  owner: string;
  totalFractions: number;
  pricePerFraction: number;
  availableFractions: number;
  status: number;
}

const SAMPLE_PROPERTIES: Property[] = [
  {
    id: "1",
    image: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg",
    estimatedValue: 500000,
    pricePerNFT: 0.5,
    totalNFTs: 1000,
    soldNFTs: 400,
    location: "Downtown Property #1",
    type: "Fractional NFT",
    description: "600/1000 fractions available",
    owner: "0x1234567890123456789012345678901234567890",
    availableFractions: 600,
  },
  {
    id: "2",
    image: "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg",
    estimatedValue: 750000,
    pricePerNFT: 0.75,
    totalNFTs: 1000,
    soldNFTs: 250,
    location: "Suburb Property #2",
    type: "Fractional NFT",
    description: "750/1000 fractions available",
    owner: "0x1234567890123456789012345678901234567890",
    availableFractions: 750,
  }
];

export default function Marketplace() {
  const [filters, setFilters] = React.useState<FilterState>({
    area: "",
    propertyTypes: [],
    priceRange: [0, 10000000],
    nftPriceRange: [0, 1000],
  });

  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);
  const [showWalletConnect, setShowWalletConnect] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string>("");
  const [walletError, setWalletError] = React.useState<string>("");
  const [isTransacting, setIsTransacting] = React.useState(false);
  const [transaction, setTransaction] = React.useState<any>(null);
  const [properties, setProperties] = React.useState<Property[]>(SAMPLE_PROPERTIES);
  const [purchaseQuantity, setPurchaseQuantity] = React.useState<number>(1);
  const [viewResaleOfferings, setViewResaleOfferings] = React.useState<{[key: string]: any[]}>({});
  const { toast } = useToast();
  const router = useRouter();

  const isWalletConnected = !!walletAddress;

  const fetchProperties = React.useCallback(async () => {
    if (!isWalletConnected) return;

    try {
      console.log("Attempting to fetch properties from blockchain...");
      
      let provider;
      if (typeof ethers.BrowserProvider === "function") {
        console.log("Using ethers v6 BrowserProvider");
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        console.log("Using ethers v5 Web3Provider");
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }
      
      console.log("Connecting to contract at address:", CONTRACT_ADDRESS);
      console.log("Using ABI:", CONTRACT_ABI);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      try {
        await contract.properties(1);
        console.log("Contract connection test successful");
      } catch (testError) {
        console.error("Test property fetch failed:", testError);
        throw new Error("Contract connection test failed");
      }
      
      const listings = await contract.getAllListings();
      console.log("Received listings:", listings);
      
      if (!listings || listings.length === 0) {
        console.log("No property listings found on the blockchain");
        toast({
          title: "No Properties",
          description: "No property listings found on the blockchain",
          variant: "default",
        });
        return;
      }
      
      const propertiesFromChain = listings.map((listing: BlockchainProperty) => {
        try {
          const formattedPrice = typeof ethers.formatEther === "function" 
            ? ethers.formatEther(listing.pricePerFraction) 
            : ethers.utils.formatEther(listing.pricePerFraction);
          
          return {
            id: listing.tokenId.toString(),
            image: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg",
            estimatedValue: Number(listing.totalFractions) * Number(formattedPrice),
            pricePerNFT: Number(formattedPrice),
            totalNFTs: Number(listing.totalFractions),
            soldNFTs: Number(listing.totalFractions) - Number(listing.availableFractions),
            location: "Property #" + listing.tokenId.toString(),
            type: "Fractional NFT",
            description: `${listing.availableFractions}/${listing.totalFractions} fractions available`,
            owner: listing.owner,
            availableFractions: Number(listing.availableFractions),
          };
        } catch (err) {
          console.error("Error converting listing to Property format:", err, listing);
          return null;
        }
      }).filter(Boolean);
      
      console.log("Converted properties:", propertiesFromChain);
      
      let propertyResales: {[key: string]: any[]} = {};
      
      for (const property of propertiesFromChain) {
        try {
          const resaleOfferings = await contract.getPropertyResaleOfferings(property.id);
          if (resaleOfferings && resaleOfferings.length > 0) {
            propertyResales[property.id] = resaleOfferings.map((offering: any) => ({
              seller: offering.seller,
              fractions: Number(offering.fractions),
              pricePerFraction: typeof ethers.formatEther === "function" 
                ? Number(ethers.formatEther(offering.pricePerFraction)) 
                : Number(ethers.utils.formatEther(offering.pricePerFraction))
            }));
          }
        } catch (error) {
          console.log(`Contract doesn't support getPropertyResaleOfferings for property #${property.id}, checking localStorage`);
          
          const resaleKey = `resale_listing_${property.id}`;
          const localResales = JSON.parse(localStorage.getItem(resaleKey) || '[]');
          if (localResales.length > 0) {
            propertyResales[property.id] = localResales.map((item: any) => ({
              seller: item.seller,
              fractions: Number(item.fractions),
              pricePerFraction: Number(item.pricePerFraction)
            }));
          }
        }
      }
      
      setViewResaleOfferings(propertyResales);
      
      if (propertiesFromChain && propertiesFromChain.length > 0) {
        setProperties(propertiesFromChain);
        toast({
          title: "Success",
          description: `Loaded ${propertiesFromChain.length} properties from blockchain`,
          variant: "default",
        });
      } else {
        throw new Error("No valid properties found after conversion");
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      
      toast({
        title: "Error",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? `Failed to fetch properties: ${error.message}` 
          : "Failed to fetch properties from blockchain. Check console for details.",
        variant: "destructive",
      });
      
      toast({
        title: "Tip",
        description: "You can use 'Load Sample Data' to test with sample properties.",
        variant: "default",
      });
    }
  }, [isWalletConnected, toast]);

  const purchaseFromResale = async (propertyId: string, seller: string, quantity: number, pricePerFraction: number) => {
    if (!isWalletConnected) {
      setShowWalletConnect(true);
      return;
    }
    
    setIsTransacting(true);
    
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
      
      const extendedABI = [
        ...CONTRACT_ABI,
        "function buyResaleFraction(uint256 _tokenId, address _seller, uint256 _fractions) external payable"
      ];
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, extendedABI, signer);
      
      let totalPrice;
      if (typeof ethers.parseEther === "function") {
        totalPrice = ethers.parseEther((pricePerFraction * quantity).toString());
      } else {
        totalPrice = ethers.utils.parseEther((pricePerFraction * quantity).toString());
      }
      
      try {
        const tx = await contract.buyResaleFraction(propertyId, seller, quantity, { value: totalPrice });
        
        toast({
          title: "Transaction Submitted",
          description: `Transaction hash: ${tx.hash}`,
        });
        
        const receipt = await tx.wait();
        
        recordPurchase(propertyId, quantity);
        
        toast({
          title: "Purchase Successful!",
          description: `You have successfully purchased ${quantity} fraction(s) of property #${propertyId} from resale`,
          variant: "success",
        });
      } catch (error) {
        console.warn("Contract doesn't support buyResaleFraction, using localStorage simulation");
        
        simulateResalePurchase(propertyId, seller, quantity, pricePerFraction);
        
        toast({
          title: "Purchase Simulated",
          description: `Simulated purchase of ${quantity} fraction(s) of property #${propertyId} from resale`,
          variant: "success",
        });
      }
      
      fetchProperties();
      
    } catch (error) {
      console.error("Error purchasing from resale:", error);
      toast({
        title: "Transaction Failed",
        description: "Failed to purchase from resale",
        variant: "destructive",
      });
    } finally {
      setIsTransacting(false);
    }
  };

  const simulateResalePurchase = (propertyId: string, seller: string, quantity: number, pricePerFraction: number) => {
    if (!walletAddress) return;
    
    const buyerKey = `fraction_ownership_${walletAddress.toLowerCase()}_${propertyId}`;
    const buyerOwnership = parseInt(localStorage.getItem(buyerKey) || "0");
    localStorage.setItem(buyerKey, (buyerOwnership + quantity).toString());
    
    const resaleKey = `resale_listing_${propertyId}`;
    const resaleListings = JSON.parse(localStorage.getItem(resaleKey) || "[]");
    
    const updatedListings = resaleListings.map((listing: any) => {
      if (listing.seller.toLowerCase() === seller.toLowerCase() && 
          listing.pricePerFraction === pricePerFraction) {
        return {
          ...listing,
          fractions: listing.fractions - quantity
        };
      }
      return listing;
    }).filter((listing: any) => listing.fractions > 0);
    
    localStorage.setItem(resaleKey, JSON.stringify(updatedListings));
    
    const historyKey = `transaction_history_${propertyId}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    
    history.push({
      buyer: walletAddress,
      seller: seller,
      fractions: quantity,
      pricePerFraction: pricePerFraction,
      timestamp: Date.now()
    });
    
    localStorage.setItem(historyKey, JSON.stringify(history));
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        setWalletError("MetaMask is not installed. Please install it from metamask.io");
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

      setWalletAddress(address);
      setWalletError("");
      console.log("Wallet connected:", address);
      
      if (showWalletConnect) {
        setShowWalletConnect(false);
      }
    } catch (err) {
      console.error(err);
      setWalletError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  React.useEffect(() => {
    if (isWalletConnected) {
      fetchProperties();
    }
  }, [isWalletConnected, fetchProperties]);

  const purchasePropertyNFT = async (property: Property, quantity: number = 1) => {
    if (!property || !isWalletConnected) return;
    setIsTransacting(true);
    
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
      
      let totalPrice;
      if (typeof ethers.parseEther === "function") {
        totalPrice = ethers.parseEther(
          (property.pricePerNFT * quantity).toString()
        );
      } else if (ethers.utils && typeof ethers.utils.parseEther === "function") {
        totalPrice = ethers.utils.parseEther(
          (property.pricePerNFT * quantity).toString()
        );
      } else {
        throw new Error("Unable to use ethers.parseEther or ethers.utils.parseEther");
      }
      
      const tx = await contract.buyFraction(property.id, quantity, { value: totalPrice });
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash}`,
      });
      
      const receipt = await tx.wait();
      
      setTransaction({
        hash: receipt.transactionHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
      });
      
      recordPurchase(property.id, quantity);
      
      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased ${quantity} fraction(s) of property #${property.id}`,
        variant: "success",
      });
      
      fetchProperties();

      setSelectedProperty(null);
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to purchase property NFT",
        variant: "destructive",
      });
    } finally {
      setIsTransacting(false);
    }
  };

  const recordPurchase = (propertyId: string, fractions: number) => {
    if (!walletAddress) return;
    
    const storageKey = `fraction_ownership_${walletAddress.toLowerCase()}_${propertyId}`;
    const existingOwnership = localStorage.getItem(storageKey);
    const newOwnership = existingOwnership ? (parseInt(existingOwnership) + fractions) : fractions;
    
    localStorage.setItem(storageKey, newOwnership.toString());
    console.log(`Recorded purchase of ${fractions} fractions of property #${propertyId}`);
  };

  const handleBuyNow = () => {
    if (!selectedProperty) return;
    
    if (isWalletConnected) {
      purchasePropertyNFT(selectedProperty, purchaseQuantity);
    } else {
      setShowWalletConnect(true);
    }
  };

  const goToInvestments = () => {
    router.push("/investments");
  };

  const loadSampleData = () => {
    setProperties(SAMPLE_PROPERTIES);
    toast({
      title: "Sample Data Loaded",
      description: `Loaded ${SAMPLE_PROPERTIES.length} sample properties for testing`,
      variant: "default",
    });
  };

  const filteredProperties = properties.filter((property) => {
    return (
      property.availableFractions > 0 &&
      (!filters.area || property.location.includes(filters.area)) &&
      (filters.propertyTypes.length === 0 || filters.propertyTypes.includes(property.type)) &&
      property.estimatedValue >= filters.priceRange[0] &&
      property.estimatedValue <= filters.priceRange[1] &&
      property.pricePerNFT >= filters.nftPriceRange[0] &&
      property.pricePerNFT <= filters.nftPriceRange[1]
    );
  });

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarFilters filters={filters} onFilterChange={setFilters} />
      
      <main className="flex-1 overflow-auto relative">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {isWalletConnected ? (
            <>
              <Button onClick={goToInvestments} className="mr-2">My Investments</Button>
              <Button variant="outline" className="text-xs">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Button>
            </>
          ) : (
            <Button onClick={connectWallet}>Connect Wallet</Button>
          )}
          {walletError && <p className="text-red-500 text-xs mt-1">{walletError}</p>}
        </div>

        <div className="container mx-auto py-8 px-4">
          <h1 className="mb-6 text-3xl font-bold">Property Marketplace</h1>

          {transaction && (
            <div className="mb-6 p-4 border rounded-lg bg-green-50">
              <h3 className="font-semibold">Latest Transaction</h3>
              <p className="text-sm">Hash: {transaction.hash}</p>
              <p className="text-sm">Status: {transaction.status ? "Success" : "Failed"}</p>
              <p className="text-sm">Block: {transaction.blockNumber}</p>
            </div>
          )}

          {process.env.NODE_ENV !== 'production' && (
            <Button onClick={loadSampleData} variant="outline" className="mb-4">
              Load Sample Data
            </Button>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => setSelectedProperty(property)}
                />
              ))
            ) : (
              <p>No properties match the selected filters or are available for purchase.</p>
            )}
          </div>
        </div>
      </main>

      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onBuyNow={handleBuyNow}
        walletConnected={isWalletConnected}
        isTransacting={isTransacting}
        quantity={purchaseQuantity}
        onQuantityChange={setPurchaseQuantity}
        maxQuantity={selectedProperty?.availableFractions || 0}
        resaleOfferings={selectedProperty ? viewResaleOfferings[selectedProperty.id] || [] : []}
        onResalePurchase={(seller, quantity, price) => {
          if (selectedProperty) {
            purchaseFromResale(selectedProperty.id, seller, quantity, price);
          }
        }}
      />

      {showWalletConnect && (
        <WalletConnectModal
          onClose={() => setShowWalletConnect(false)}
          onConnect={connectWallet}
        />
      )}
    </div>
  );
}
