import { Button } from "./ui"
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:40px_40px]" />
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-300">
            Revolutionizing Real Estate with Web3
          </h1>
          <p className="text-xl sm:text-2xl mb-10 text-gray-300 leading-relaxed">
            Secure, transparent, and decentralized property transactions powered by blockchain technology.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/marketplace">
              <div 
                className="w-full sm:w-auto bg-white text-gray-900 font-semibold hover:bg-gray-200 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
              >
                Get Started
              </div>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto text-gray-900 bg-white border-gray-300 hover:bg-gray-100 font-semibold transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Learn More <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

