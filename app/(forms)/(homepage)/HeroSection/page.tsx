"use client"
import { HeroSectionDetails } from '@/types/HomePage';
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ImagePlus, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

interface HeroSectionEditableCardProps {
    slides: HeroSectionDetails[];
    onSlidesChange: (slides: HeroSectionDetails[]) => void;
}

const HeroSectionEditableCard: React.FC<HeroSectionEditableCardProps> = ({
    slides = [],
    onSlidesChange
}) => {
    // Initialize with an empty array if slides is undefined
    const [heroSlides, setHeroSlides] = useState<HeroSectionDetails[]>(slides);
    // Track loading state for image uploads
    const [loadingImageIndex, setLoadingImageIndex] = useState<number | null>(null);

    // Add a new slide with empty values
    const addSlide = () => {
        const newSlide: HeroSectionDetails = {
            title: '',
            description: '',
            image: '',
            buttonText: '',
            buttonLink: ''
        };

        const updatedSlides = [...heroSlides, newSlide];
        setHeroSlides(updatedSlides);
        onSlidesChange(updatedSlides);
    };

    // Remove a slide by index
    const removeSlide = (index: number) => {
        const updatedSlides = heroSlides.filter((_, i) => i !== index);
        setHeroSlides(updatedSlides);
        onSlidesChange(updatedSlides);
    };

    // Update a slide at specific index with the new value
    const updateSlide = (index: number, field: keyof HeroSectionDetails, value: string) => {
        const updatedSlides = [...heroSlides];
        updatedSlides[index] = {
            ...updatedSlides[index],
            [field]: value
        };

        setHeroSlides(updatedSlides);
        onSlidesChange(updatedSlides);
    };

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        setLoadingImageIndex(index);

        try {
            // Here you would typically upload the image to your server/storage
            // This is a placeholder for the actual upload logic
            // Replace with your actual upload implementation

            // Simulating upload delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // For demo purposes, we're using a local URL
            // In production, replace this with the actual URL returned from your upload service
            const imageUrl = URL.createObjectURL(file);

            updateSlide(index, 'image', imageUrl);
        } catch (error) {
            console.error("Error uploading image:", error);
        } finally {
            setLoadingImageIndex(null);
        }
    };

    // Remove image for a slide
    const removeImage = (index: number) => {
        updateSlide(index, 'image', '');
    };

    return (
        <div className="space-y-6">
            {/* Add slide button */}
            <div className="flex justify-end">
                <Button
                    type="button"
                    onClick={addSlide}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <PlusCircle size={18} />
                    Add Hero Slide
                </Button>
            </div>

            {/* Slides list */}
            {heroSlides.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg text-gray-500">
                    <p className="mb-4 text-lg">No hero slides added yet</p>
                    <Button type="button" onClick={addSlide} variant="outline">
                        Add Your First Slide
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {heroSlides.map((slide, index) => (
                        <Card key={index} className="overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold">Hero Slide {index + 1}</h3>
                                    <Button
                                        type="button"
                                        onClick={() => removeSlide(index)}
                                        variant="outline"
                                        size="icon"
                                        className="text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Title */}
                                    <div className="space-y-2">
                                        <Label htmlFor={`title-${index}`}>Title</Label>
                                        <Input
                                            id={`title-${index}`}
                                            value={slide.title}
                                            onChange={(e) => updateSlide(index, 'title', e.target.value)}
                                            placeholder="Enter title"
                                            required
                                        />
                                    </div>

                                    {/* Image Section */}
                                    <div className="space-y-2">
                                        <Label>Image</Label>
                                        {slide.image ? (
                                            <div className="relative aspect-video rounded-lg overflow-hidden border">
                                                <Image
                                                    src={slide.image}
                                                    alt={slide.title || `Hero Slide ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "/placeholder-image.jpg";
                                                    }}
                                                    width={500}
                                                    height={500}
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                                    onClick={() => removeImage(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <label className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    {loadingImageIndex === index ? (
                                                        <Loader2 className="h-6 w-6 animate-spin" />
                                                    ) : (
                                                        <ImagePlus className="h-8 w-8 text-gray-400" />
                                                    )}
                                                    <span className="text-sm text-gray-500">
                                                        {loadingImageIndex === index ? "Uploading..." : "Upload Image"}
                                                    </span>
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, index)}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor={`description-${index}`}>Description</Label>
                                        <Textarea
                                            id={`description-${index}`}
                                            value={slide.description}
                                            onChange={(e) => updateSlide(index, 'description', e.target.value)}
                                            placeholder="Enter description"
                                            rows={3}
                                            required
                                        />
                                    </div>

                                    {/* Button Text */}
                                    <div className="space-y-2">
                                        <Label htmlFor={`buttonText-${index}`}>Button Text</Label>
                                        <Input
                                            id={`buttonText-${index}`}
                                            value={slide.buttonText}
                                            onChange={(e) => updateSlide(index, 'buttonText', e.target.value)}
                                            placeholder="Enter button text"
                                            required
                                        />
                                    </div>

                                    {/* Button Link */}
                                    <div className="space-y-2">
                                        <Label htmlFor={`buttonLink-${index}`}>Button Link</Label>
                                        <Input
                                            id={`buttonLink-${index}`}
                                            value={slide.buttonLink}
                                            onChange={(e) => updateSlide(index, 'buttonLink', e.target.value)}
                                            placeholder="Enter button link"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Preview section - optional */}
                                {slide.title && slide.image && (
                                    <div className="mt-6 p-4 border rounded-lg">
                                        <h4 className="text-sm font-medium mb-2">Preview</h4>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-16 bg-gray-200 rounded overflow-hidden">
                                                <Image
                                                    width={500}
                                                    height={500}
                                                    src={slide.image}
                                                    alt={slide.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "/placeholder-image.jpg";
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <h5 className="font-medium">{slide.title}</h5>
                                                <p className="text-sm text-gray-500 truncate">{slide.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

// Only export the page component as default
export default function HeroSectionPage() {
    // You can fetch slides from props, context, or leave empty for now
    const [slides, setSlides] = React.useState<HeroSectionDetails[]>([]);

    return (
        <HeroSectionEditableCard
            slides={slides}
            onSlidesChange={setSlides}
        />
    );
}