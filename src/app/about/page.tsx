"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Home, LucideBuilding } from "lucide-react";

export default function AboutPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="py-16 sm:py-24"
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          variants={fadeIn}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center">
            <motion.h1
              className="text-5xl font-extrabold tracking-tight sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-400"
              variants={fadeIn}
            >
              About RETx
            </motion.h1>
            <motion.p
              className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-gray-600"
              variants={fadeIn}
            >
              RETx is revolutionizing real estate with blockchain technology.
              Our platform empowers users to securely invest, manage, and trade
              real estate assets in a decentralized ecosystem.
            </motion.p>
          </div>

          <motion.div
            className="mt-20 grid gap-12 sm:grid-cols-2 lg:grid-cols-3"
            variants={fadeIn}
          >
            {[
              {
                title: "Secure Transactions",
                description:
                  "Leverage blockchain technology for transparent and secure property investments.",
                icon: <LucideBuilding />,
              },
              {
                title: "Global Accessibility",
                description:
                  "Access real estate markets across the globe without geographical barriers.",
                icon: <Globe />,
              },
              {
                title: "Fractional Ownership",
                description:
                  "Invest in real estate with fractional NFTs, making property ownership more accessible.",
                icon: <Home />,
              },
            ].map((item, _index) => (
              <motion.div
                key={item.title}
                className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
                whileHover={{ scale: 1.05 }}
                variants={fadeIn}
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                  {item.icon}
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {item.title}
                </h2>
                <p className="mt-2 text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
