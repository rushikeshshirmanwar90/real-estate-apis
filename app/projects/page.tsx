'use client'

import { useEffect, useState } from 'react';
import { Plus, BarChart3 } from 'lucide-react';
import axios from "axios"
import ProjectCard from '@/components/ProjectCard';
import { projectProps } from './types/project-props';
import domain from '@/components/utils/domain';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getClientId } from '@/functions/clientId';
import { useToast } from '@/hooks/use-toast';

export default function Page() {
    const [projectData, setProjectData] = useState<projectProps[]>([]);
    const [isProjectLoading, setIsProjectLoading] = useState<boolean>(false);
    const [handleChange, setHandleChange] = useState<number>();
    const [error, setError] = useState<string | null>(null);
    const [clientId, setClientId] = useState<string | null>(null);
    const { toast } = useToast();

    // Fetch clientId on mount
    useEffect(() => {
        const fetchClientId = () => {
            console.log('🔍 Fetching clientId...');
            const id = getClientId();
            console.log('✅ ClientId received:', id);
            
            if (!id) {
                console.error('❌ No valid clientId found. User may need to log in again.');
                toast({
                    title: "Error",
                    description: "Session expired. Please log in again.",
                    variant: "destructive",
                });
                setIsProjectLoading(false);
                return;
            }
            
            setClientId(id);
        };
        
        fetchClientId();
    }, []);

    const fetchProjectData = async () => {
        console.log('🔍 Attempting to fetch project data with clientId:', clientId);
        
        if (!clientId) {
            console.log('⚠️ ClientId is not available yet, skipping API call');
            return;
        }
        
        setIsProjectLoading(true);
        setError(null);
        
        try {
            const res = await axios.get(`${domain}/api/project?clientId=${clientId}`);
            
            const data = res.data;
            
            if (Array.isArray(data)) {
                console.log('✅ Project data loaded:', data.length, 'projects');
                setProjectData(data);
            } else if (data.data && Array.isArray(data.data)) {
                console.log('✅ Project data loaded:', data.data.length, 'projects');
                setProjectData(data.data);
            } else {
                console.log('⚠️ Unexpected data format:', data);
                setProjectData([]);
            }
        } catch (error: any) {
            console.error("❌ Error fetching project data:", error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.message || 'Failed to fetch project data';
                setError(errorMessage);
                
                // Handle specific error cases
                if (error.response?.status === 400) {
                    console.error('❌ 400 Error - likely missing or invalid clientId');
                    toast({
                        title: "Error",
                        description: "Invalid client configuration. Please contact support.",
                        variant: "destructive",
                    });
                } else if (error.response?.status === 404) {
                    console.error('❌ 404 Error - client or endpoint not found');
                    toast({
                        title: "Error",
                        description: "Projects not found. Please contact support.",
                        variant: "destructive",
                    });
                } else if (!error.response) {
                    console.error('❌ Network error - server might be down');
                    toast({
                        title: "Error",
                        description: "Unable to connect to server. Please check your connection.",
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: "Error",
                        description: errorMessage,
                        variant: "destructive",
                    });
                }
            } else {
                setError('An unexpected error occurred');
                toast({
                    title: "Error",
                    description: "An unexpected error occurred",
                    variant: "destructive",
                });
            }
            
            setProjectData([]);
        } finally {
            setIsProjectLoading(false);
        }
    };

    const refreshData = () => {
        setHandleChange(Math.random());
    };

    useEffect(() => {
        fetchProjectData();
    }, [clientId, handleChange]);

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
                ) : projectData.length > 0 ? (
                    projectData.map((item: projectProps, index: number) => (
                        <ProjectCard
                            key={index}
                            projectInfo={item}
                            refreshData={refreshData}
                        />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-lg font-medium text-gray-600">No projects found</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Click "Add Project" to create your first project
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}