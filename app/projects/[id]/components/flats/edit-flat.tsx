'use client'

import { FormEvent, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit } from 'lucide-react'
import { toast } from 'sonner'

interface FlatProps {
    _id: string
    name: string
    BHK: number
    area: number
    description?: string
    total: number
    booked: number
    images: string[]
    ytLink?: string
}

interface EditFlatProps {
    flat: FlatProps
    onSuccess: () => void
}

const EditFlat = ({ flat, onSuccess }: EditFlatProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [images, setImages] = useState<string[]>(flat.images)

    const handleEditFlat = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const formData = new FormData(e.currentTarget)
            const updatedFlat = {
                name: formData.get('name'),
                BHK: Number(formData.get('BHK')),
                area: Number(formData.get('area')),
                description: formData.get('description'),
                total: Number(formData.get('total')),
                booked: Number(formData.get('booked')),
                images: images,
                ytLink: formData.get('ytLink'),
            }

            const response = await fetch(`/api/flats/${flat._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedFlat),
            })

            if (!response.ok) {
                throw new Error('Failed to update flat')
            }

            toast.success('Flat updated successfully!', {
                description: `${updatedFlat.name} has been updated.`,
            })
            onSuccess()
        } catch (error) {
            toast.error('Failed to update flat', {
                description: `Please try again later. ${error}`,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files) {
            const imageUrls = Array.from(files).map((file) => URL.createObjectURL(file))
            setImages((prev) => [...prev, ...imageUrls])
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Flat</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditFlat} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Flat Name/Number</Label>
                        <Input id="name" name="name" defaultValue={flat.name} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="BHK">BHK</Label>
                            <Input id="BHK" name="BHK" type="number" defaultValue={flat.BHK} required min="1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area">Area (sq ft)</Label>
                            <Input id="area" name="area" type="number" defaultValue={flat.area} required min="1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="total">Total Units</Label>
                            <Input id="total" name="total" type="number" defaultValue={flat.total} required min="1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="booked">Booked Units</Label>
                            <Input
                                id="booked"
                                name="booked"
                                type="number"
                                defaultValue={flat.booked}
                                required
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" defaultValue={flat.description} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="images">Add More Images</Label>
                        <Input
                            id="images"
                            name="images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                        />
                        {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {images.map((url, index) => (
                                    <img
                                        key={index}
                                        src={url}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-20 object-cover rounded-md"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ytLink">YouTube Video Link (Optional)</Label>
                        <Input id="ytLink" name="ytLink" type="url" defaultValue={flat.ytLink} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update Flat'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default EditFlat
