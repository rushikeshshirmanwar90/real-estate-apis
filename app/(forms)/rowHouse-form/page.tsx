'use client'

import { AmenitiesProps, Field } from '@/components/types/editable-card';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { RowHouseProps } from './types';
import { successToast } from '@/components/toasts';
import { addRowHouse, getSingleRowHouse, updateRowHouse } from '@/functions/rowHouse/crud';
import TopHeader from '@/components/TopHeader';
import { EditableSectionCard } from '@/components/homepage/editable-cards/editable-info-card';
import { Book, Image } from 'lucide-react';
import AmenitiesSelector from '@/components/homepage/editable-cards/AmenitiesSelector';
import axios from 'axios';

const Page = () => {
    const router = useRouter();

    const searchParams = useSearchParams()
    const sectionName = searchParams.get('name') || ""
    const projectId = searchParams.get('projectId') || ""
    const id = searchParams.get("id") || ""

    const [selectedAmenities, setSelectedAmenities] = useState<AmenitiesProps[]>([]);
    const [formData, setFormData] = useState<RowHouseProps>({
        projectId: projectId || "",
        name: sectionName || "",
        description: "",
        area: 0,
        totalHouse: 0,
        bookedHouse: 0,
        images: [],
        amenities: [],
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const updateRowHouseData = async () => {
        try {
            const updatedRowHouseData = await updateRowHouse(formData, id);
            if (updatedRowHouseData) {
                successToast("Row house updated successfully");
                router.push("/projects");
            } else {
                console.error("Failed to update row house");
            }
        } catch (error) {
            console.error("Error updating row house:", error);
        }
    }

    const fetchRowHouseData = async () => {
        if (id) {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getSingleRowHouse(id);
                setFormData(data.data);
                setSelectedAmenities(data.data.amenities);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    setError(error.response?.data?.message || 'Failed to fetch row house data');
                } else {
                    setError('An unexpected error occurred');
                }
                console.error("Error fetching row house data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchRowHouseData();
    }, [id]);

    const basicInfo: Field[] = [
        {
            key: "name",
            label: "Name",
            value: formData.name,
            type: "text"
        },
        {
            key: "description",
            label: "Description",
            value: formData.description,
            type: "textarea"
        },
        {
            key: "totalHouse",
            label: "total number of row houses",
            value: formData.totalHouse,
            type: "number"
        },
        {
            key: "bookedHouse",
            label: "total booked houses",
            value: formData.bookedHouse,
            type: "number"
        },
        {
            key: "area",
            label: "Total Area (in sqft)",
            value: formData.area,
            type: "number"
        },
    ]

    const handleAmenitiesChange = (updatedAmenities: AmenitiesProps[]) => {
        setSelectedAmenities(updatedAmenities);
        setFormData((prevFormData) => ({
            ...prevFormData,
            amenities: updatedAmenities,
        }));
    };

    const handleImagesChange = (images: string[]) => {
        setFormData((prev) => ({ ...prev, images }))
    }

    const handleInputChange = (key: string, value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const isFormValid = () => {
        if (formData) {
            return (
                (formData.name?.trim() ?? "") !== "" && // Ensure formData.name is a valid string
                (formData.projectId?.trim() ?? "") !== "" && // Ensure formData.projectId is a valid string
                formData.images.length > 0 &&
                (formData.amenities
                    ? formData.amenities.every(
                        (amenity) =>
                            (amenity.name?.trim() ?? "") !== "" &&
                            (amenity.icon?.trim() ?? "") !== ""
                    )
                    : true)
            );
        }
        return false; // Return false if formData is undefined
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            setError(null);
            const buildingResult = id
                ? await updateRowHouseData()
                : await addRowHouse(formData);

            if (buildingResult) {
                successToast(id
                    ? "Row house updated successfully"
                    : "Row house added successfully");
                router.push("/projects");
            } else {
                console.error("Failed to save row house");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Failed to save row house');
            } else {
                setError('An unexpected error occurred');
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
                        <p className="text-lg font-medium">Loading row house data...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-red-500 text-center">
                    <p className="text-lg font-medium">{error}</p>
                    <button
                        onClick={() => {
                            if (id) {
                                fetchRowHouseData();
                            }
                        }}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Try again
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mx-auto space-y-6 p-6">
                    <TopHeader
                        buttonText={id ? "Update Row House" : "Add Row House"}
                        tagTitle="Project"
                        title={id ? `edit row house` : `set up row house`}
                        buttonDisable={!isFormValid()}
                    />
                    <div className="flex flex-col justify-between gap-10" >
                        <div>
                            <div className="flex justify-between gap-10  w-full" >
                                <div className="w-[50%]">
                                    <EditableSectionCard
                                        title="Basic Information"
                                        fields={basicInfo}
                                        icon={<Book size={20} color="#073B3A" />}
                                        onFieldChange={handleInputChange}
                                    />
                                </div>

                                <div className="w-[50%]" >
                                    <AmenitiesSelector
                                        selectedAmenities={selectedAmenities}
                                        onAmenitiesChange={handleAmenitiesChange}
                                    />
                                </div>
                            </div>

                            <div className="mt-5 mb-1" >
                                <EditableSectionCard
                                    title="Images"
                                    images={formData.images}
                                    onImagesChange={handleImagesChange}
                                    icon={<Image size={20} color="#073B3A" />}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </>
    );
};

export default Page;