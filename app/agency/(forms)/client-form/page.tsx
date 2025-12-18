"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClientFormProps } from './types'
import { Field } from '@/components/types/editable-card'
import TopHeader from '@/components/TopHeader'
import { EditableSectionCard } from '@/components/homepage/editable-cards/editable-info-card'
import { ImagePlus, Loader2, MapPin, UserCheck } from 'lucide-react'
import Image from 'next/image'
import axios from 'axios'
import domain from '@/components/utils/domain'
import { successToast, errorToast } from "@/components/toasts"


const Page = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get("id"); // Assuming "id" is the query parameter for the client ID
    const router = useRouter()
    const [formData, setFormData] = useState<ClientFormProps>({
        address: "",
        city: "",
        email: "",
        logo: "",
        name: "",
        phoneNumber: "",
        state: "",
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Fetch client data if ID is provided
    useEffect(() => {
        const fetchClientData = async () => {
            if (id) {
                try {
                    setIsLoading(true);
                    const response = await axios.get(`${domain}/api/client?id=${id}`);
                    const data = response.data.clientData;
                    console.log(data);

                    // Convert phoneNumber to string if it's a number
                    setFormData({
                        ...data,
                        phoneNumber: data.phoneNumber?.toString() || ""
                    });
                } catch (error) {
                    console.error("Error fetching client data:", error);
                    errorToast("Failed to fetch client data");
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchClientData();
    }, [id]);

    const isFormValid = useCallback(() => {
        return (
            formData.name.trim() !== "" &&
            formData.email.trim() !== "" &&
            formData.phoneNumber.trim() !== "" &&
            formData.city.trim() !== "" &&
            formData.state.trim() !== "" &&
            formData.address.trim() !== ""
        );
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!isFormValid()) {
            alert("Please fill in all required fields.");
            return;
        }

        if (isSubmitting) return; // Prevent double submission

        setIsSubmitting(true);

        try {
            let res;

            if (id) {
                // Update existing client
                res = await axios.put(`${domain}/api/client?id=${id}`, formData);
                if (res.status !== 200) {
                    errorToast("Failed to update client data. Please try again.");
                    return;
                }
                successToast("Client data updated successfully!");
            } else {
                // Create new client
                res = await axios.post(`${domain}/api/client`, formData);
                if (res.status !== 200) {
                    errorToast("Failed to submit client data. Please try again.");
                    return;
                }
                successToast("Client data submitted successfully!");
            }

            // Reset form after successful submission for new clients only
            if (!id) {
                setFormData({
                    address: "",
                    city: "",
                    email: "",
                    logo: "",
                    name: "",
                    phoneNumber: "",
                    state: "",
                });
            }

            // Navigate back to clients list
            router.push("/super-admin/clients");

        } catch (error) {
            console.error("Error submitting form:", error);
            errorToast(`Failed to ${id ? 'update' : 'submit'} client data. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleInputChange = useCallback((key: string, value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        e.stopPropagation();

        setIsLoading(true);

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', e.target.files[0]);
            uploadFormData.append('upload_preset', 'realEstate');

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/dlcq8i2sc/image/upload`,
                {
                    method: 'POST',
                    body: uploadFormData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Cloudinary error:', errorData);
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            const imageUrl = data.secure_url;
            console.log('Cloudinary Image URL:', imageUrl);

            setFormData(prev => ({
                ...prev,
                logo: imageUrl
            }));
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading overlay when fetching client data or submitting
    if (isSubmitting) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                <div className="flex flex-col items-center gap-4 bg-card p-8 rounded-lg shadow-lg">
                    <div className="animate-spin rounded-full border-4 border-primary border-t-transparent w-16 h-16" />
                    <p className="text-lg font-medium">{id ? "Updating" : "Submitting"} Client Data...</p>
                </div>
            </div>
        );
    }

    const details: Field[] = [
        {
            key: "name",
            label: "Name",
            value: formData.name,
            type: "text"
        },
        {
            key: "email",
            label: "Email",
            value: formData.email,
            type: "text"
        },
        {
            key: "phoneNumber",
            label: "Phone Number",
            value: formData.phoneNumber,
            type: "text"
        }
    ]

    const address: Field[] = [
        {
            key: "city",
            label: "City",
            value: formData.city,
            type: "text"
        },
        {
            key: "state",
            label: "State",
            value: formData.state,
            type: "text"
        },
        {
            key: "address",
            label: "Address",
            value: formData.address,
            type: "text"
        }
    ]

    return (
        <div className="min-h-screen bg-background">
            <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6 p-6">
                <TopHeader
                    buttonText={id ? "Update Client" : "Add Client"}
                    tagTitle="Client"
                    title={id ? `Update Client Details` : `Set up Client Details`}
                    buttonDisable={!isFormValid() || isSubmitting}
                />

                <div className="space-y-6">
                    <EditableSectionCard
                        title="Client Details"
                        fields={details}
                        icon={<UserCheck size={20} color="#073B3A" />}
                        onFieldChange={handleInputChange}
                    />

                    <EditableSectionCard
                        title="Client Address"
                        fields={address}
                        icon={<MapPin size={20} color="#073B3A" />}
                        onFieldChange={handleInputChange}
                    />

                    <div className="bg-card rounded-lg p-6 shadow-sm border">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <ImagePlus size={20} color="#073B3A" />
                                Client Logo
                            </h3>
                            <div className="relative aspect-square w-80 max-w-full overflow-hidden rounded-lg border border-border bg-muted/10">
                                {formData.logo ? (
                                    <Image
                                        width={320}
                                        height={320}
                                        src={formData.logo}
                                        alt="Client Logo"
                                        className="h-full w-full object-cover"
                                        priority={false}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <div className="text-center">
                                            <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">No logo uploaded</p>
                                        </div>
                                    </div>
                                )}

                                <label className="absolute bottom-3 right-3 cursor-pointer">
                                    <div className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90">
                                        {isLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ImagePlus className="h-4 w-4" />
                                        )}
                                        <span>{isLoading ? "Uploading..." : formData.logo ? "Change Logo" : "Upload Logo"}</span>
                                    </div>
                                    <input
                                        type="file"
                                        className="sr-only"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        disabled={isLoading}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default Page