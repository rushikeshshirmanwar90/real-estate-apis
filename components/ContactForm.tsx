"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

interface Contact {
    name: string
    phoneNumber: string
}

export default function Component() {
    const [contacts, setContacts] = useState<Contact[]>([{ name: "", phoneNumber: "" }])

    const addContact = () => {
        setContacts([...contacts, { name: "", phoneNumber: "" }])
    }

    const removeContact = (index: number) => {
        if (contacts.length > 1) {
            setContacts(contacts.filter((_, i) => i !== index))
        }
    }

    const updateContact = (index: number, field: keyof Contact, value: string) => {
        const updatedContacts = contacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact))
        setContacts(updatedContacts)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log("Submitted contacts:", contacts)
        // Handle form submission here
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-2xl px-4">
                <Card>
                    <CardHeader className="text-center">
                        {/* Manthan Infracare Logo */}
                        <div className="mx-auto mb-4">
                            <Image width={500} height={500} src="/logo-mini.png" alt="Manthan Infracare Logo" className="h-16 w-auto mx-auto" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-800">Manthan Infracare</CardTitle>
                        <CardDescription className="text-lg font-medium text-gray-600 mb-2">
                            Contact Information Form
                        </CardDescription>
                        <CardDescription>Add multiple contacts with their names and phone numbers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                {contacts.map((contact, index) => (
                                    <div key={index} className="rounded-md border border-gray-200 p-3 bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`name-${index}`} className="text-xs font-medium text-gray-600">
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id={`name-${index}`}
                                                        type="text"
                                                        placeholder="Enter full name"
                                                        value={contact.name}
                                                        onChange={(e) => updateContact(index, "name", e.target.value)}
                                                        required
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`phone-${index}`} className="text-xs font-medium text-gray-600">
                                                        Phone Number
                                                    </Label>
                                                    <Input
                                                        id={`phone-${index}`}
                                                        type="tel"
                                                        placeholder="(555) 123-4567"
                                                        value={contact.phoneNumber}
                                                        onChange={(e) => updateContact(index, "phoneNumber", e.target.value)}
                                                        required
                                                        className="h-9"
                                                    />
                                                </div>
                                            </div>
                                            {contacts.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeContact(index)}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button type="button" variant="outline" onClick={addContact} className="w-full">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Another Contact
                            </Button>

                            <div className="flex gap-3">
                                <Button type="submit" className="flex-1">
                                    Submit Contacts
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setContacts([{ name: "", phoneNumber: "" }])}>
                                    Clear All
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}