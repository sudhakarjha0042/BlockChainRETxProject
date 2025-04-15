'use client'

import { useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Property } from '../types/property'

interface PropertyValueChartProps {
  property: Property
}

export function PropertyValueChart({ property }: PropertyValueChartProps) {
  const {
    isIncreasing,
    currentValue,
    formattedPercentage
  } = useMemo(() => {
    const initial = property.purchaseValue
    const current = property.currentValue
    const percentageChange = ((current - initial) / initial) * 100
    const isIncreasing = percentageChange >= 0
    
    return {
      percentageChange,
      isIncreasing,
      currentValue: current,
      formattedPercentage: Math.abs(percentageChange).toFixed(2)
    }
  }, [property])

  // Removed chartColor variable

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-lg">${currentValue}</span>
        <div className="flex items-center gap-1 font-medium">
          <span className={`flex items-center ${isIncreasing ? 'text-green-500' : 'text-red-500'}`}>
            {isIncreasing ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {formattedPercentage}%
          </span>
        </div>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={property.priceHistory}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border p-2 shadow-md rounded-md">
                      <p className="font-semibold">${payload[0].value}</p>
                      <p className="text-sm text-muted-foreground">{payload[0].payload.date}</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="black"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{
                fill: "black",
                stroke: 'var(--background)',
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: "black",
                stroke: 'var(--background)',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

