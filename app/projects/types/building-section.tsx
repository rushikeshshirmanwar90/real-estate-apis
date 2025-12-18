import { projectProps } from "./project-props"
import { BuildingProps } from "./building-props"

export interface BuildingSectionProps {
    project: projectProps, buildings: BuildingProps, onAddBuilding: (item: BuildingProps) => void, onDeleteBuilding: () => void
}