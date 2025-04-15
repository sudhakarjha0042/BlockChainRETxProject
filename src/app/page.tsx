'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Key, Lock, Coins } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

export default function Home() {
  const targetRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8])

  return (
    <div className="flex flex-col min-h-screen overflow-hidden" ref={targetRef}>
      <AnimatedBackground />
      <main className="flex-1 px-32  relative z-10">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 ml-36">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <motion.div 
                className="flex flex-col justify-center space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Revolutionize Real Estate with RETx
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                    Experience the future of property transactions. Secure, transparent, and efficient.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/marketplace">
                    <Button size="lg">
                    Get Started Now
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg">Learn More</Button>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <Image
                  alt="Hero"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                  height="550"
                  src="/image.png"
                  width="550"
                />
              </motion.div>
            </div>
          </div>
        </section>
        <motion.section 
          className="w-full py-12 md:py-24 lg:py-32 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          style={{ opacity, scale }}
        >
          <div className="container ml-28 px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12" >Why RETx?</h2>
            <div className="flex gap-16 justify-center">
              {[
                { icon: Key, title: "Tokenized Properties", description: "Own fractions of high-value properties through blockchain technology." },
                { icon: Lock, title: "Secure Transactions", description: "Smart contracts ensure safe and transparent property deals." },
                { icon: Coins, title: "Global Investments", description: "Access international real estate markets with ease." }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  className="flex flex-col items-center space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <feature.icon className="h-12 w-12 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-8 md:px-6 ml-36 ">
            <motion.div 
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="space-y-4 flex flex-col items-center justify-center pl-5">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Ready to Transform Your Real Estate Journey?</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Join the RETx revolution today and experience a new era of property ownership and investment.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/marketplace">
                    <Button size="lg">
                    Get Started Now
                    </Button>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="lg">Contact Sales</Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t relative z-10">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2024 Web3 Realty. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}

