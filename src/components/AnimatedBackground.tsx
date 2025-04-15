'use client'; // Mark this as a client component

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
}

const AnimatedBackground = () => {
  const [dimensions, setDimensions] = useState({
    width: 1000, // Default fallback values
    height: 600
  });
  
  const [particles, setParticles] = useState<Particle[]>([]);
  const numParticles = 50;
  
  // Initialize particles only on the client side
  useEffect(() => {
    // Update dimensions based on window size
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
    
    // Initialize particles
    const initialParticles = Array.from({ length: numParticles }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight
    }));
    
    setParticles(initialParticles);
    
    // Optional: Add resize listener
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-blue-500 opacity-50"
          initial={{ x: particle.x, y: particle.y }}
          animate={{
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
          }}
          transition={{
            duration: Math.random() * 10 + 20,
            ease: "linear",
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground;

