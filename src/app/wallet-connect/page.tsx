"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import { Label } from "@/components/ui";
import { Diamond } from "lucide-react";

export default function WalletConnect() {
  const router = useRouter();
  const [isIndian, setIsIndian] = useState(false);
  const [residesInIndia, setResidesInIndia] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");

  const connectWallet = async () => {
    if (!isIndian || !residesInIndia) {
      setError("You must be Indian and reside in India to continue");
      return;
    }

    try {
      if (typeof window.ethereum === "undefined") {
        setError(
          "MetaMask is not installed. Please install it from https://metamask.io/download.html"
        );
        return;
      }

      console.log("Requesting accounts...");
      // Create provider using the appropriate ethers version method
      let signer;
      let address;
      
      // This works for both ethers v5 and v6
      if (typeof ethers.BrowserProvider === 'function') {
        // ethers v6 approach
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        address = await signer.getAddress();
      } else {
        // ethers v5 approach
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        address = await signer.getAddress();
      }

      console.log("Wallet connected:", address);
      setWalletAddress(address);
      setError(""); // Clear any previous error messages
      router.push("/marketplace");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Diamond className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold ml-2">RETx</span>
          </div>
          <CardTitle className="text-2xl text-center">
            Connect Your Wallet
          </CardTitle>
          <CardDescription className="text-center">
            Please verify your eligibility and connect your wallet to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="indian"
                checked={isIndian}
                onCheckedChange={(checked) => setIsIndian(checked as boolean)}
              />
              <Label htmlFor="indian">I am Indian</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="residence"
                checked={residesInIndia}
                onCheckedChange={(checked) =>
                  setResidesInIndia(checked as boolean)
                }
              />
              <Label htmlFor="residence">I reside in India</Label>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}

          <Button
            className="w-full"
            onClick={connectWallet}
            disabled={!isIndian || !residesInIndia}
          >
            Connect Wallet
          </Button>

          {walletAddress && (
            <div className="text-sm text-center text-muted-foreground">
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
