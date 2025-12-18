"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, X, Check, MapPin, Phone, Mail } from "lucide-react"

type ContactUsProps = {
  subTitle: string
  address: string
  phone1: string
  phone2?: string
  email1: string
  email2?: string
  mapLink: string,
  onSave: (data: {
    subTitle: string
    address: string
    phone1: string
    phone2?: string
    email1: string
    email2?: string
    mapLink: string
  }) => void
}

export function ContactUsCard({
  subTitle = "",
  address = "",
  phone1 = "",
  phone2 = "",
  email1 = "",
  email2 = "",
  mapLink = "",
  onSave,
}: ContactUsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempSubTitle, setTempSubTitle] = useState(subTitle)
  const [tempAddress, setTempAddress] = useState(address)
  const [tempPhone1, setTempPhone1] = useState(phone1)
  const [tempPhone2, setTempPhone2] = useState(phone2 || "")
  const [tempEmail1, setTempEmail1] = useState(email1)
  const [tempEmail2, setTempEmail2] = useState(email2 || "")
  const [tempMapLink, setTempMapLink] = useState(mapLink)
  const hasData = subTitle || address || phone1 || email1 || mapLink

  const handleEdit = () => {
    setTempSubTitle(subTitle)
    setTempAddress(address)
    setTempPhone1(phone1)
    setTempPhone2(phone2 || "")
    setTempEmail1(email1)
    setTempEmail2(email2 || "")
    setTempMapLink(mapLink)
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave({
      subTitle: tempSubTitle,
      address: tempAddress,
      phone1: tempPhone1,
      phone2: tempPhone2 || undefined,
      email1: tempEmail1,
      email2: tempEmail2 || undefined,
      mapLink: tempMapLink,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempSubTitle(subTitle)
    setTempAddress(address)
    setTempPhone1(phone1)
    setTempPhone2(phone2 || "")
    setTempEmail1(email1)
    setTempEmail2(email2 || "")
    setTempMapLink(mapLink)
    setIsEditing(false)
  }

  return (
    <Card className="w-full overflow-hidden bg-card shadow-xl">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <div className="rounded-full border border-border bg-primary/10 p-2">
              <Phone className="h-5 w-5" />
            </div>
            Contact Us
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
            <span className="mr-2 text-lg">+</span> Add Contact Information
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
                    placeholder="Contact Us subtitle"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Textarea
                    value={tempAddress}
                    onChange={(e) => setTempAddress(e.target.value)}
                    placeholder="Full address"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Phone</label>
                    <Input
                      value={tempPhone1}
                      onChange={(e) => setTempPhone1(e.target.value)}
                      placeholder="Primary phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Secondary Phone (Optional)</label>
                    <Input
                      value={tempPhone2}
                      onChange={(e) => setTempPhone2(e.target.value)}
                      placeholder="Secondary phone number"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Email</label>
                    <Input
                      type="email"
                      value={tempEmail1}
                      onChange={(e) => setTempEmail1(e.target.value)}
                      placeholder="Primary email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Secondary Email (Optional)</label>
                    <Input
                      type="email"
                      value={tempEmail2}
                      onChange={(e) => setTempEmail2(e.target.value)}
                      placeholder="Secondary email address"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Map Link</label>
                  <Input
                    value={tempMapLink}
                    onChange={(e) => setTempMapLink(e.target.value)}
                    placeholder="Google Maps embed link"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the embed link from Google Maps (iframe src URL)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subtitle</div>
                  <div className="mt-1 text-lg font-medium">{subTitle || "-"}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="col-span-3 sm:col-span-1">
                    <div className="flex flex-col gap-4">
                      <div className="rounded-lg border border-border p-4">
                        <div className="mb-2 flex items-center gap-2 font-medium">
                          <MapPin className="h-4 w-4 text-primary" /> Address
                        </div>
                        <p className="text-sm text-muted-foreground">{address || "-"}</p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <div className="mb-2 flex items-center gap-2 font-medium">
                          <Phone className="h-4 w-4 text-primary" /> Phone
                        </div>
                        <p className="text-sm text-muted-foreground">{phone1 || "-"}</p>
                        {phone2 && <p className="text-sm text-muted-foreground">{phone2}</p>}
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <div className="mb-2 flex items-center gap-2 font-medium">
                          <Mail className="h-4 w-4 text-primary" /> Email
                        </div>
                        <p className="text-sm text-muted-foreground">{email1 || "-"}</p>
                        {email2 && <p className="text-sm text-muted-foreground">{email2}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 sm:col-span-2">
                    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
                      {mapLink ? (
                        <iframe
                          src={mapLink}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Location map"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/30">
                          <MapPin className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
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
