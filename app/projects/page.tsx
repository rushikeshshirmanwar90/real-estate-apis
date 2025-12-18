'use client'

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import axios from "axios"
import TopHeader from '@/components/TopHeader';
import ProjectCard from '@/components/ProjectCard';
import { projectProps } from './types/project-props';
import domain from '@/components/utils/domain';

export default function Page() {
    const [projectData, setProjectData] = useState<projectProps[]>([]);
    const [isProjectLoading, setIsProjectLoading] = useState<boolean>(false);
    const [handleChange, setHandleChange] = useState<number>();
    const [error, setError] = useState<string | null>(null);

    const fetchProjectData = async () => {
        setIsProjectLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${domain}/api/project?clientId=${process.env.NEXT_PUBLIC_CLIENT_ID}`);
            const data = res.data;
            setProjectData(data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Failed to fetch project data');
            } else {
                setError('An unexpected error occurred');
            }
            console.error("Error fetching project data:", error);
        } finally {
            setIsProjectLoading(false);
        }
    };

    const refreshData = () => {
        setHandleChange(Math.random());
    };

    useEffect(() => {
        fetchProjectData();
    }, [handleChange]);

    return (
        <div>
            <TopHeader
                buttonText='Add Project'
                tagTitle='Featured Properties'
                title='Our Featured Properties'
                TagIcon={Plus}
                link="/project-form"
            />
            <div className='flex flex-col items-center justify-center my-5 gap-5'>
                {isProjectLoading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full border-4 border-primary border-t-transparent w-16 h-16" />
                        <p className="text-lg font-medium">Loading projects...</p>
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center">
                        <p className="text-lg font-medium">{error}</p>
                        <button
                            onClick={refreshData}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    projectData.map((item: projectProps, index: number) => (
                        <ProjectCard
                            key={index}
                            projectInfo={item}
                            refreshData={refreshData}
                        />
                    ))
                )}
            </div>
        </div>
    );
}