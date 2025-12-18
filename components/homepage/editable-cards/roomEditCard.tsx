"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Pencil, X, Check, Loader2, BedDouble, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RoomFeatureSelector } from "@/components/room-features-selector"
import { handleImageUpload } from "../../functions/image-handling"

// Types based on your Mongoose schema
interface Feature {
    icon: string
    name: string
}

interface Room {
    title: string
    description?: string
    images: string[]
    type: "rooms" | "bathroooms" | "kitchens" | "livingrooms" | "balconies" | "other" | "",
    area: number,
    features: Feature[]
}

interface RoomsEditableCardProps {
    rooms: Room[] | undefined
    onRoomsChange: (rooms: Room[]) => void
}

export function RoomsEditableCard({ rooms = [], onRoomsChange }: RoomsEditableCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [tempRooms, setTempRooms] = useState<Room[]>(
        rooms.map((room) => ({
            ...room,
            images: Array.isArray(room.images) ? room.images : [],
            features: Array.isArray(room.features) ? room.features : [],
        })),
    )
    const hasData = rooms.length > 0

    const roomTypes = [
        { value: "rooms", label: "Bedroom" },
        { value: "bathroooms", label: "Bathroom" },
        { value: "kitchens", label: "Kitchen" },
        { value: "livingrooms", label: "Living Room" },
        { value: "balconies", label: "Balcony" },
        { value: "other", label: "Other" },
    ]

    const handleRoomImages = async (roomIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        // Create a dummy setter that matches the expected type
        const dummySetImages: React.Dispatch<React.SetStateAction<string[]>> = () => { };

        // Call the original function but ignore its state updates
        const urls = await handleImageUpload(e, dummySetImages, setIsLoading);

        // Manually update the tempRooms state with the returned URLs
        if (urls && urls.length > 0) {
            setTempRooms((prev) =>
                prev.map((section, i) =>
                    i === roomIndex
                        ? { ...section, images: [...(section.images || []), ...urls] }
                        : section
                )
            );
        }
    };

    const handleEdit = () => {
        setTempRooms(
            rooms.map((room) => ({
                ...room,
                images: room.images || [],
                features: room.features || [],
            }))
        )
        setIsEditing(true)
    }

    const handleSave = () => {
        onRoomsChange(tempRooms)
        setIsEditing(false)
    }

    const handleCancel = () => {
        setTempRooms(
            rooms.map((room) => ({
                ...room,
                images: room.images || [],
                features: room.features || [],
            }))
        )
        setIsEditing(false)
    }

    const addRoom = () => {
        setTempRooms([
            ...tempRooms,
            {
                title: "",
                description: "",
                images: [],
                type: "",
                area: 0,
                features: [],
            },
        ])
    }

    const removeRoom = (index: number) => {
        setTempRooms(tempRooms.filter((_, i) => i !== index))
    }

    const updateRoom = (index: number, field: keyof Room, value: string) => {
        setTempRooms(tempRooms.map((room, i) =>
            i === index ? { ...room, [field]: value } : room
        ))
    }

    const removeImage = (roomIndex: number, imageIndex: number) => {
        setTempRooms((prev) =>
            prev.map((room, i) =>
                i === roomIndex ? {
                    ...room,
                    images: (room.images || []).filter((_, imgIdx) => imgIdx !== imageIndex)
                } : room
            )
        )
    }

    const handleFeaturesChange = (roomIndex: number, features: Feature[]) => {
        setTempRooms((prev) => prev.map((room, i) =>
            i === roomIndex ? { ...room, features } : room
        ))
    }

    const getRoomTypeLabel = (type: string) => {
        return roomTypes.find((t) => t.value === type)?.label || type
    }

    return (
        <Card className="w-full overflow-hidden bg-card shadow-xl">
            <CardHeader className="border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                        <div className="border border-border bg-primary/10 p-2 rounded-full">
                            <BedDouble size={20} className="text-primary" />
                        </div>
                        Room Information
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
                        <span className="mr-2 text-lg">+</span> Add Room Information
                    </Button>
                ) : (
                    <div className="space-y-6">
                        {(isEditing ? tempRooms : rooms).map((room, roomIndex) => (
                            <div key={roomIndex} className="relative space-y-4 rounded-lg bg-muted/30 p-4">
                                {isEditing && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                                        onClick={() => removeRoom(roomIndex)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                                {isEditing ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Room Title</label>
                                            <Input
                                                value={room.title}
                                                onChange={(e) => updateRoom(roomIndex, "title", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Room Type</label>
                                            <Select value={room.type} onValueChange={(value) => updateRoom(roomIndex, "type", value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select room type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roomTypes.map((type) => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Room Area (sq ft)</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={room.area || ""}
                                                onChange={(e) => updateRoom(roomIndex, "area", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <Textarea
                                                value={room.description || ""}
                                                onChange={(e) => updateRoom(roomIndex, "description", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="text-lg font-medium">{room.title}</div>
                                            <div className="text-sm text-muted-foreground">{room.description}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">Room Type</div>
                                            <div className="text-lg font-medium">{getRoomTypeLabel(room.type)}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">Room Area (sq ft)</div>
                                            <div className="text-lg font-medium">{room.area} sq ft</div>
                                        </div>
                                    </div>
                                )}

                                {/* Room Images */}
                                <div>
                                    <h3 className="text-md font-medium mb-2">Room Images</h3>
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                        {Array.isArray(room.images)
                                            ? room.images.map((image, imageIndex) => (
                                                <div key={imageIndex} className="relative aspect-square">
                                                    <img
                                                        src={image || "/placeholder.svg"}
                                                        alt={`Room ${roomIndex + 1} image ${imageIndex + 1}`}
                                                        className="h-full w-full rounded-lg object-cover"
                                                    />
                                                    {isEditing && (
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                                                            onClick={() => removeImage(roomIndex, imageIndex)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))
                                            : null}
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
                                                    onChange={(e) => handleRoomImages(roomIndex, e)}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Room Features - Using the new RoomFeatureSelector */}
                                {isEditing ? (
                                    <RoomFeatureSelector
                                        features={room.features}
                                        onChange={(features) => handleFeaturesChange(roomIndex, features)}
                                    />
                                ) : (
                                    <div>
                                        <h3 className="text-md font-medium mb-2">Room Features</h3>
                                        {!room.features || room.features.length === 0 ? (
                                            <div className="text-sm text-muted-foreground italic">
                                                No features added
                                            </div>
                                        ) : (
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {room.features.map((feature, featureIndex) => (
                                                    <div
                                                        key={featureIndex}
                                                        className="flex items-center gap-3 bg-background p-3 rounded-lg"
                                                    >
                                                        <div className="bg-muted rounded-md flex items-center justify-center aspect-square w-8 h-8">
                                                            <BedDouble className="h-4 w-4" />
                                                        </div>
                                                        <div className="text-sm font-medium">{feature.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isEditing && (
                            <Button variant="outline" onClick={addRoom} className="w-full">
                                <Plus className="h-4 w-4 mr-2" /> Add Room
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