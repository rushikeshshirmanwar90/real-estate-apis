"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Pencil, X, Check, Loader2, Building2 } from "lucide-react"
import { FlatInfo } from "@/app/(forms)/building-form/types"
import { handleImageUpload } from "../../functions/image-handling"

interface FlatInfoEditableCardProps {
    flatInfos: FlatInfo[] | undefined
    onFlatInfoChange: (flatInfos: FlatInfo[]) => void
}

export function FlatInfoEditableCard({ flatInfos = [], onFlatInfoChange }: FlatInfoEditableCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [tempFlatInfos, setTempFlatInfos] = useState<FlatInfo[]>(
        flatInfos.map((flat) => ({
            ...flat,
            images: flat.images || [], // Ensure images array exists
        })),
    )
    const hasData = flatInfos.length > 0

    const handleFlatImages = async (flatIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        // Create a dummy setter that matches the expected type
        const dummySetImages: React.Dispatch<React.SetStateAction<string[]>> = () => { };

        // Call the original function but ignore its state updates
        const urls = await handleImageUpload(e, dummySetImages, setIsLoading);

        // Manually update the FlatInfo state with the returned URLs
        if (urls && urls.length > 0) {
            setTempFlatInfos((prev) =>
                prev.map((flat, i) =>
                    i === flatIndex
                        ? { ...flat, images: [...(flat.images || []), ...urls] }
                        : flat
                )
            );
        }
    };

    const handleEdit = () => {
        setTempFlatInfos(
            flatInfos.map((flat) => ({
                ...flat,
                images: flat.images || [], // Ensure images array exists
            })),
        )
        setIsEditing(true)
    }

    const handleSave = () => {
        onFlatInfoChange(tempFlatInfos)
        setIsEditing(false)
    }

    const handleCancel = () => {
        setTempFlatInfos(
            flatInfos.map((flat) => ({
                ...flat,
                images: flat.images || [], // Ensure images array exists
            })),
        )
        setIsEditing(false)
    }

    const addFlatInfo = () => {
        setTempFlatInfos([
            ...tempFlatInfos,
            {
                title: "",
                description: "",
                images: [], // Initialize with empty array
                totalFlats: 0,
                totalBookedFlats: 0,
                totalArea: 0,
                video: "",
                bhk: 1,
            },
        ])
    }

    const removeFlatInfo = (index: number) => {
        setTempFlatInfos(tempFlatInfos.filter((_, i) => i !== index))
    }

    const updateFlatInfo = (index: number, field: keyof FlatInfo, value: string | number) => {
        setTempFlatInfos(tempFlatInfos.map((flatInfo, i) => (i === index ? { ...flatInfo, [field]: value } : flatInfo)))
    }

    const removeImage = (flatIndex: number, imageIndex: number) => {
        setTempFlatInfos((prev) =>
            prev.map((flat, i) =>
                i === flatIndex ? { ...flat, images: (flat.images || []).filter((_, imgIdx) => imgIdx !== imageIndex) } : flat,
            ),
        )
    }

    return (
        <Card className="w-full overflow-hidden bg-card shadow-xl">
            <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                        <div className="border border-border bg-primary/10 p-2 rounded-full">
                            <Building2 size={20} className="text-primary" />
                        </div>
                        Flat Information
                    </h2>
                    {hasData && !isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleEdit}
                            className="h-8 w-8 rounded-full transition-colors hover:bg-muted/50"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {!hasData && !isEditing ? (
                    <Button variant="ghost" className="hover:bg-muted/30" onClick={handleEdit}>
                        <span className="mr-2 text-lg">+</span> Add Flat Information
                    </Button>
                ) : (
                    <div className="space-y-6">
                        {(isEditing ? tempFlatInfos : flatInfos).map((flatInfo, index) => (
                            <div key={index} className="relative space-y-4 rounded-lg bg-muted/30 p-4">
                                {isEditing && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                                        onClick={() => removeFlatInfo(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                                {isEditing ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Title</label>
                                            <Input
                                                value={flatInfo.title}
                                                onChange={(e) => updateFlatInfo(index, "title", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <Textarea
                                                value={flatInfo.description}
                                                onChange={(e) => updateFlatInfo(index, "description", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Total Flats</label>
                                            <Input
                                                type="number"
                                                value={flatInfo.totalFlats}
                                                onChange={(e) => updateFlatInfo(index, "totalFlats", Number(e.target.value))}
                                                required
                                                min={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Total Booked Flats</label>
                                            <Input
                                                type="number"
                                                value={flatInfo.totalBookedFlats}
                                                onChange={(e) => updateFlatInfo(index, "totalBookedFlats", Number(e.target.value))}
                                                required
                                                min={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Total Area (sq ft)</label>
                                            <Input
                                                type="number"
                                                value={flatInfo.totalArea}
                                                onChange={(e) => updateFlatInfo(index, "totalArea", Number(e.target.value))}
                                                required
                                                min={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">BHK</label>
                                            <Input
                                                type="number"
                                                value={flatInfo.bhk}
                                                onChange={(e) => updateFlatInfo(index, "bhk", Number(e.target.value))}
                                                required
                                                min={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Video URL</label>
                                            <Input
                                                value={flatInfo.video || ""}
                                                onChange={(e) => updateFlatInfo(index, "video", e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="text-lg font-medium">{flatInfo.title}</div>
                                            <div className="text-sm text-muted-foreground">{flatInfo.description}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Total Flats</div>
                                                <div className="text-lg font-medium">{flatInfo.totalFlats}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Booked Flats</div>
                                                <div className="text-lg font-medium">{flatInfo.totalBookedFlats}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">BHK</div>
                                                <div className="text-lg font-medium">{flatInfo.bhk}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Total Area</div>
                                                <div className="text-lg font-medium">{flatInfo.totalArea} sq ft</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {(flatInfo.images || []).map((image, imageIndex) => (
                                        <div key={imageIndex} className="relative aspect-square">
                                            <img
                                                src={image || "/placeholder.svg"}
                                                alt={`Flat ${index + 1} image ${imageIndex + 1}`}
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                            {isEditing && (
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                                                    onClick={() => removeImage(index, imageIndex)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {isEditing && (
                                        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                {isLoading ? (
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                ) : (
                                                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                                )}
                                                <span className="text-sm text-muted-foreground">
                                                    {isLoading ? "Adding Image" : "Add Image"}
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleFlatImages(index, e)}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isEditing && (
                            <Button variant="outline" onClick={addFlatInfo} className="w-full">
                                <span className="mr-2 text-lg">+</span> Add Flat Type
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
            {isEditing && (
                <CardFooter className="border-t border-border bg-muted/30 gap-4 justify-end pt-3">
                    <Button type="button" onClick={handleCancel} variant="outline">
                        <X className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                    <Button type="button" onClick={handleSave}>
                        <Check className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}

