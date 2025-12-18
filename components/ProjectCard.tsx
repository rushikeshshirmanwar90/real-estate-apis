"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import {
    MapPin,
    Ruler,
    Ellipsis,
    Trash,
    Pencil,
    PlusSquareIcon,
    Building2,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel"

import RowHouse from "@/components/sections/RowHouse"
import OtherSection from "@/components/sections/OtherSection"
import Building from "@/components/sections/Building"

import Autoplay from "embla-carousel-autoplay"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { projectProps } from "@/app/projects/types/project-props"

import { AmenitiesProps } from "./types/editable-card"
import { DisplayIcon } from "./homepage/editable-cards/AmenitiesSelector"
import { deleteProject } from "@/functions/project/crud"
import { successToast } from "./toasts"
import Image from "next/image"
import { deleteBuilding } from "@/functions/building/crud"

interface Section {
    _id: string,
    name: string,
    type: string
}

interface ProjectCardProps {
    projectInfo: projectProps,
    refreshData: () => void
}

interface selectedSectionProps {
    id: string,
    type: string
}

const ProjectCard: React.FC<ProjectCardProps> = ({ projectInfo, refreshData }) => {
    // Separate state for modals and dropdowns

    const router = useRouter();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
    const [isSectionModelOpen, setIsSectionModelOpen] = useState(false)
    const [selectedSection, setSelectedSection] = useState<selectedSectionProps>()

    const [newSection, setNewSection] = useState({
        name: "",
        type: "" as Section["type"],
    })

    const handleOpenAddSection = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDropdownOpen(false)
        setIsAddSectionModalOpen(true)
    }

    const handleOpenDelete = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDropdownOpen(false)
        setIsDeleteModalOpen(true)
    }

    const handleDelete = async () => {
        await deleteProject(projectInfo._id)
        refreshData();
        successToast("Project Deleted Successfully")
        setIsDeleteModalOpen(false)
    }

    const handleEdit = () => {
        const queryData = {
            ...projectInfo,
            images: JSON.stringify(projectInfo.images),
            amenities: JSON.stringify(projectInfo.amenities)
        };
        const query = new URLSearchParams(
            Object.entries(queryData).map(([key, value]) => [key, String(value)])
        ).toString();
        router.push(`/project-form?${query}`);
    };

    const handleAddSection = () => {
        if (newSection.name && newSection.type) {
            const encodedName = encodeURIComponent(newSection.name)
            const encodedProjectId = encodeURIComponent(projectInfo._id)
            if (newSection.type == 'building') {
                router.push(`/building-form?name=${encodedName}&projectId=${encodedProjectId}&location=${projectInfo.address}`)
            }
            if (newSection.type == 'row house') {
                router.push(`/rowHouse-form?name=${encodedName}&projectId=${encodedProjectId}`)
            }
            if (newSection.type == 'other') {
                router.push(`/otherSection-form?name=${encodedName}&projectId=${encodedProjectId}`)
            }
            setIsAddSectionModalOpen(false)
        }
    }

    const handleCloseAddSection = () => {
        setNewSection({ name: "", type: "" as Section["type"] })
        setIsAddSectionModalOpen(false)
    }

    const handleOpenBuildingModal = (selectedSection: selectedSectionProps) => {
        setSelectedSection(selectedSection)
        setIsSectionModelOpen(true)
    }

    const handleDeleteSection = () => {
        deleteBuilding(projectInfo._id, selectedSection?.id);
        refreshData();
        setIsSectionModelOpen(false)
    }

    const handleSectionEdit = () => {
        if (!selectedSection) {
            console.error('No section selected')
            return
        }

        const formPath = selectedSection.type === 'Buildings'
            ? `/building-form?id=${selectedSection.id}`
            : selectedSection.type === 'row house'
                ? `/rowHouse-form?id=${selectedSection.id}`
                : `/otherSection-form?id=${selectedSection.id}`

        router.push(formPath)
    }
    return (
        <div className="w-[68rem] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex">
                <div className="w-1/2 relative">

                    <Carousel
                        plugins={[
                            Autoplay({
                                delay: 2000,
                            }),
                        ]}>
                        <CarouselContent>
                            {
                                projectInfo.images.map((item: string, index: number) => (
                                    <CarouselItem key={index} >
                                        <Image
                                            src={`${item}`}
                                            alt="Project Image"
                                            className="w-full h-[350px] object-cover"
                                            width={500}
                                            height={500}
                                        />
                                    </CarouselItem>
                                ))
                            }
                        </CarouselContent>
                    </Carousel>


                    <div className="absolute top-4 left-4 bg-white text-gray-800 text-sm font-bold px-3 py-1 rounded-lg shadow">
                        {projectInfo?.projectType}
                    </div>
                </div>

                {/* Content Section */}
                <div className="w-1/2 p-5 flex flex-col gap-5">
                    <div>
                        <div className="flex justify-between">

                            {/* PROJECT NAME  */}
                            <h2 className="text-xl font-semibold text-gray-900">{projectInfo?.name}</h2>

                            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Ellipsis className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Project Activity</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleEdit} >
                                        <Pencil className="mr-2 h-4 w-4" /> Edit Project
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleOpenDelete}>
                                        <Trash className="mr-2 h-4 w-4" /> Delete Project
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleOpenAddSection}>
                                        <PlusSquareIcon className="mr-2 h-4 w-4" /> Add Section
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <p className="text-gray-600 flex items-center gap-2 mt-1">
                            <MapPin className="text-red-500 w-4 h-4" /> {projectInfo?.address}
                        </p>

                        <p className="text-gray-500 text-sm mt-3">
                            {projectInfo?.description}
                        </p>

                        <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg text-gray-700">
                                <Ruler className="w-4 h-4" /> {projectInfo?.area} sq
                            </div>
                        </div>

                        <div className="mt-3 flex gap-2 flex-wrap">

                            {
                                projectInfo?.amenities.map((item: AmenitiesProps, index: number) => (
                                    <div key={index} className="bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2 text-gray-700">
                                        <DisplayIcon iconName={item.icon} size={20} color="black" /> {item.name}
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    <Button className="w-full mt-3 bg-[#073B3A] hover:bg-[#073b3aed]">
                        View Project
                    </Button>
                </div>
            </div>

            {/* Sections Area */}
            {projectInfo.section.length > 0 && (
                <div className="p-5 border-t">
                    <h3 className="text-lg font-semibold mb-4">Project Sections</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {projectInfo.section.map((section) => (
                            <div
                                key={section.sectionId}
                                className="p-4 border rounded-lg cursor-pointer"
                                onClick={() => {
                                    const selectedSection: selectedSectionProps = {
                                        id: section.sectionId,
                                        type: section.type
                                    }
                                    handleOpenBuildingModal(selectedSection)
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">{section.name}</h4>
                                    <Badge variant="secondary">
                                        <Building2 className="w-3 h-3 mr-1" />
                                        {section.type}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete Alert Dialog */}
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project and all of its data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Section Dialog */}
            <Dialog open={isAddSectionModalOpen} onOpenChange={setIsAddSectionModalOpen}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Add New Section</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="name">Section Name</label>
                            <Input
                                id="name"
                                value={newSection.name}
                                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                                placeholder="Enter section name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="type">Section Type</label>
                            <Select
                                value={newSection.type}
                                onValueChange={(value) => setNewSection({ ...newSection, type: value as Section["type"] })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select section type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="building">Building</SelectItem>
                                    <SelectItem value="row house">Row House</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={handleCloseAddSection}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddSection}>Add Section</Button>
                    </div>
                </DialogContent>
            </Dialog>


            {/* models */}
            <Dialog open={isSectionModelOpen} onOpenChange={setIsSectionModelOpen}>
                <DialogContent className="max-h-[90vh] flex flex-col p-0">
                    <div className="flex-1 overflow-y-auto p-6">
                        {
                            selectedSection?.type == 'Buildings' ? (<div>
                                <Building buildingId={selectedSection?.id} />
                            </div>) : selectedSection?.type == 'row house' ? (
                                <RowHouse sectionId={`${selectedSection?.id}`} />
                            ) : (
                                <OtherSection sectionId={`${selectedSection?.id}`} />
                            )
                        }
                    </div>
                    <div className="flex justify-end gap-3 p-4 border-t bg-white">
                        <Button variant="outline" onClick={() => setIsSectionModelOpen(false)}>
                            Close
                        </Button>
                        <Button type="button" onClick={handleSectionEdit} >Edit</Button>
                        <Button onClick={handleDeleteSection} variant="destructive">
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ProjectCard