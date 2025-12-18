import React, { FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusSquare } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { postBuilding } from '../../../functions/building-crud';
import { BuildingProps } from '../../../types/building-props';
import { toast } from 'react-toastify';

interface addBuildingModelProps {
    projectId: string,
    applyChanges: () => void
}

const AddBuildingModel: React.FC<addBuildingModelProps> = ({ projectId, applyChanges }) => {

    const handleAddBuilding = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Create a partial building object with only the required properties
        const newBuilding: Partial<BuildingProps> = {
            name: formData.get('name') as string,
            projectId: projectId,
            // Add other required properties with default values
            description: '',
            area: 0,
            images: [],
            section: [],
            flatInfo: [],
            amenities: []
        };


        await postBuilding(newBuilding as BuildingProps)
        applyChanges();
        toast.success("Building Added successfully!")
    };

    return (
        <div>
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
                    <form onSubmit={(e: FormEvent<HTMLFormElement>) => { handleAddBuilding(e) }} className="space-y-4">
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
        </div>
    )
}

export default AddBuildingModel