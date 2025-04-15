"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WalletConnectModalProps {
  onClose: () => void;
}

export function WalletConnectModal({ onClose }: WalletConnectModalProps) {
  const router = useRouter();

  const wallets = [
    { name: "MetaMask", icon: "🦊" },
    { name: "Coinbase Wallet", icon: "💰" },
    { name: "WalletConnect", icon: "🔗" },
  ];

  const handleConnect = (walletName: string) => {
    if (walletName === "MetaMask") {
      console.log("MetaMask selected in modal...");
      router.push("../wallet-connect"); // Navigate to wallet-connect.tsx
      onClose(); // Close modal after selection
    } else {
      console.log(`Connecting to ${walletName}...`);
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <div className="flex flex-col gap-4 py-4">
          {wallets.map((wallet) => (
            <Button
              key={wallet.name}
              variant="outline"
              className="flex items-center justify-start gap-2 text-left text-lg"
              onClick={() => handleConnect(wallet.name)}
            >
              <span className="text-2xl">{wallet.icon}</span>
              {wallet.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}