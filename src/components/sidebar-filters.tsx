'use client'

import * as React from 'react'
import { Building2, Home, Map, Trees } from 'lucide-react'

import { Label } from '@/components/ui'
import { Input } from '@/components/ui'
import { Slider } from '@/components/ui'
import { Checkbox } from '@/components/ui'
import { FilterState, PropertyType } from '../types/marketplace'

interface SidebarFiltersProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
}

const propertyTypes: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
  { value: 'Land', label: 'Land', icon: <Trees className="h-4 w-4" /> },
  { value: 'Commercial', label: 'Commercial', icon: <Building2 className="h-4 w-4" /> },
  { value: 'House', label: 'House', icon: <Home className="h-4 w-4" /> },
]

export function SidebarFilters({ filters, onFilterChange }: SidebarFiltersProps) {
  const handleFilterChange = (key: keyof FilterState, value: unknown) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const handlePropertyTypeChange = (type: PropertyType) => {
    const updatedTypes = filters.propertyTypes.includes(type)
      ? filters.propertyTypes.filter((t) => t !== type)
      : [...filters.propertyTypes, type]
    handleFilterChange('propertyTypes', updatedTypes)
  }

  return (
    <div className="w-64 space-y-6 p-4 border-r">
      <div className="space-y-2">
        <Label htmlFor="area">Area</Label>
        <div className="relative">
          <Map className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="area"
            placeholder="Search area..."
            className="pl-8"
            value={filters.area}
            onChange={(e) => handleFilterChange('area', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Property Type</Label>
        <div className="space-y-2">
          {propertyTypes.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={`property-type-${type.value}`}
                checked={filters.propertyTypes.includes(type.value)}
                onCheckedChange={() => handlePropertyTypeChange(type.value)}
              />
              <Label
                htmlFor={`property-type-${type.value}`}
                className="flex items-center space-x-2 text-sm font-normal"
              >
                {type.icon}
                <span>{type.label}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Property Price Range</Label>
        <Slider
          min={0}
          max={10000000}
          step={100000}
          value={[filters.priceRange[0], filters.priceRange[1]]}
          onValueChange={(value) => handleFilterChange('priceRange', value)}
          className="py-4"
        />
        <div className="flex justify-between text-sm">
          <span>${filters.priceRange[0].toLocaleString()}</span>
          <span>${filters.priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>NFT Price Range</Label>
        <Slider
          min={0}
          max={1000}
          step={10}
          value={[filters.nftPriceRange[0], filters.nftPriceRange[1]]}
          onValueChange={(value) => handleFilterChange('nftPriceRange', value)}
          className="py-4"
        />
        <div className="flex justify-between text-sm">
          <span>${filters.nftPriceRange[0]}</span>
          <span>${filters.nftPriceRange[1]}</span>
        </div>
      </div>
    </div>
  )
}

