import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BuildingProps } from '../../types/building-props';
import AddBuildingModel from './building/add-building';
import EditBuilding from './building/edit-building';
import DeleteBuilding from './building/delete-building';
import AddFlat from './flats/add-flat';

interface ProjectProps {
    _id: string;
    totalBuilding: number;
}

interface BuildingsSectionProps {
    project: ProjectProps | undefined;
    buildings: BuildingProps[];
    applyChanges: () => void
}

export default function BuildingsSection({
    project,
    buildings,
    applyChanges
}: BuildingsSectionProps) {

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Buildings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: project?.totalBuilding ?? 0 }).map((_, index) => {
                    const building: BuildingProps = buildings[index];
                    return (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle>
                                    {building ? building.name : `Building ${index + 1}`}
                                </CardTitle>
                                <div className="flex gap-2">
                                    {building && (
                                        <>
                                            <EditBuilding applyChanges={applyChanges} building={building} projectId={project?._id || ""} />
                                            <DeleteBuilding applyChanges={applyChanges} buildingId={building._id} />
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {building ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-muted-foreground">Total Flats</p>

                                        </div>
                                        <AddFlat />
                                    </div>
                                ) : (
                                    <AddBuildingModel projectId={project?._id || ""} applyChanges={applyChanges} />
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}