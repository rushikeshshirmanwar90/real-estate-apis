"use client"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Pencil, X, Check, Loader2, LayoutGrid } from "lucide-react"
import { handleImageUpload } from "../../functions/image-handling"
import Image from "next/image"

interface Section {
    name: string
    description?: string
    images?: string[]
}

interface SectionEditableCardProps {
    sections: Section[] | undefined
    onSectionsChange: (sections: Section[]) => void
}

export function SectionEditableCard({ sections = [], onSectionsChange }: SectionEditableCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [tempSections, setTempSections] = useState<Section[]>(sections)
    const hasData = sections.length > 0

    const handleEdit = () => {
        setTempSections([...sections])
        setIsEditing(true)
    }

    const handleSave = () => {
        onSectionsChange(tempSections)
        setIsEditing(false)
    }

    const handleCancel = () => {
        setTempSections([...sections])
        setIsEditing(false)
    }

    const addSection = () => {
        setTempSections([...tempSections, { name: "", description: "", images: [] }])
    }

    const removeSection = (index: number) => {
        setTempSections(tempSections.filter((_, i) => i !== index))
    }

    const updateSection = (index: number, field: keyof Section, value: string) => {
        setTempSections(tempSections.map((section, i) => (i === index ? { ...section, [field]: value } : section)))
    }
    const handleSectionImages = async (sectionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        // Create a dummy setter that matches the expected type
        const dummySetImages: React.Dispatch<React.SetStateAction<string[]>> = () => { };

        // Call the original function but ignore its state updates
        const urls = await handleImageUpload(e, dummySetImages, setIsLoading);

        // Manually update the tempSections state with the returned URLs
        if (urls && urls.length > 0) {
            setTempSections((prev) =>
                prev.map((section, i) =>
                    i === sectionIndex
                        ? { ...section, images: [...(section.images || []), ...urls] }
                        : section
                )
            );
        }
    };

    const removeImage = (sectionIndex: number, imageIndex: number) => {
        setTempSections((prev) =>
            prev.map((section, i) =>
                i === sectionIndex
                    ? { ...section, images: (section.images || []).filter((_, i) => i !== imageIndex) }
                    : section,
            ),
        )
    }

    return (
        <Card className="w-full overflow-hidden bg-card shadow-xl">
            <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                        <div className="border border-border bg-primary/10 p-2 rounded-full">
                            <LayoutGrid size={20} className="text-primary" />
                        </div>
                        Sections
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
            <CardContent className="p-6">
                {!hasData && !isEditing ? (
                    <Button variant="ghost" className="hover:bg-muted/30" onClick={handleEdit}>
                        <span className="mr-2 text-lg">+</span> Add Sections
                    </Button>
                ) : (
                    <div className="w-full">
                        <div className="flex gap-6 overflow-x-auto pb-4">
                            {(isEditing ? tempSections : sections).map((section, index) => (
                                <div key={index} className="relative flex-none w-80 rounded-lg bg-muted/30 p-4">
                                    {isEditing && (
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                                            onClick={() => removeSection(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {isEditing ? (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Name</label>
                                                <Input
                                                    value={section.name}
                                                    onChange={(e) => updateSection(index, "name", e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="mt-4 space-y-2">
                                                <label className="text-sm font-medium">Description</label>
                                                <Textarea
                                                    value={section.description}
                                                    onChange={(e) => updateSection(index, "description", e.target.value)}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-lg font-medium">{section.name}</div>
                                            <div className="text-sm text-muted-foreground">{section.description}</div>
                                        </div>
                                    )}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        {(section.images || []).map((image, imageIndex) => (
                                            <div key={imageIndex} className="relative aspect-square">
                                                <Image
                                                    src={image || "/placeholder.svg"}
                                                    alt={`Section ${index + 1} image ${imageIndex + 1}`}
                                                    className="h-full w-full rounded-lg object-cover"
                                                    width={500}
                                                    height={500}
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
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
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
                                                    onChange={(e) => handleSectionImages(index, e)}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isEditing && (
                                <Button variant="outline" onClick={addSection} className="h-full min-w-48">
                                    <span className="mr-2 text-lg">+</span> Add Section
                                </Button>
                            )}
                        </div>
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
