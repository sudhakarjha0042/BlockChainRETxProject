import React from 'react'
import { Shield, Globe, Zap, Users } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Secure Transactions',
    description: 'Smart contracts ensure safe and transparent property deals.'
  },
  {
    icon: Globe,
    title: 'Global Accessibility',
    description: 'Invest in real estate worldwide without geographical barriers.'
  },
  {
    icon: Zap,
    title: 'Instant Settlements',
    description: 'Fast and efficient property transfers with blockchain technology.'
  },
  {
    icon: Users,
    title: 'Fractional Ownership',
    description: 'Invest in partial property shares for increased flexibility.'
  }
]

export default function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 40L40 0M0 0L40 40" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-center mb-16 text-gray-900 dark:text-white">
          Why Choose Web3Estate
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group flex flex-col items-center text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
            >
              <div className="mb-6 p-4 bg-primary/10 rounded-full">
                <feature.icon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

