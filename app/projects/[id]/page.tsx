'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProjectCarousel from './components/project-carousel';
import ProjectInfo from './components/project-info';
import BuildingsSection from './components/building-section';
import { BuildingProps } from '../types/building-props';
import { projectProps } from '../types/project-props';
import { getSingleProject } from '@/functions/project/crud';
import { getBuildings } from '../functions/building-crud';

const ProjectDetails = () => {
    const params = useParams();
    let projectId: string = "";

    if (params) {
        projectId = String(params.id);
    }

    const [buildings, setBuildings] = useState<BuildingProps[]>([]);
    const [loading, setLoading] = useState<boolean>();
    const [project, setProject] = useState<projectProps>();
    const [randomNums, setRandomNums] = useState<number>(123456);


    // FETCH THE BUILDING DATA
    useEffect(() => {
        setLoading(true)
        const getData = async () => {
            const data = await getBuildings(projectId)
            setBuildings(data);
        }
        getData();
        setLoading(false);
    }, [projectId, loading, randomNums])


    // FETCH THE PROJECT DATA
    useEffect(() => {
        const getProjectData = async (projectId: string) => {
            const data = await getSingleProject(projectId);
            setProject(data);
            setLoading(false);
        }
        getProjectData(projectId);
    }, [loading, projectId])

    // JAVASCRIPT FUNCTION GENERATE RANDOM FUNCTIONS
    const generateRandomNumber = () => {
        const num = Math.floor(Math.random() * 1000000);
        setRandomNums(num);
    }

    return (
        <div className="container mx-auto py-8 pb-16 space-y-8">
            <ProjectCarousel images={project?.images} />
            <div className='px-10' >
                <ProjectInfo project={project} />
                <div className="h-10"></div>
                <BuildingsSection
                    project={project}
                    buildings={buildings}
                    applyChanges={generateRandomNumber}
                />
            </div>
        </div>

    );
}

export default ProjectDetails;