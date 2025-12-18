'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PlusSquare, Edit, Trash2, Home } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { BuildingProps } from "../types/building-props"

interface BuildingCardProps {
    building: BuildingProps
    index: number
    totalBuildings: number
    onAddBuilding: (newBuilding: BuildingProps) => void
    onDelete: (index: number) => void
}

const BuildingCard = ({ building, index, onAddBuilding, onDelete }: BuildingCardProps) => {

    const handleAddBuilding = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        // Create a complete BuildingProps object with all required properties
        const newBuilding: BuildingProps = {
            _id: Math.random().toString(),
            name: formData.get("name") as string,
            totalFlats: Number(formData.get("totalFlats")),
            projectId: "projectId-placeholder",
            description: "",
            area: 0,
            images: [],
            section: [],
            flatInfo: [],
            amenities: []
        }

        onAddBuilding(newBuilding)
    }

    return (
        <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>
                    {building ? building.name : `Building ${index + 1}`}
                </CardTitle>
                <div className="flex gap-2">
                    {building && (
                        <>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Building</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleAddBuilding} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Building Name</Label>
                                            <Input id="name" name="name" defaultValue={building.name} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="totalFlats">Total Flats</Label>
                                            <Input
                                                id="totalFlats"
                                                name="totalFlats"
                                                type="number"
                                                defaultValue={building.totalFlats}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full">
                                            Update Building
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the building data.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => onDelete(index)}
                                            className="bg-destructive text-destructive-foreground"
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {building ? (
                    <div className="space-y-4">
                        <div>
                            <p className="text-muted-foreground">Total Flats</p>
                            <p>{building.totalFlats}</p>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="w-full" variant="outline">
                                    <Home className="w-4 h-4 mr-2" />
                                    Add Flat Details
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="flatNumber">Flat Number</Label>
                                        <Input id="flatNumber" name="flatNumber" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="floorNumber">Floor Number</Label>
                                        <Input id="floorNumber" name="floorNumber" type="number" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="area">Area (sq ft)</Label>
                                        <Input id="area" name="area" type="number" required />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        Add Flat
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                ) : (
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="flex items-center justify-center w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:bg-accent hover:cursor-pointer transition-colors">
                                <PlusSquare className="w-10 h-10 text-muted-foreground" />
                            </div>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Building</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddBuilding} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Building Name</Label>
                                    <Input id="name" name="name" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="totalFlats">Total Flats</Label>
                                    <Input
                                        id="totalFlats"
                                        name="totalFlats"
                                        type="number"
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full">
                                    Add Building
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardContent>
        </Card>
    )
}

export default BuildingCard;