"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Pencil, X, Check, Plus, Search } from "lucide-react"
import {
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

interface AmenitiesCardProps {
  clientId: string
  subTitle: string
  amenities: AmenityItem[]
  onSave: (data: {
    clientId: string
    subTitle: string
    amenities: AmenityItem[]
  }) => void
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
}: {
  iconName: string
  size?: number
  color?: string
}) => {
  const IconComponent = iconComponents[iconName as keyof typeof iconComponents]
  return IconComponent ? <IconComponent size={size} color={color} /> : <X size={size} />
}

export function AmenitiesCard({ clientId, subTitle = "", amenities = [], onSave }: AmenitiesCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempSubTitle, setTempSubTitle] = useState(subTitle)
  const [tempAmenities, setTempAmenities] = useState<AmenityItem[]>(amenities)
  const hasData = subTitle || amenities.length > 0

  // For the amenity dialog
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [tempSelectedIcon, setTempSelectedIcon] = useState<string | null>(null)
  const [tempAmenityName, setTempAmenityName] = useState("")

  const availableIcons = Object.keys(iconComponents)

  const filteredIcons = searchQuery.trim()
    ? availableIcons.filter((iconName) => iconName.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableIcons

  const handleEdit = () => {
    setTempSubTitle(subTitle)
    setTempAmenities([...amenities])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave({
      clientId,
      subTitle: tempSubTitle,
      amenities: tempAmenities,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempSubTitle(subTitle)
    setTempAmenities([...amenities])
    setIsEditing(false)
  }

  const handleIconClick = (iconName: string) => {
    setTempSelectedIcon(iconName)
  }

  const handleAddAmenity = () => {
    if (tempSelectedIcon && tempAmenityName.trim()) {
      const newAmenity = {
        name: tempAmenityName.trim(),
        icon: tempSelectedIcon,
      }
      setTempAmenities([...tempAmenities, newAmenity])
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
    setTempAmenities(tempAmenities.filter((_, i) => i !== index))
  }

  const renderSelectedAmenities = (items: AmenityItem[]) => {
    if (items.length === 0) {
      return <div className="flex h-20 items-center justify-center text-muted-foreground">No amenities added yet</div>
    }

    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((amenity, index) => (
          <div
            key={index}
            className="relative flex flex-col items-center rounded-lg border border-border bg-card/50 p-3"
          >
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                onClick={() => handleRemoveAmenity(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <div className="rounded-full bg-primary/10 p-2">
              <DisplayIcon iconName={amenity.icon} size={24} />
            </div>
            <p className="mt-2 text-center text-sm">{amenity.name}</p>
          </div>
        ))}
      </div>
    )
  }

  const renderIconGrid = () => {
    if (filteredIcons.length === 0) {
      return <div className="py-4 text-center text-muted-foreground">No icons found matching your search</div>
    }

    return (
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-7 md:grid-cols-9">
        {filteredIcons.map((iconName) => (
          <div
            key={iconName}
            className={`cursor-pointer rounded-lg border p-2 transition-all ${
              tempSelectedIcon === iconName
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
    <Card className="w-full overflow-hidden bg-card shadow-xl">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <div className="rounded-full border border-border bg-primary/10 p-2">
              <Home className="h-5 w-5" />
            </div>
            Amenities
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

      <CardContent className="space-y-6 p-6">
        {!hasData && !isEditing ? (
          <Button variant="ghost" className="hover:bg-muted/30" onClick={handleEdit}>
            <span className="mr-2 text-lg">+</span> Add Amenities
          </Button>
        ) : (
          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subtitle</label>
                  <Input
                    value={tempSubTitle}
                    onChange={(e) => setTempSubTitle(e.target.value)}
                    placeholder="Amenities section subtitle"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Amenities</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="h-3 w-3" /> Add Amenity
                    </Button>
                  </div>

                  {renderSelectedAmenities(tempAmenities)}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subtitle</div>
                  <div className="mt-1 text-lg font-medium">{subTitle || "-"}</div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Available Amenities</div>
                  {renderSelectedAmenities(amenities)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {isEditing && (
        <CardFooter className="justify-end gap-4 border-t border-border bg-muted/30 pt-3">
          <Button type="button" onClick={handleCancel} variant="outline">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            <Check className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </CardFooter>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Add New Amenity</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Search Icons</label>
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
                <label className="mb-2 block text-sm font-medium">Amenity Name</label>
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
    </Card>
  )
}
