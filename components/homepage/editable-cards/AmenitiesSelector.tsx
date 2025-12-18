"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

import {
    X,
    Plus,
    Search,
    Camera,
    Settings,
    User,
    Home,
    Mail,
    Phone,
    Wifi,
    Tv,
    Car,
    Coffee,
    Bath,
    Bed,
    Hotel,
    Key,
    Computer,
    Sun,
    Music,
} from "lucide-react"

export interface AmenityItem {
    name: string
    icon: string
}

interface AmenitiesSelectorProps {
    selectedAmenities?: AmenityItem[]
    onAmenitiesChange: (amenities: AmenityItem[]) => void
}

const iconComponents = {
    Camera,
    Settings,
    User,
    Home,
    Mail,
    Phone,
    Wifi,
    Tv,
    Car,
    Coffee,
    Bath,
    Bed,
    Hotel,
    Key,
    Computer,
    Sun,
    Music,
    X,
}

export const DisplayIcon = ({
    iconName,
    size = 32,
    color = "currentColor",
}: { iconName: string; size?: number; color?: string }) => {
    const IconComponent = iconComponents[iconName as keyof typeof iconComponents]
    return IconComponent ? <IconComponent size={size} color={color} /> : <X size={size} />
}

const AmenitiesSelector: React.FC<AmenitiesSelectorProps> = ({ selectedAmenities = [], onAmenitiesChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [tempSelectedIcon, setTempSelectedIcon] = useState<string | null>(null)
    const [tempAmenityName, setTempAmenityName] = useState("")

    const availableIcons = useMemo(() => {
        return Object.keys(iconComponents)
    }, [])

    const filteredIcons = useMemo(() => {
        if (!searchQuery.trim()) return availableIcons
        return availableIcons.filter((iconName) => iconName.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [availableIcons, searchQuery])

    const handleIconClick = (iconName: string) => {
        setTempSelectedIcon(iconName)
    }

    const handleAddAmenity = () => {
        if (tempSelectedIcon && tempAmenityName.trim()) {
            const newAmenity = {
                name: tempAmenityName.trim(),
                icon: tempSelectedIcon,
            }
            const currentAmenities = Array.isArray(selectedAmenities) ? selectedAmenities : []
            onAmenitiesChange([...currentAmenities, newAmenity])
            handleCloseModal()
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setTempSelectedIcon(null)
        setTempAmenityName("")
        setSearchQuery("")
    }

    const handleRemoveAmenity = (index: number) => {
        if (!Array.isArray(selectedAmenities)) return
        const updatedAmenities = selectedAmenities.filter((_, i) => i !== index)
        onAmenitiesChange(updatedAmenities)
    }

    const renderSelectedAmenities = () => {
        if (!Array.isArray(selectedAmenities) || selectedAmenities.length === 0) {
            return <div className="text-center py-8 text-muted-foreground">No Amenities Added</div>
        }

        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedAmenities.map((amenity, index) => (
                    <div
                        key={index}
                        className="relative border border-border bg-card/50 rounded-lg p-3 flex flex-col items-center"
                    >
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => handleRemoveAmenity(index)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <div className="bg-primary/10 p-2 rounded-full">
                            <DisplayIcon iconName={amenity.icon} size={24} />
                        </div>
                        <p className="text-sm text-center mt-2">{amenity.name}</p>
                    </div>
                ))}
            </div>
        )
    }

    const renderIconGrid = () => {
        if (!Array.isArray(filteredIcons) || filteredIcons.length === 0) {
            return <div className="text-center py-4 text-muted-foreground">No icons found matching your search</div>
        }

        return (
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-3">
                {filteredIcons.map((iconName) => (
                    <div
                        key={iconName}
                        className={`p-2 border rounded-lg cursor-pointer transition-all ${tempSelectedIcon === iconName
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-primary/10"
                            }`}
                        onClick={() => handleIconClick(iconName)}
                    >
                        <DisplayIcon iconName={iconName} size={24} />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <>
            <Card className="w-full overflow-hidden bg-card shadow-xl">
                <CardHeader className="border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                            <div className="border border-border bg-primary/10 p-2 rounded-full">
                                <Plus size={20} className="text-primary" />
                            </div>
                            Amenities
                        </h2>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(true)}
                            className="border-primary text-primary hover:bg-primary/10"
                        >
                            Add Amenity
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">{renderSelectedAmenities()}</CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Add New Amenity</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium">Search Icons</label>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search icons..."
                                        className="pr-10"
                                    />
                                    <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>

                            <div className="max-h-60 overflow-y-auto p-1">{renderIconGrid()}</div>

                            <div>
                                <label className="block mb-2 text-sm font-medium">Amenity Name</label>
                                <Input
                                    type="text"
                                    value={tempAmenityName}
                                    onChange={(e) => setTempAmenityName(e.target.value)}
                                    placeholder="Enter amenity name"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddAmenity}
                            disabled={!tempSelectedIcon || !tempAmenityName.trim()}
                            variant="default"
                        >
                            Add Amenity
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default AmenitiesSelector

