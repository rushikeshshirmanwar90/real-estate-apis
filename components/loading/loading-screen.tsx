"use client"

import { useEffect, useState } from "react"
import { Home, Building, CheckCircle } from "lucide-react"

export function LoadingScreen() {
    const [progress, setProgress] = useState(0)
    const [isComplete, setIsComplete] = useState(false)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        // Simulate loading progress
        const interval = setInterval(() => {
            setProgress((prevProgress) => {
                if (prevProgress >= 100) {
                    clearInterval(interval)
                    setIsComplete(true)
                    return 100
                }
                return prevProgress + 1
            })
        }, 30)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (isComplete) {
            // Add a delay before fading out
            const timeout = setTimeout(() => {
                setFadeOut(true)
            }, 500)

            return () => clearTimeout(timeout)
        }
    }, [isComplete])

    return (
        <div
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-1000 ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
        >
            <div className="w-full max-w-md px-4">
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        {/* Building icon animation */}
                        <Building
                            size={80}
                            className={`text-indigo-600 absolute top-0 left-0 transition-opacity duration-500 ${progress < 33 ? "opacity-100" : "opacity-0"
                                }`}
                        />

                        {/* House icon animation */}
                        <Home
                            size={80}
                            className={`text-purple-600 absolute top-0 left-0 transition-opacity duration-500 ${progress >= 33 && progress < 66 ? "opacity-100" : "opacity-0"
                                }`}
                        />

                        {/* Checkmark icon animation */}
                        <CheckCircle
                            size={80}
                            className={`text-green-500 absolute top-0 left-0 transition-opacity duration-500 ${progress >= 66 ? "opacity-100" : "opacity-0"
                                }`}
                        />

                        {/* Placeholder to maintain space */}
                        <div className="w-20 h-20"></div>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    RealEstate
                </h1>

                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                    <span>Loading your dream homes</span>
                    <span>{progress}%</span>
                </div>

                <div className="mt-8 text-center">
                    <div className="flex justify-center space-x-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full bg-indigo-600 animate-bounce`}
                                style={{
                                    animationDelay: `${i * 0.2}s`,
                                    opacity: isComplete ? 0 : 0.6 + i * 0.2,
                                }}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

