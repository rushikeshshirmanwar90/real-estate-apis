"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ImagePlus, Pencil, X, Check, Loader2, Users, Plus, Trash2 } from "lucide-react"
import { handleImageUpload } from "@/components/functions/image-handling"
import Image from "next/image"

type TeamMember = {
  name: string
  position: string
  image: string
}

type OurTeamProps = {
  clientId: string
  subTitle: string
  teamMembers: TeamMember[]
  loading?: boolean
  onSave: (data: {
    clientId: string
    subTitle: string
    teamMembers: TeamMember[]
  }) => void
}

export function OurTeamCard({
  clientId,
  subTitle = "",
  teamMembers = [],
  loading = false,
  onSave
}: OurTeamProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempSubTitle, setTempSubTitle] = useState(subTitle)
  const [tempTeamMembers, setTempTeamMembers] = useState<TeamMember[]>(teamMembers)

  // Update internal state when props change
  useEffect(() => {
    setTempSubTitle(subTitle)
    setTempTeamMembers([...teamMembers])
  }, [subTitle, teamMembers])

  const hasData = subTitle || teamMembers.length > 0

  const handleEdit = () => {
    setTempSubTitle(subTitle)
    setTempTeamMembers([...teamMembers])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave({
      clientId,
      subTitle: tempSubTitle,
      teamMembers: tempTeamMembers,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempSubTitle(subTitle)
    setTempTeamMembers([...teamMembers])
    setIsEditing(false)
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
      setTempTeamMembers((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], image: urls[0] }
        return updated
      })
    }
  }

  const addTeamMember = () => {
    setTempTeamMembers([...tempTeamMembers, { name: "", position: "", image: "" }])
  }

  const removeTeamMember = (index: number) => {
    setTempTeamMembers(tempTeamMembers.filter((_, i) => i !== index))
  }

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    setTempTeamMembers(tempTeamMembers.map((member, i) => (i === index ? { ...member, [field]: value } : member)))
  }

  // Show loading state
  if (loading) {
    return (
      <Card className="w-full overflow-hidden bg-card shadow-xl">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <div className="rounded-full border border-border bg-primary/10 p-2">
                <Users className="h-5 w-5" />
              </div>
              Our Team
            </h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading team data...</span>
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
              <Users className="h-5 w-5" />
            </div>
            Our Team
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
            <span className="mr-2 text-lg">+</span> Add Team Members
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
                    placeholder="Team section subtitle"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Team Members</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTeamMember}
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="h-3 w-3" /> Add Member
                    </Button>
                  </div>

                  {tempTeamMembers.map((member, index) => (
                    <div key={index} className="relative space-y-3 rounded-lg border border-border p-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTeamMember(index)}
                        className="absolute right-2 top-2 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={member.name}
                          onChange={(e) => updateTeamMember(index, "name", e.target.value)}
                          placeholder="Team member name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Position</label>
                        <Input
                          value={member.position}
                          onChange={(e) => updateTeamMember(index, "position", e.target.value)}
                          placeholder="Team member position"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Photo</label>
                        <div className="relative aspect-square w-[20rem] overflow-hidden rounded-lg border border-border">
                          {member.image ? (
                            <Image
                              width={320}
                              height={320}
                              src={member.image}
                              alt={member.name || 'Team member'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted/30">
                              <ImagePlus className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}

                          <label className="absolute bottom-2 right-2 cursor-pointer">
                            <div className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                              {isLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ImagePlus className="h-3 w-3" />
                              )}
                              <span>{isLoading ? "Uploading..." : "Change Photo"}</span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, index)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}

                  {tempTeamMembers.length === 0 && (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No team members added yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subtitle</div>
                  <div className="mt-1 text-lg font-medium">{subTitle || "No subtitle added"}</div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Team Members ({teamMembers.length})</div>
                  {teamMembers.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {teamMembers.map((member, index) => (
                        <div key={index} className="flex flex-col items-center text-center">
                          <div className="mb-3 aspect-square w-32 overflow-hidden rounded-lg">
                            {member.image ? (
                              <Image
                                width={128}
                                height={128}
                                src={member.image}
                                alt={member.name || 'Team member'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted/30">
                                <Users className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <h3 className="text-lg font-medium">{member.name || 'Unnamed'}</h3>
                          <p className="text-sm text-muted-foreground">{member.position || 'No position'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No team members added yet</p>
                    </div>
                  )}
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
    </Card>
  )
}