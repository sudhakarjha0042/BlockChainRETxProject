import React from "react";
import { Wallet, Search, FileSignature, Key } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    description: "Connect your Web3 wallet directly from the site header.", // Updated description
  },
  {
    icon: Search,
    title: "Explore Listings",
    description: "Browse our curated selection of tokenized real estate.",
  },
  {
    icon: FileSignature,
    title: "Make an Offer",
    description: "Use cryptocurrency to make secure, instant offers.",
  },
  {
    icon: Key,
    title: "Own Your Property",
    description: "Receive your property NFT and become a proud owner.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-center mb-16 text-gray-100">
          How It Works
        </h2>
        <div className="flex flex-col lg:flex-row justify-between items-center space-y-12 lg:space-y-0 lg:space-x-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center w-full lg:w-1/4 relative"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-white bg-opacity-20 rounded-full blur-md transform scale-110" />
                <div className="relative bg-gray-100 text-gray-800 rounded-full p-6">
                  <step.icon className="h-12 w-12" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-100">
                {step.title}
              </h3>
              <p className="text-gray-400 leading-relaxed max-w-xs">
                {step.description}
              </p>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 right-[-50%] transform translate-x-[-50%] w-1/2 h-px bg-gray-600" />
              )}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[38px] right-[-50%] transform translate-x-[calc(-50%+6px)]">
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                    <path
                      fillRule="evenodd"
                      d="M3.293 15.707a1 1 0 010-1.414L7.586 10 3.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
