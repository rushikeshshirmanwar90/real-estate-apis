'use client'

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Book, Image } from "lucide-react"
import TopHeader from "@/components/TopHeader"
import AmenitiesSelector from "@/components/homepage/editable-cards/AmenitiesSelector"
import { EditableSectionCard } from "@/components/homepage/editable-cards/editable-info-card"
import { AmenitiesProps, Field } from "@/components/types/editable-card"
import { successToast } from "@/components/toasts"
import { BuildingFormProps, FlatInfo, Section } from "./types"
import { Separator } from "@/components/ui/separator"
import { SectionEditableCard } from "@/components/homepage/editable-cards/sectionEditableCard"
import { FlatInfoEditableCard } from "@/components/homepage/editable-cards/flatInfoEditableCard"
import { addBuilding, getSingleBuilding, updateBuilding } from "@/functions/building/crud"

const Page = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sectionName = searchParams.get('name') || "";
    const projectId = searchParams.get('projectId') || "";
    const location = searchParams.get('location') || ""
    const id = searchParams.get('id') || "";

    const [selectedAmenities, setSelectedAmenities] = useState<AmenitiesProps[]>([]);
    const [formData, setFormData] = useState<BuildingFormProps>({
        projectId: projectId,
        name: sectionName,
        description: "",
        location: location,
        area: 0,
        images: [],
        amenities: [],
        flatInfo: [],
        section: []
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchBuildingData = async () => {
            if (id) {
                setIsLoading(true);
                try {
                    const data = await getSingleBuilding(id);
                    // setBuildingData(data);
                    setFormData(data);
                    setSelectedAmenities(data.amenities);
                } catch (error) {
                    console.error("Error fetching building data:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchBuildingData();
    }, [id]);

    const handleSectionChange = (sections: Section[]) => {
        setFormData((prev) => ({ ...prev, section: sections }));
    };

    const handleFlatInfoChange = (flatInfos: FlatInfo[]) => {
        setFormData((prev) => ({ ...prev, flatInfo: flatInfos }));
    };

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
    ];

    const handleAmenitiesChange = (updatedAmenities: AmenitiesProps[]) => {
        setSelectedAmenities(updatedAmenities);
        setFormData((prevFormData) => ({
            ...prevFormData,
            amenities: updatedAmenities,
        }));
    };

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
            formData.name.trim() !== "" &&
            formData.projectId.trim() !== "" &&
            formData.images.length > 0 &&
            (formData.section ? formData.section.every(sec => sec.name.trim() !== "") : true) &&
            (formData.flatInfo ? formData.flatInfo.every(flat =>
                flat.title.trim() !== "" &&
                flat.images.length > 0 &&
                flat.totalFlats > 0 &&
                flat.totalBookedFlats >= 0 &&
                flat.totalArea > 0
            ) : true) &&
            (formData.amenities ? formData.amenities.every(amenity => amenity.name.trim() !== "" && amenity.icon.trim() !== "") : true)
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const result = id
                ? await updateBuilding(formData, id)
                : await addBuilding(formData);

            if (result) {
                successToast(id
                    ? "Building updated successfully"
                    : "Building added successfully");
                router.push("/projects");
            } else {
                console.error("Failed to save building");
            }
        } catch (error) {
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
                        <p className="text-lg font-medium">Loading building data...</p>
                    </div>
                </div>

            ) : (
                <form onSubmit={handleSubmit} className="mx-auto space-y-6 p-6">
                    <TopHeader
                        buttonText={id ? "Update Building" : "Add Building"}
                        tagTitle="Project"
                        title={id ? `edit building` : `set up buildings`}
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
                                    <EditableSectionCard
                                        title="Images"
                                        images={formData.images}
                                        onImagesChange={handleImagesChange}
                                        icon={<Image size={20} color="#073B3A" />}
                                    />
                                </div>
                            </div>

                            <div className="mt-5 mb-1" >
                                <AmenitiesSelector
                                    selectedAmenities={selectedAmenities}
                                    onAmenitiesChange={handleAmenitiesChange}
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex flex-col gap-3" >
                            <div>
                                <SectionEditableCard sections={formData.section} onSectionsChange={handleSectionChange} />
                            </div>
                            <div>
                                <FlatInfoEditableCard flatInfos={formData.flatInfo} onFlatInfoChange={handleFlatInfoChange} />
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </>
    );
};

export default Page;