"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Pencil, X, Check, Loader2, ImageIcon } from "lucide-react"
import { handleImageUpload } from "@/components/functions/image-handling"
import Image from "next/image"

type HeroSectionDetail = {
  title: string
  description: string
  image: string
  buttonText: string
  buttonLink: string
}

type HeroSectionProps = {
  clientId: string
  details: HeroSectionDetail[]
  onSave: (data: { clientId: string; details: HeroSectionDetail[] }) => void;
  loading?: boolean;
}

export function HeroSectionCard({ clientId, details = [], onSave, loading }: HeroSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempDetails, setTempDetails] = useState<HeroSectionDetail[]>(details)
  const [currentSlide, setCurrentSlide] = useState(0)
  const hasData = details.length > 0

  const handleEdit = () => {
    setTempDetails([...details])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave({
      clientId,
      details: tempDetails,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempDetails([...details])
    setIsEditing(false)
  }

  const handleFieldChange = (index: number, field: keyof HeroSectionDetail, value: string) => {
    setTempDetails((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const urls = await handleImageUpload(
      e,
      () => {
        // This is just to satisfy the function signature, we'll handle the state update differently
      },
      setIsLoading,
    )

    if (urls && urls.length > 0) {
      setTempDetails((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], image: urls[0] }
        return updated
      })
    }
  }

  const addSlide = () => {
    setTempDetails((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        image: "",
        buttonText: "Explore Now",
        buttonLink: "#",
      },
    ])
    setCurrentSlide(tempDetails.length)
  }

  const removeSlide = (index: number) => {
    setTempDetails((prev) => prev.filter((_, i) => i !== index))
    if (currentSlide >= index && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const renderSlideContent = (slide: HeroSectionDetail, index: number) => {
    if (isEditing) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={slide.title}
              onChange={(e) => handleFieldChange(index, "title", e.target.value)}
              placeholder="Slide title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={slide.description}
              onChange={(e) => handleFieldChange(index, "description", e.target.value)}
              placeholder="Slide description"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Button Text</label>
            <Input
              value={slide.buttonText}
              onChange={(e) => handleFieldChange(index, "buttonText", e.target.value)}
              placeholder="Button text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Button Link</label>
            <Input
              value={slide.buttonLink}
              onChange={(e) => handleFieldChange(index, "buttonLink", e.target.value)}
              placeholder="Button link (e.g., #contact)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image</label>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
              {slide.image ? (
                <img src={slide.image || "/placeholder.svg"} alt={slide.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted/30">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <label className="absolute bottom-2 right-2 cursor-pointer">
                <div className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                  <span>{isLoading ? "Uploading..." : "Change Image"}</span>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, index)} />
              </label>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          {slide?.image ? (
            <Image width={250} height={250} src={slide.image || "/placeholder.svg"} alt={slide.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/30">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</div>
            <div className="mt-1 text-lg font-medium">{slide.title || "-"}</div>
          </div>

          <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Button</div>
            <div className="mt-1 text-lg font-medium">{slide.buttonText || "-"}</div>
          </div>
        </div>

        <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</div>
          <div className="mt-1 text-lg font-medium">{slide.description || "-"}</div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <Card className="w-full overflow-hidden bg-card shadow-xl">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <div className="rounded-full border border-border bg-primary/10 p-2">
                <ImageIcon className="h-5 w-5" />
              </div>
              Hero Section
            </h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Hero Section Data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full overflow-hidden bg-card shadow-xl">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <div className="rounded-full border border-border bg-primary/10 p-2">
              <ImageIcon className="h-5 w-5" />
            </div>
            Hero Section
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
            <span className="mr-2 text-lg">+</span> Add Hero Slides
          </Button>
        ) : (
          <div className="space-y-6">
            {isEditing && (
              <div className="flex flex-wrap gap-2">
                {tempDetails.map((_, index) => (
                  <Button
                    key={index}
                    variant={currentSlide === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentSlide(index)}
                    className="relative"
                  >
                    Slide {index + 1}
                    {tempDetails.length > 1 && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-4 w-4 rounded-full p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSlide(index)
                        }}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    )}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={addSlide}>
                  <span className="text-xs">+</span>
                </Button>
              </div>
            )}

            {!isEditing && details.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {details.map((_, index) => (
                  <Button
                    key={index}
                    variant={currentSlide === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentSlide(index)}
                  >
                    Slide {index + 1}
                  </Button>
                ))}
              </div>
            )}

            {(isEditing ? tempDetails : details).length > 0 &&
              renderSlideContent((isEditing ? tempDetails : details)[currentSlide], currentSlide)}
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
    </Card>
  )
}
