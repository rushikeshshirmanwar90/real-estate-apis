"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import img1 from '@/assets/banner images/img-1.jpg';
import img2 from '@/assets/banner images/img-2.jpeg'
import img3 from '@/assets/banner images/img-3.jpg'
import Image from "next/image";

export function HeroSection() {
    const [currentSlide, setCurrentSlide] = useState(0)

    const slides = [
        {
            image: img1,
            title: "Discover Your Dream Home",
            subtitle: "Luxury Properties in Prime Locations",
            buttonText: "Explore Now",
            buttonLink: "#projects"
        },
        {
            image: img2,
            title: "Invest in Your Future",
            subtitle: "High-Value Real Estate Opportunities",
            buttonText: "Get Started",
            buttonLink: "#contact"

        },
        {
            image: img3,
            title: "Experience Modern Living",
            subtitle: "Contemporary Designs with Premium Amenities",
            buttonText: "See More",
            buttonLink: "#projects"
        },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
        }, 5000)
        return () => clearInterval(interval)
    }, [slides.length])

    return (
        <section className="relative h-screen w-full overflow-hidden pt-16">
            {/* Background Slides */}
            {slides.map((slide, index) => (

                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
                >
                    <Image
                        src={slide.image}
                        alt={slide.title}
                        layout="fill"
                        objectFit="cover"
                        quality={85}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
                </div>
            ))}

            {/* Content */}
            <div className="container mx-auto px-4 h-full flex items-center relative z-10">
                <div className="max-w-3xl text-white">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in">
                        {slides[currentSlide].title}
                    </h1>
                    <p className="text-xl md:text-2xl mb-8 text-gray-200">{slides[currentSlide].subtitle}</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href={slides[currentSlide].buttonLink}
                            className="px-8 py-3 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all text-center"
                        >
                            {slides[currentSlide].buttonText}
                        </Link>
                        <Link
                            href="#contact"
                            className="px-8 py-3 rounded-md bg-white/10 backdrop-blur-sm border border-white/30 text-white font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                        >
                            Contact Us <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        className={`w-3 h-3 rounded-full transition-all ${index === currentSlide ? "bg-white w-8" : "bg-white/50"}`}
                        onClick={() => setCurrentSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    )
}