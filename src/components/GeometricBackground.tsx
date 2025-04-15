'use client'

import React from 'react'
import { motion } from 'framer-motion'

const GeometricBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden opacity-20">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white"
          style={{
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      ))}
    </div>
  )
}

export default GeometricBackground

