'use client'

import { useEffect, useState } from 'react';
import { Plus, BarChart3 } from 'lucide-react';
import axios from "axios"
import TopHeader from '@/components/TopHeader';
import ProjectCard from '@/components/ProjectCard';
import { projectProps } from './types/project-props';
import domain from '@/components/utils/domain';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
            {/* Custom Header with Analytics Button */}
            <div className='flex items-center justify-between mt-2 p-2'>
                <div className='flex flex-col gap-2'>
                    <div className='w-fit'>
                        <div className='bg-[#FCC608] text-black px-3 py-1 rounded-full text-sm font-medium'>
                            Featured Properties
                        </div>
                    </div>
                    <p className='text-3xl font-semibold'>
                        Our Featured Properties
                    </p>
                </div>
                <div className='flex gap-3'>
                    <Link href="/projects/analytics">
                        <Button variant="outline" className='border-[#FCC608] text-[#FCC608] hover:bg-[#FCC608] hover:text-black'>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span className='text-lg font-medium px-2'>Analytics</span>
                        </Button>
                    </Link>
                    <Link href="/project-form">
                        <Button variant={'ghost'} className='bg-[#FCC608] hover:bg-[#fcc708de]'>
                            <span className='text-lg font-medium px-4'>Add Project</span>
                            <Plus className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
            
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