"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Pencil, X, Check, Loader2, Info, Plus, Trash2 } from "lucide-react"
import { handleImageUpload } from "@/components/functions/image-handling"
import Image from "next/image"

type Point = {
  title: string
  description: string
}

type AboutUsProps = {
  clientId: string
  subTitle: string
  description: string
  image: string
  points: Point[]
  loading?: boolean
  onSave: (data: {
    clientId: string
    subTitle: string
    description: string
    image: string
    points: Point[]
  }) => void
}

export function AboutUsCard({
  clientId,
  subTitle = "",
  description = "",
  image = "",
  points = [],
  onSave,
  loading
}: AboutUsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempSubTitle, setTempSubTitle] = useState(subTitle)
  const [tempDescription, setTempDescription] = useState(description)
  const [tempImage, setTempImage] = useState(image)
  const [tempPoints, setTempPoints] = useState<Point[]>(points)
  const hasData = subTitle || description || image || points.length > 0

  const handleEdit = () => {
    setTempSubTitle(subTitle)
    setTempDescription(description)
    setTempImage(image)
    setTempPoints([...points])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave({
      clientId,
      subTitle: tempSubTitle,
      description: tempDescription,
      image: tempImage,
      points: tempPoints,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempSubTitle(subTitle)
    setTempDescription(description)
    setTempImage(image)
    setTempPoints([...points])
    setIsEditing(false)
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await handleImageUpload(
      e,
      () => {
        // This is just to satisfy the function signature, we'll handle the state update differently
      },
      setIsLoading,
    )
    if (urls && urls.length > 0) {
      setTempImage(urls[0])
    }
  }

  const addPoint = () => {
    setTempPoints([...tempPoints, { title: "", description: "" }])
  }

  const removePoint = (index: number) => {
    setTempPoints(tempPoints.filter((_, i) => i !== index))
  }

  const updatePoint = (index: number, field: keyof Point, value: string) => {
    setTempPoints(tempPoints.map((point, i) => (i === index ? { ...point, [field]: value } : point)))
  }


  // Show loading state
  if (loading) {
    return (
      <Card className="w-full overflow-hidden bg-card shadow-xl">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <div className="rounded-full border border-border bg-primary/10 p-2">
                <Info className="h-5 w-5" />

              </div>
              About Us
            </h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading About us section...</span>
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
              <Info className="h-5 w-5" />
            </div>
            About Us
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
            <span className="mr-2 text-lg">+</span> Add About Us Information
          </Button>
        ) : (
          <div className="space-y-6">
            {isEditing ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subtitle</label>
                    <Input
                      value={tempSubTitle}
                      onChange={(e) => setTempSubTitle(e.target.value)}
                      placeholder="About Us subtitle"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      placeholder="About Us description"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Image</label>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                      {tempImage ? (
                        <Image
                          src={tempImage || "/placeholder.svg"}
                          alt="About Us"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/30">
                          <ImagePlus className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}

                      <label className="absolute bottom-2 right-2 cursor-pointer">
                        <div className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                          <span>{isLoading ? "Uploading..." : "Change Image"}</span>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Key Points</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPoint}
                        className="h-7 gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" /> Add Point
                      </Button>
                    </div>

                    {tempPoints.map((point, index) => (
                      <div key={index} className="relative space-y-3 rounded-lg border border-border p-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePoint(index)}
                          className="absolute right-2 top-2 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Title</label>
                          <Input
                            value={point.title}
                            onChange={(e) => updatePoint(index, "title", e.target.value)}
                            placeholder="Point title"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            value={point.description}
                            onChange={(e) => updatePoint(index, "description", e.target.value)}
                            placeholder="Point description"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}

                    {tempPoints.length === 0 && (
                      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                        <p className="text-sm text-muted-foreground">No points added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  {image ? (
                    <img src={image || "/placeholder.svg"} alt="About Us" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/30">
                      <ImagePlus className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subtitle</div>
                    <div className="mt-1 text-lg font-medium">{subTitle || "-"}</div>
                  </div>
                </div>

                <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</div>
                  <div className="mt-1 text-lg font-medium">{description || "-"}</div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Key Points</div>
                  {points.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {points.map((point, index) => (
                        <div key={index} className="rounded-lg border border-border p-3">
                          <div className="font-medium">{point.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{point.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No points added yet</p>
                    </div>
                  )}
                </div>
              </>
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
    </Card>
  )
}