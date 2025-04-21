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

// Updated ABI to match FractionalNFTMarketplace contract
const CONTRACT_ABI = [
  "function buyFraction(uint256 _tokenId, uint256 _fractions) external payable",
  "function getAllListings() external view returns (tuple(uint256 tokenId, address owner, string name, string propertyAddress, string imageUrl, string documentUrl, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)[] memory)",
  "function properties(uint256) external view returns (uint256 tokenId, address owner, string name, string propertyAddress, string imageUrl, string documentUrl, uint256 totalFractions, uint256 pricePerFraction, uint256 availableFractions, uint8 status)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)"
];

// Contract address from backend .env
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Updated property type to match contract structure
interface BlockchainProperty {
  tokenId: ethers.BigNumberish;
  owner: string;
  name: string;
  propertyAddress: string;
  imageUrl: string;
  documentUrl: string;
  totalFractions: ethers.BigNumberish;
  pricePerFraction: ethers.BigNumberish;
  availableFractions: ethers.BigNumberish;
  status: number; // 0: Pending, 1: Verified, 2: Rejected
}

// Sample properties as fallback when blockchain connection fails
const SAMPLE_PROPERTIES: Property[] = [
  {
    id: "1",
    name: "Downtown Condo",
    address: "456 Central Ave, Suite 101",
    imageUrl: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg",
    documentUrl: "ipfs://sample-doc-hash-1",
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
    name: "Suburban House",
    address: "789 Maple Street, Suburbia",
    imageUrl: "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg",
    documentUrl: "ipfs://sample-doc-hash-2",
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
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [purchaseQuantity, setPurchaseQuantity] = React.useState<number>(1);
  const { toast } = useToast();
  const router = useRouter();

  const isWalletConnected = !!walletAddress;

  // Improved property fetching with better error handling
  const fetchProperties = React.useCallback(async () => {
    try {
      console.log("Attempting to fetch properties from blockchain...");
      
      let provider;
      if (typeof window.ethereum !== 'undefined') {
        if (typeof ethers.BrowserProvider === "function") {
          console.log("Using ethers v6 BrowserProvider");
          provider = new ethers.BrowserProvider(window.ethereum);
        } else {
          console.log("Using ethers v5 Web3Provider");
          provider = new ethers.providers.Web3Provider(window.ethereum);
        }
      } else {
        console.log("No wallet provider found, using public RPC");
        const jsonRpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
        if (typeof ethers.JsonRpcProvider === "function") {
          provider = new ethers.JsonRpcProvider(jsonRpcUrl);
        } else {
          provider = new ethers.providers.JsonRpcProvider(jsonRpcUrl);
        }
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      try {
        await contract.getAllListings.staticCall();
        console.log("Contract connection test successful");
      } catch (testError: any) {
        console.error("Contract connection test failed:", testError.message);
      }
      
      console.log("Fetching property listings from contract");
      const listings: BlockchainProperty[] = await contract.getAllListings();
      console.log(`Received ${listings.length} listings from blockchain`);
      
      if (!listings || listings.length === 0) {
        console.log("No property listings found on the blockchain");
        toast({
          title: "No Properties Found",
          description: "No verified properties listed on the marketplace yet.",
          variant: "default",
        });
        setProperties([]);
        return;
      }
      
      console.log("Converting blockchain data to Property format");
      const propertiesFromChain: Property[] = listings
        .map((listing: BlockchainProperty) => {
          try {
            const pricePerFractionBigInt = BigInt(listing.pricePerFraction.toString());
            const totalFractionsBigInt = BigInt(listing.totalFractions.toString());
            const availableFractionsBigInt = BigInt(listing.availableFractions.toString());
            
            const formattedPrice = typeof ethers.formatEther === "function"
              ? ethers.formatEther(pricePerFractionBigInt)
              : ethers.utils.formatEther(pricePerFractionBigInt);
            
            const pricePerNFT = Number(formattedPrice);
            const totalNFTs = Number(totalFractionsBigInt);
            const availableFractions = Number(availableFractionsBigInt);
            const soldNFTs = totalNFTs - availableFractions;
            const estimatedValue = totalNFTs * pricePerNFT;
            
            const isValidIpfsUrl = (url: string) => url && (url.startsWith('ipfs://') || url.startsWith('https://'));
            const imageUrl = isValidIpfsUrl(listing.imageUrl) ? listing.imageUrl : SAMPLE_PROPERTIES[0].imageUrl;
            const documentUrl = isValidIpfsUrl(listing.documentUrl) ? listing.documentUrl : '';
            
            return {
              id: listing.tokenId.toString(),
              name: listing.name || `Property #${listing.tokenId.toString()}`,
              address: listing.propertyAddress || "Address not provided",
              imageUrl: imageUrl,
              documentUrl: documentUrl,
              estimatedValue: estimatedValue,
              pricePerNFT: pricePerNFT,
              totalNFTs: totalNFTs,
              soldNFTs: soldNFTs,
              type: "Fractional NFT",
              description: `${availableFractions} / ${totalNFTs} fractions available`,
              owner: listing.owner,
              availableFractions: availableFractions,
            };
          } catch (err: any) {
            console.error(`Error converting listing #${listing.tokenId.toString()} to Property format:`, err.message, listing);
            return null;
          }
        })
        .filter((p): p is Property => p !== null);
      
      console.log("Converted properties:", propertiesFromChain);
      
      if (propertiesFromChain && propertiesFromChain.length > 0) {
        setProperties(propertiesFromChain);
        toast({
          title: "Properties Loaded",
          description: `Loaded ${propertiesFromChain.length} properties from the blockchain`,
          variant: "default",
        });
      } else if (listings.length > 0) {
        console.warn("Found listings on chain, but failed to convert any to display format.");
        setProperties([]);
        toast({
          title: "Conversion Issue",
          description: "Could not display properties from blockchain due to format issues. Using sample data.",
          variant: "warning",
        });
      } else {
        setProperties([]);
      }
    } catch (error: any) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Error Loading Properties",
        description: `Failed to fetch properties: ${error.message || 'Unknown error'}. Displaying sample data.`,
        variant: "destructive",
      });
      loadSampleData();
    }
  }, [toast]);

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
    fetchProperties();
  }, [fetchProperties]);

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
      description: `Loaded ${SAMPLE_PROPERTIES.length} sample properties for testing. Connect wallet and refresh to see blockchain data.`,
      variant: "default",
    });
  };

  const filteredProperties = properties.filter((property) => {
    const nameMatch = !filters.area || property.name.toLowerCase().includes(filters.area.toLowerCase());
    const addressMatch = !filters.area || property.address.toLowerCase().includes(filters.area.toLowerCase());
    const locationMatch = !filters.area || (property.location && property.location.toLowerCase().includes(filters.area.toLowerCase()));

    return (
      property.availableFractions > 0 &&
      (!filters.area || nameMatch || addressMatch || locationMatch) &&
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
      
      <main className="flex-1 overflow-auto relative p-4">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {isWalletConnected ? (
            <>
              <Button onClick={goToInvestments} className="mr-2">My Investments</Button>
              <Button variant="outline" className="text-xs">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Button>
            </>
          ) : (
            <Button onClick={() => setShowWalletConnect(true)}>Connect Wallet</Button>
          )}
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

          <div className="mb-4 flex gap-2">
            <Button onClick={fetchProperties} variant="outline">
              Refresh Listings
            </Button>
            {process.env.NODE_ENV !== 'production' && (
              <Button onClick={loadSampleData} variant="outline">
                Load Sample Data
              </Button>
            )}
          </div>

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
              <p className="col-span-full text-center text-muted-foreground mt-8">
                No properties match the selected filters or are available for purchase. Try adjusting filters or refreshing.
              </p>
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
