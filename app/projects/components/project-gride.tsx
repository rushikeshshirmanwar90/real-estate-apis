'use client'
import Image from "next/image"
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
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
} from '@/components/ui/alert-dialog';
import { projectProps } from '../types/project-props'
import { Building2, MapPin, Edit, Trash2 } from 'lucide-react'
import { deleteProject } from "@/functions/project/crud"

const ProjectGrid = ({ projects }: { projects: projectProps[] }) => {
    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-3xl font-bold mb-6">Projects Overview</h1>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <Card key={project._id} className="overflow-hidden cursor-pointer">
                        <div className="relative h-64">
                            <Carousel className="w-full">
                                <CarouselContent>
                                    {project.images.map((image, index) => (
                                        <CarouselItem key={index}>
                                            <div className="relative h-64">
                                                <div className="bg-slate-950 h-[2.2rem] w-[5rem] absolute top-0 right-0 z-50 rounded-lg">
                                                    <div className="flex items-center justify-between px-2 mt-2">
                                                        <Link href={`project?id=${project._id}`}>
                                                            <div>
                                                                <Edit size={20} />
                                                            </div>
                                                        </Link>
                                                        <div>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild className="w-[1.3rem] h-[1.3rem]">
                                                                    <Trash2 size={20} className="h-4 w-4 text-destructive" />
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This action cannot be undone. This will permanently
                                                                            delete the building data.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => deleteProject(project._id)}
                                                                            className="bg-destructive text-destructive-foreground"
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Image
                                                    src={image}
                                                    alt={`Project image ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious className="left-2" />
                                <CarouselNext className="right-2" />
                            </Carousel>
                        </div>

                        <Link href={`/projects/${project._id}`}>

                            <CardHeader>
                                <CardTitle className='w-[80%]'>{project.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-2">
                                    <Building2 className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="font-medium">Buildings</p>
                                        <p className="text-sm text-muted-foreground">
                                            Total: {project.totalBuilding}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="font-medium">Location</p>
                                        <p className="text-sm text-muted-foreground">
                                            {project.area}, {project.city}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{project.state}</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {project.address}
                                        </p>
                                    </div>
                                </div>

                                {/* <div className="flex items-start gap-2">
                                    <Calendar className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="font-medium">Created</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(project.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div> */}

                                {project.description && (
                                    <div className="border-t pt-4 mt-4">
                                        <p className="text-sm text-muted-foreground">
                                            {project.description}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Link>
                    </Card>
                ))}
            </div>
        </div >
    )
}

export default ProjectGrid;