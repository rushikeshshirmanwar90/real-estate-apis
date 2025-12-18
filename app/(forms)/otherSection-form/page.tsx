'use client'

import { Field } from '@/components/types/editable-card';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { successToast } from '@/components/toasts';
import { addOtherSection, getSingleOtherSection, updateOtherSection } from '@/functions/otherSection/crud';
import TopHeader from '@/components/TopHeader';
import { EditableSectionCard } from '@/components/homepage/editable-cards/editable-info-card';
import { Book, Image } from 'lucide-react';
import axios from 'axios';

export interface OtherSectionProps {
    name: string;
    description?: string;
    projectId: string;
    area: number;
    images: string[];
}

const Page = () => {
    const router = useRouter();

    const searchParams = useSearchParams()
    const sectionName = searchParams.get('name') || ""
    const projectId = searchParams.get('projectId') || ""
    const id = searchParams.get("id") || ""

    const [formData, setFormData] = useState<OtherSectionProps>({
        projectId: projectId,
        name: sectionName,
        description: "",
        area: 0,
        images: [],
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const updateOtherSectionData = async () => {
        try {
            const updatedData = await updateOtherSection(formData, id);
            if (updatedData) {
                successToast("Other section updated successfully");
                router.push("/projects");
            } else {
                console.error("Failed to update other section");
            }
        } catch (error) {
            console.error("Error updating other section:", error);
        }
    }

    const fetchOtherSectionData = async () => {
        if (id) {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getSingleOtherSection(id);
                setFormData(data.data);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    setError(error.response?.data?.message || 'Failed to fetch other section data');
                } else {
                    setError('An unexpected error occurred');
                }
                console.error("Error fetching other section data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchOtherSectionData();
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
            key: "area",
            label: "Total Area (in sqft)",
            value: formData.area,
            type: "number"
        },
    ]

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
        return (
            formData.name?.trim() !== "" &&
            formData.projectId?.trim() !== "" &&
            formData.images?.length > 0
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            setError(null);
            const buildingResult = id
                ? await updateOtherSectionData()
                : await addOtherSection(formData);

            if (buildingResult) {
                successToast(id
                    ? "Other section updated successfully"
                    : "Other section added successfully");
                router.push("/projects");
            } else {
                console.error("Failed to save other section");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Failed to save other section');
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
                        <p className="text-lg font-medium">Loading other section data...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-red-500 text-center">
                    <p className="text-lg font-medium">{error}</p>
                    <button
                        onClick={() => {
                            if (id) {
                                fetchOtherSectionData();
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
                        buttonText={id ? "Update Other Section" : "Add Other Section"}
                        tagTitle="Other Section"
                        title={id ? `edit other section` : `set up other section`}
                        buttonDisable={!isFormValid()}
                    />
                    <div className="flex flex-col justify-between gap-10" >
                        <div>
                            <div className="flex flex-col justify-between gap-10  w-full" >
                                <div className="w-[100%]">
                                    <EditableSectionCard
                                        title="Basic Information"
                                        fields={basicInfo}
                                        icon={<Book size={20} color="#073B3A" />}
                                        onFieldChange={handleInputChange}
                                    />
                                </div>

                                <div className="w-[100%]" >
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