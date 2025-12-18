"use client"

import { useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"
import {
    BedDouble,
    Bath,
    ShowerHeadIcon as Shower,
    Tv,
    Wifi,
    Wind,
    Refrigerator,
    Microwave,
    WashingMachineIcon as Washing,
    Shirt,
    PanelTop,
    LayoutDashboard,
    Sofa,
    Utensils,
    Car,
    Dumbbell,
    Waves,
    Shield,
    ArrowUpDown,
    CircleDot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

// Types
interface Feature {
    icon: string
    name: string
}

interface RoomFeatureSelectorProps {
    features: Feature[] | undefined
    onChange: (features: Feature[]) => void
    className?: string
}

// Available icons for features with explicit components
const featureIcons = [
    { value: "bed", label: "Bed", icon: BedDouble },
    { value: "bath", label: "Bath", icon: Bath },
    { value: "shower", label: "Shower", icon: Shower },
    { value: "tv", label: "TV", icon: Tv },
    { value: "wifi", label: "WiFi", icon: Wifi },
    { value: "airConditioner", label: "AC", icon: Wind },
    { value: "fridge", label: "Fridge", icon: Refrigerator },
    { value: "microwave", label: "Microwave", icon: Microwave },
    { value: "washer", label: "Washing Machine", icon: Washing },
    { value: "wardrobe", label: "Wardrobe", icon: Shirt },
    { value: "window", label: "Window", icon: PanelTop },
    { value: "desk", label: "Desk", icon: LayoutDashboard },
    { value: "sofa", label: "Sofa", icon: Sofa },
    { value: "diningTable", label: "Dining Table", icon: Utensils },
    { value: "parking", label: "Parking", icon: Car },
    { value: "gym", label: "Gym", icon: Dumbbell },
    { value: "pool", label: "Pool", icon: Waves },
    { value: "security", label: "Security", icon: Shield },
    { value: "elevator", label: "Elevator", icon: ArrowUpDown },
    { value: "balcony", label: "Balcony", icon: PanelTop },
]

export function RoomFeatureSelector({ features = [], onChange, className }: RoomFeatureSelectorProps) {
    const [open, setOpen] = useState(false)
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [featureName, setFeatureName] = useState("")

    const addFeature = () => {
        if (selectedIcon && featureName.trim()) {
            onChange([...(features || []), { icon: selectedIcon, name: featureName.trim() }])
            setSelectedIcon(null)
            setFeatureName("")
        }
    }

    const removeFeature = (index: number) => {
        onChange((features || []).filter((_, i) => i !== index))
    }

    const getIconComponent = (iconName: string) => {
        const iconConfig = featureIcons.find((icon) => icon.value === iconName)
        if (iconConfig) {
            const IconComponent = iconConfig.icon
            return <IconComponent className="h-4 w-4" />
        }
        return <CircleDot className="h-4 w-4" />
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-md font-medium">Room Features</h3>
            </div>

            {/* Feature list */}
            <div className="space-y-2">
                {!features || features.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">No features added</div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {(features || []).map((feature, index) => (
                            <Card key={index} className="overflow-hidden">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-muted rounded-md flex items-center justify-center aspect-square w-8 h-8">
                                            {getIconComponent(feature.icon)}
                                        </div>
                                        <span className="font-medium">{feature.name}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFeature(index)}
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Add feature form */}
            <div className="flex flex-col sm:flex-row gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="justify-between w-full sm:w-[200px]"
                        >
                            {selectedIcon ? (
                                <div className="flex items-center gap-2">
                                    {getIconComponent(selectedIcon)}
                                    <span>{featureIcons.find((icon) => icon.value === selectedIcon)?.label || "Select icon"}</span>
                                </div>
                            ) : (
                                "Select icon"
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandInput placeholder="Search icons..." />
                            <CommandList>
                                <CommandEmpty>No icon found.</CommandEmpty>
                                <CommandGroup>
                                    {featureIcons.map((icon) => {
                                        const IconComponent = icon.icon
                                        return (
                                            <CommandItem
                                                key={icon.value}
                                                value={icon.value}
                                                onSelect={(currentValue) => {
                                                    setSelectedIcon(currentValue)
                                                    setOpen(false)
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <IconComponent className="h-4 w-4" />
                                                    {icon.label}
                                                </div>
                                                {selectedIcon === icon.value && <Check className="ml-auto h-4 w-4" />}
                                            </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <div className="flex-1 flex gap-2">
                    <Input
                        value={featureName}
                        onChange={(e) => setFeatureName(e.target.value)}
                        placeholder="Feature name"
                        className="flex-1"
                    />
                    <Button onClick={addFeature} disabled={!selectedIcon || !featureName.trim()} className="whitespace-nowrap">
                        <Plus className="h-4 w-4 mr-2" /> Add
                    </Button>
                </div>
            </div>
        </div>
    )
}

