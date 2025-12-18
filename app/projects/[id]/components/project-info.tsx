import { projectProps } from "../../types/project-props";

const ProjectInfo: React.FC<{ project: projectProps | undefined }> = ({ project }) => {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">{project?.name}</h1>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-muted-foreground">Location</p>
                    <p>{project?.area}, {project?.city}, {project?.state}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">Address</p>
                    <p>{project?.address}</p>
                </div>
            </div>
            <div>
                <p className="text-muted-foreground">Description</p>
                <p>{project?.description}</p>
            </div>
        </div>
    );
}

export default ProjectInfo;