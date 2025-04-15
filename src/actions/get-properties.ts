"use server";
import { PropertyCollection } from "../types/property";

export async function getProperties(): Promise<PropertyCollection> {
  // This would be replaced with your actual API call
  return {
    totalProperties: 4,
    totalValue: 1404,
    properties: [
      {
        id: "nash",
        name: "Nash",
        rent: 124,
        currency: "usdt",
        currentValue: 1200,
        purchaseValue: 1000,
        priceHistory: [
          { date: "2024-01", value: 1000 },
          { date: "2024-02", value: 1100 },
          { date: "2024-03", value: 1200 },
        ],
      },
      {
        id: "pic",
        name: "Pic",
        rent: 134,
        currency: "usdt",
        currentValue: 1400,
        purchaseValue: 1250,
        priceHistory: [
          { date: "2024-01", value: 1250 },
          { date: "2024-02", value: 1350 },
          { date: "2024-03", value: 1400 },
        ],
      },
      {
        id: "ild",
        name: "Ild",
        rent: 98,
        currency: "usdt",
        currentValue: 900,
        purchaseValue: 800,
        priceHistory: [
          { date: "2024-01", value: 800 },
          { date: "2024-02", value: 850 },
          { date: "2024-03", value: 900 },
        ],
      },
      {
        id: "madurai",
        name: "madurai pent house",
        rent: 54,
        currency: "usdt",
        currentValue: 1000,
        purchaseValue: 700,
        priceHistory: [
          { date: "2024-01", value: 700 },
          { date: "2024-02", value: 850 },
          { date: "2024-03", value: 1000 },
        ],
      },
    ],
  };
}
