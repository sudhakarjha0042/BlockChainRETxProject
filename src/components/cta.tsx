import { Button } from "./ui"

export default function CTA() {
  return (
    <section className="bg-primary text-white py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Revolutionize Your Real Estate Journey?</h2>
        <p className="text-xl mb-8">Join Web3Estate today and experience the future of property investment.</p>
        <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
          Get Started Now
        </Button>
      </div>
    </section>
  )
}

