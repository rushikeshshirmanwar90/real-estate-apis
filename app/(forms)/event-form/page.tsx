'use client'

import { Field } from '@/components/types/editable-card';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import TopHeader from '@/components/TopHeader';
import { EditableSectionCard } from '@/components/homepage/editable-cards/editable-info-card';
import { Book, Image } from 'lucide-react';
import axios from 'axios';
import { EventProps } from '@/types/Events';
import { addEvent } from '@/functions/Events';

const Page = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get("id") || "";
    const router = useRouter();

    const [formData, setFormData] = useState<EventProps>({
        title: "",
        description: "",
        date: "",
        location: "",
        images: [],
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const basicInfo: Field[] = [
        {
            key: "title",
            label: "Title",
            value: formData.title,
            type: "text",
        },
        {
            key: "description",
            label: "Description",
            value: formData.description,
            type: "textarea",
        },
        {
            key: "date",
            label: "Enter Date (DD-MM-YYYY)",
            value: formData.date,
            type: "text",
        },
        {
            key: "location",
            label: "Location",
            value: formData.location,
            type: "text",
        },
    ];

    const handleImagesChange = (images: string[]) => {
        setFormData((prev) => ({ ...prev, images }));
    };

    const handleInputChange = (key: string, value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const isFormValid = () => {
        return (
            formData.title?.trim() !== "" &&
            formData.description?.trim() !== "" &&
            formData.date?.trim() !== "" &&
            formData.location?.trim() !== "" && // Ensure location is validated
            formData.images?.length > 0
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            setError(null);

            const res = await addEvent(formData);
            if (res) {
                console.log("Event added successfully:", res);
                router.push("/events"); // Navigate to the events page after successful submission
            } else {
                setError("Failed to add the event. Please try again.");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || "Failed to save the event.");
            } else {
                setError("An unexpected error occurred.");
            }
            console.error("Error in form submission:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {isLoading && id ? (
                <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full border-4 border-primary border-t-transparent w-16 h-16" />
                        <p className="text-lg font-medium">Loading Events data...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-red-500 text-center">
                    <p className="text-lg font-medium">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Try again
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mx-auto space-y-6 p-6">
                    <TopHeader
                        buttonText={id ? "Update Events" : "Add Events"}
                        tagTitle="Events"
                        title={id ? `Edit Events` : `Set up Events`}
                        buttonDisable={!isFormValid()}
                    />
                    <div className="flex flex-col justify-between gap-10">
                        <div>
                            <div className="flex flex-col justify-between gap-10 w-full">
                                <div className="w-[100%]">
                                    <EditableSectionCard
                                        title="Basic Information"
                                        fields={basicInfo}
                                        icon={<Book size={20} color="#073B3A" />}
                                        onFieldChange={handleInputChange}
                                    />
                                </div>

                                <div className="w-[100%]">
                                    <EditableSectionCard
                                        title="Images"
                                        images={formData.images}
                                        onImagesChange={handleImagesChange}
                                        icon={<Image size={20} color="#073B3A" />}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </>
    );
};

export default Page;