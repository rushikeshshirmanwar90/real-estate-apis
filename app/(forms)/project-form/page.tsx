"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Book, Image, MapPinCheck } from "lucide-react"

import TopHeader from "@/components/TopHeader"
import AmenitiesSelector from "@/components/homepage/editable-cards/AmenitiesSelector"
import { EditableSectionCard } from "@/components/homepage/editable-cards/editable-info-card"

import { AmenitiesProps, Field } from "@/components/types/editable-card"
import type { FormData } from "./types"

import { addProject, updateProject } from "@/functions/project/crud"
import { getClientId } from "@/functions/getClientId"
import { successToast } from "@/components/toasts"


const Page = () => {

    const router = useRouter();
    const searchParams = useSearchParams();

    const [projectId, setProjectId] = useState<string | null>("");
    const [selectedAmenities, setSelectedAmenities] = useState<AmenitiesProps[]>([]);
    const [formData, setFormData] = useState<FormData>({
        images: [],
        name: "",
        description: "",
        projectType: "",
        area: 0,
        address: "",
        state: "",
        city: "",
        amenities: selectedAmenities,
        clientId: "",
        longitude: 0,
        latitude: 0,
    });

    const fetchClientId = async () => {
        try {
            const id = await getClientId();
            if (id) {
                setFormData(prev => ({
                    ...prev,
                    clientId: id
                }));
            }
        } catch (error) {
            console.error("Error fetching client ID:", error);
        }
    };
    useEffect(() => {
        const params = Object.fromEntries(searchParams.entries());
        if (Object.keys(params).length > 0) {
            setFormData(prev => ({
                ...prev,
                _id: params._id || prev._id,
                name: params.name || prev.name,
                description: params.description || prev.description,
                projectType: params.projectType || prev.projectType,
                area: Number(params.area) || prev.area,
                address: params.address || prev.address,
                state: params.state || prev.state,
                city: params.city || prev.city,
                images: params.images ? JSON.parse(params.images) : prev.images,
                amenities: params.amenities ? JSON.parse(params.amenities) : prev.amenities,
            }));

            if (params.amenities) {
                setSelectedAmenities(JSON.parse(params.amenities));
            }
            setProjectId(params._id)
        }

        fetchClientId();
    }, [searchParams]);

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
            formData.name.trim() !== "" &&
            formData.description.trim() !== "" &&
            formData.projectType.trim() !== "" &&
            formData.address.trim() !== "" &&
            formData.area > 0 &&
            formData.state.trim() !== "" &&
            formData.city.trim() !== ""
        )
    }

    const handleAmenitiesChange = (updatedAmenities: AmenitiesProps[]) => {
        setSelectedAmenities(updatedAmenities);
        setFormData((prevFormData) => ({
            ...prevFormData,
            amenities: updatedAmenities,
        }));
    };

    const basicInfoFields: Field[] = [
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
            label: "Total area (in sqft)",
            value: formData.area,
            type: "number"
        },
        {
            key: "projectType",
            label: "project type",
            type: "select",
            value: formData.projectType,
            options: [
                {
                    label: "upcoming project",
                    value: "upcoming"
                },
                {
                    label: "onGoing project",
                    value: "ongoing"
                },
                {
                    label: "completed project",
                    value: "completed"
                },
            ]
        }
    ]

    const addressInfoFields: Field[] =
        [
            {
                key: "address",
                label: "Street Address",
                value: formData.address,
                type: "text"
            },

            {
                key: "state",
                label: "State",
                value: formData.state,
                type: "text"
            },
            {
                key: "city",
                label: "City",
                value: formData.city,
                type: "text"
            },
            {
                key: "longitude",
                label: "Enter the Longitude",
                value: formData.longitude,
                type: "number"
            },
            {
                key: "latitude",
                label: "Enter the Latitude",
                value: formData.latitude,
                type: "number"
            },
        ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result: FormData = projectId ? await updateProject(formData, projectId) : await addProject(formData)
            if (result) {
                successToast("Project Added successfully")
                router.push("/projects")
            } else {
                console.error("Failed to add project");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="mx-auto space-y-6 p-6">
                <TopHeader buttonText={`${projectId ? "Update Project" : "Add Project"}`} tagTitle="Project" title={`${projectId ? "Update The project" : "Set up project"}`} buttonDisable={!isFormValid()} />
                <div className="flex flex-col justify-between gap-10" >
                    <div className="flex justify-between gap-10  w-full" >
                        <div className="w-[50%]">
                            <EditableSectionCard
                                title="Basic Information"
                                fields={basicInfoFields}
                                icon={<Book size={20} color="#073B3A" />}
                                onFieldChange={handleInputChange}
                            />
                        </div>

                        <div className="w-[50%]" >
                            <EditableSectionCard
                                title="Address Information"
                                fields={addressInfoFields}
                                onFieldChange={handleInputChange}
                                icon={<MapPinCheck size={20} color="#073B3A" />}
                            />
                        </div>
                    </div>
                    <div className="flex items-center  justify-between w-full" >
                        <div className="w-[48%] m-auto" >
                            <EditableSectionCard title="Images" images={formData.images} onImagesChange={handleImagesChange}
                                icon={<Image size={20} color="#073B3A" />}
                            />
                        </div>
                        <div className="w-[48%] m-auto" >
                            <AmenitiesSelector
                                selectedAmenities={selectedAmenities}
                                onAmenitiesChange={handleAmenitiesChange}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

export default Page