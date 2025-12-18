"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, Building, Home, Phone, Briefcase } from "lucide-react"


interface LeadProps {
    name: string;
    phone: string;
    projectDetails: {
        projectName: string;
        projectId: string;
    };
    interestedType: string;
    buildingDetails?: {
        buildingName: string;
        buildingId: string;
        flatName: string;
        flatId: string;
    };
    rowHouseDetails?: {
        rowHouseName: string;
        rowHouseId: string;
    };
}


interface LeadsTableProps {
    data: LeadProps[]
}

export function LeadsTable({ data }: LeadsTableProps) {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

    const toggleRow = (index: number) => {
        setExpandedRows((prev) => ({
            ...prev,
            [index]: !prev[index],
        }))
    }

    return (
        <Card className="shadow-sm">
            <CardContent className="p-0">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No leads found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((lead, index) => (
                                    <>
                                        <TableRow key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(index)}>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    {expandedRows[index] ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{lead.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    {lead.phone}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    {lead.projectDetails.projectName}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={lead.interestedType === "building" ? "default" : "secondary"}
                                                    className="capitalize"
                                                >
                                                    {lead.interestedType === "building" ? (
                                                        <Building className="mr-1 h-3 w-3" />
                                                    ) : (
                                                        <Home className="mr-1 h-3 w-3" />
                                                    )}
                                                    {lead.interestedType}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>

                                        {expandedRows[index] && (
                                            <TableRow className="bg-muted/30">
                                                <TableCell colSpan={5} className="p-0">
                                                    <div className="p-4">
                                                        <div className="space-y-4">
                                                            <div className="bg-background p-3 rounded-md border">
                                                                <h4 className="text-sm font-semibold mb-2 flex items-center">
                                                                    <Briefcase className="mr-2 h-4 w-4" />
                                                                    Project Details
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-muted-foreground">Project Name</span>
                                                                        <span className="font-medium">{lead.projectDetails.projectName}</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-muted-foreground">Project ID</span>
                                                                        <span className="font-medium">{lead.projectDetails.projectId}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {lead.interestedType === "building" && lead.buildingDetails && (
                                                                <div className="bg-background p-3 rounded-md border">
                                                                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                                                                        <Building className="mr-2 h-4 w-4" />
                                                                        Building Details
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-muted-foreground">Building Name</span>
                                                                            <span className="font-medium">{lead.buildingDetails.buildingName}</span>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-muted-foreground">Building ID</span>
                                                                            <span className="font-medium">{lead.buildingDetails.buildingId}</span>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-muted-foreground">Flat Name</span>
                                                                            <span className="font-medium">{lead.buildingDetails.flatName}</span>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-muted-foreground">Flat ID</span>
                                                                            <span className="font-medium">{lead.buildingDetails.flatId}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {lead.interestedType === "rowhouse" && lead.rowHouseDetails && (
                                                                <div className="bg-background p-3 rounded-md border">
                                                                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                                                                        <Home className="mr-2 h-4 w-4" />
                                                                        Row House Details
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-muted-foreground">Row House Name</span>
                                                                            <span className="font-medium">{lead.rowHouseDetails.rowHouseName}</span>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-muted-foreground">Row House ID</span>
                                                                            <span className="font-medium">{lead.rowHouseDetails.rowHouseId}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
