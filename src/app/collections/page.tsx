import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PropertyValueChart } from "@/components/property-value-chart";
import Navbar from "@/components/navbar";

const mockData = {
  totalProperties: 4,
  totalValue: 1404,
  properties: [
    {
      id: "madurai",
      name: "NYC pent house",
      rent: 54,
      currency: "usdt",
      currentValue: 54,
      purchaseValue: 45,
      priceHistory: [
        { date: "2024-01", value: 45 },
        { date: "2024-02", value: 48 },
        { date: "2024-03", value: 54 },
      ],
    },
    {
      id: "nash",
      name: "Nash",
      rent: 124,
      currency: "usdt",
      currentValue: 130,
      purchaseValue: 120,
      priceHistory: [
        { date: "2024-01", value: 120 },
        { date: "2024-02", value: 125 },
        { date: "2024-03", value: 130 },
      ],
    },
    {
      id: "pic",
      name: "Colorado pent house",
      rent: 134,
      currency: "usdt",
      currentValue: 140,
      purchaseValue: 130,
      priceHistory: [
        { date: "2024-01", value: 130 },
        { date: "2024-02", value: 135 },
        { date: "2024-03", value: 140 },
      ],
    },
    {
      id: "ild",
      name: "Chicago pent house",
      rent: 98,
      currency: "usdt",
      currentValue: 100,
      purchaseValue: 95,
      priceHistory: [
        { date: "2024-01", value: 95 },
        { date: "2024-02", value: 98 },
        { date: "2024-03", value: 100 },
      ],
    },
  ],
};

async function CollectionsContent() {
  const data = mockData;

  return (
    <>
      <div className="p-6 mt-20 space-y-8 max-w-5xl mx-auto bg-gray-100 rounded-lg shadow-md">
        {/* Overview Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {data.totalProperties} Properties Owned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-gray-800">
                {data.totalValue} USDT
              </div>
              <p className="mt-2 text-gray-600">
                The total value of your portfolio is {data.totalValue} USDT,
                distributed across {data.totalProperties} properties. You can
                manage your investments and monitor their growth here.
              </p>
            </CardContent>
          </Card>

          {/* Featured Property Chart */}
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {data.properties[0].name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[200px]">
                <PropertyValueChart property={data.properties[0]} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rent Section */}
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Rent Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.properties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <span className="font-medium text-gray-700">
                    {property.name}
                  </span>
                  <span className="text-gray-600">
                    {property.rent} {property.currency}
                  </span>
                </div>
              ))}
              <Button variant="outline" className="w-full text-gray-800">
                View More
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sell USDT Section */}
        <div className="flex justify-center mt-6">
          {/* <Button
            variant="primary"
            className="w-full max-w-sm bg-blue-600 text-white"
          >
            Sell USDT
          </Button> */}
        </div>
      </div>
    </>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionsContent />
    </Suspense>
  );
}
