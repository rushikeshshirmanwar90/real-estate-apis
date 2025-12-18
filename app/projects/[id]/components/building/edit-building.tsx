import React, { FormEvent } from 'react'
import { Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BuildingProps } from '../../../types/building-props';
import { putBuilding } from '../../../functions/building-crud';
import { toast } from 'react-toastify';

interface editBuildingProps {
    building: BuildingProps;
    projectId: string
    applyChanges: () => void
}

const EditBuilding: React.FC<editBuildingProps> = ({ building, projectId, applyChanges }) => {

    const updateBuilding = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Create a partial update object
        const updatedFields = {
            name: formData.get('name') as string,
            // Store totalFlats separately if needed
            // totalFlats: Number(formData.get('totalFlats')),
        };

        // Merge with existing building data to ensure all required fields are present
        const newBuilding: BuildingProps = {
            ...building,           // Keep all existing properties
            ...updatedFields,      // Update with new values
            projectId: projectId,  // Ensure projectId is updated
        };

        await putBuilding(building._id, newBuilding);
        applyChanges();
        toast.success("Building Updated successfully!")
    };

    return (
        <div>
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
                    <form className="space-y-4" onSubmit={(e) => {
                        updateBuilding(e);
                    }}>
                        <div className="space-y-2">
                            <Label htmlFor="name">Building Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={building.name}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totalFlats">Total Flats</Label>
                            <Input
                                id="totalFlats"
                                name="totalFlats"
                                type="number"
                                defaultValue={building.totalFlats || 0}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Update Building
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default EditBuilding