"use client"

import { useEffect, useState } from "react"
import { AnimatedLogo } from "./animated-logo"

export function FullPageLoader() {
    const [progress, setProgress] = useState(0)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        // Simulate loading progress
        const interval = setInterval(() => {
            setProgress((prevProgress) => {
                if (prevProgress >= 100) {
                    clearInterval(interval)
                    setTimeout(() => setFadeOut(true), 500)
                    return 100
                }
                return prevProgress + Math.floor(Math.random() * 3) + 1
            })
        }, 50)

        return () => clearInterval(interval)
    }, [])

    return (
        <div
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-all duration-1000 ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
        >
            <div className="w-full max-w-md px-4 flex flex-col items-center">
                <AnimatedLogo />

                <div className="w-full mt-20">
                    <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2 w-full max-w-xs mx-auto">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div className="text-center text-sm text-gray-400 font-light">
                        {progress < 30 && "Preparing your dream homes..."}
                        {progress >= 30 && progress < 60 && "Finding the perfect properties..."}
                        {progress >= 60 && progress < 90 && "Setting up virtual tours..."}
                        {progress >= 90 && "Almost ready!"}
                    </div>
                </div>
            </div>
        </div>
    )
}

