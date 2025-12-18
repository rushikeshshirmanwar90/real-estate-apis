import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FlatFormValues } from '@/app/(forms)/project-form/schema';
import Image from 'next/image';

interface ImageHandlerProps {
    form: UseFormReturn<FlatFormValues>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
    uploadedImages: string[];
    title: string;
    maxImages?: number;
}

export const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImages: React.Dispatch<React.SetStateAction<string[]>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    form?: UseFormReturn<FlatFormValues>
) => {
    if (!e.target.files?.length) return;
    setIsLoading(true);

    const uploadPromises = Array.from(e.target.files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'realEstate');

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/dlcq8i2sc/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            )

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Cloudinary error:', errorData);
                return null;
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Upload failed:', error);
            return null;
        }
    });

    const urls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];

    setImages((prevImages) => {
        const newImages = [...prevImages, ...urls];
        // Update form field if form is provided
        if (form) {
            form.setValue('images', newImages);
        }
        return newImages;
    });

    setIsLoading(false);

    return urls;
};

export const removeImage = (
    index: number,
    setImages: React.Dispatch<React.SetStateAction<string[]>>,
    form?: UseFormReturn<FlatFormValues>
) => {
    setImages((prevImages) => {
        const newImages = prevImages.filter((_, i) => i !== index);
        // Update form field if form is provided
        if (form) {
            form.setValue('images', newImages);
        }
        return newImages;
    });
};

const ImageHandler: React.FC<ImageHandlerProps> = ({
    form,
    isLoading,
    setIsLoading,
    setUploadedImages,
    uploadedImages,
    title,
    maxImages = 10,
}) => {
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await handleImageUpload(e, setUploadedImages, setIsLoading, form);
    };

    const handleRemove = (index: number) => {
        removeImage(index, setUploadedImages, form);
    };

    return (
        <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">{title}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
                {uploadedImages.map((image, index) => (
                    <div key={index} className="relative w-24 h-24">
                        <Image
                            src={image}
                            alt={`Uploaded image ${index + 1}`}
                            className="w-full h-full object-cover rounded-md"
                            width={96}
                            height={96}
                        />
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                            aria-label="Remove image"
                        >
                            ×
                        </button>
                    </div>
                ))}

                {isLoading && (
                    <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-md">
                        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
            </div>

            {uploadedImages.length < maxImages && (
                <div className="mt-2">
                    <label className="block cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                        <span>Upload Images</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleUpload}
                            className="hidden"
                            disabled={isLoading}
                        />
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                        {uploadedImages.length} of {maxImages} images uploaded
                    </p>
                </div>
            )}
        </div>
    );
};

export default ImageHandler;