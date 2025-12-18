"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, X, Check, HelpCircle, Plus, Trash2, Loader2 } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

type FAQ = {
  title: string
  description: string
}

type FAQCardProps = {
  clientId: string
  subTitle: string
  FAQs: FAQ[],
  loading?: boolean
  onSave: (data: {
    clientId: string
    subTitle: string
    FAQs: FAQ[]
  }) => void
}

export function FAQCard({ clientId, subTitle = "", FAQs = [], onSave, loading }: FAQCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempSubTitle, setTempSubTitle] = useState(subTitle)
  const [tempFAQs, setTempFAQs] = useState<FAQ[]>(FAQs)
  const hasData = subTitle || FAQs.length > 0

  const handleEdit = () => {
    setTempSubTitle(subTitle)
    setTempFAQs([...FAQs])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave({
      clientId,
      subTitle: tempSubTitle,
      FAQs: tempFAQs,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempSubTitle(subTitle)
    setTempFAQs([...FAQs])
    setIsEditing(false)
  }

  const addFAQ = () => {
    setTempFAQs([...tempFAQs, { title: "", description: "" }])
  }

  const removeFAQ = (index: number) => {
    setTempFAQs(tempFAQs.filter((_, i) => i !== index))
  }

  const updateFAQ = (index: number, field: keyof FAQ, value: string) => {
    setTempFAQs(tempFAQs.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)))
  }

  // Show loading state
  if (loading) {
    return (
      <Card className="w-full overflow-hidden bg-card shadow-xl">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <div className="rounded-full border border-border bg-primary/10 p-2">
                <HelpCircle className="h-5 w-5" />
              </div>
              Frequently Asked Questions
            </h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading FAQ data...</span>
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
              <HelpCircle className="h-5 w-5" />
            </div>
            Frequently Asked Questions
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
            <span className="mr-2 text-lg">+</span> Add FAQs
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
                    placeholder="FAQ section subtitle"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Questions & Answers</label>
                    <Button type="button" variant="outline" size="sm" onClick={addFAQ} className="h-7 gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Add FAQ
                    </Button>
                  </div>

                  {tempFAQs.map((faq, index) => (
                    <div key={index} className="relative space-y-3 rounded-lg border border-border p-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFAQ(index)}
                        className="absolute right-2 top-2 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Question</label>
                        <Input
                          value={faq.title}
                          onChange={(e) => updateFAQ(index, "title", e.target.value)}
                          placeholder="Question"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Answer</label>
                        <Textarea
                          value={faq.description}
                          onChange={(e) => updateFAQ(index, "description", e.target.value)}
                          placeholder="Answer"
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}

                  {tempFAQs.length === 0 && (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No FAQs added yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subtitle</div>
                  <div className="mt-1 text-lg font-medium">{subTitle || "-"}</div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Questions & Answers</div>
                  {FAQs.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {FAQs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="text-left font-medium">{faq.title}</AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">{faq.description}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No FAQs added yet</p>
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
