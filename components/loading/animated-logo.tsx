"use client"

import { useState, useEffect } from "react"
import { Home } from "lucide-react"

export function AnimatedLogo() {
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        // Start animation after a short delay
        const timer = setTimeout(() => {
            setIsAnimating(true)
        }, 200)

        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="relative flex items-center justify-center">
            {/* Building outline that fills with color */}
            <div className="relative">
                <Home size={120} className="text-gray-200" />
                <Home
                    size={120}
                    className="absolute top-0 left-0 text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text transition-all duration-2000 ease-in-out"
                    style={{
                        clipPath: `inset(0 ${isAnimating ? "0%" : "100%"} 0 0)`,
                        WebkitClipPath: `inset(0 ${isAnimating ? "0%" : "100%"} 0 0)`,
                    }}
                />
            </div>

            {/* Company name that fades in */}
            <div
                className={`absolute -bottom-10 text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent transition-opacity duration-1000 ${isAnimating ? "opacity-100" : "opacity-0"
                    }`}
            >
                RealEstate
            </div>
        </div>
    )
}

