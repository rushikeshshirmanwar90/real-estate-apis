"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, User, Users, Phone } from "lucide-react";
import { ReferralEntry } from "@/types/reference";

interface ReferenceLeadsTableProps {
    data: ReferralEntry[];
}

export function ReferenceLeadsTable({ data }: ReferenceLeadsTableProps) {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (clientId: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [clientId]: !prev[clientId],
        }));
    };

    return (
        <Card className="shadow-sm">
            <CardContent className="p-0">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Reference ID</TableHead>
                                <TableHead>Reference Customer</TableHead>
                                <TableHead>Contact Number</TableHead>
                                <TableHead className="text-right">Total Leads</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No reference leads found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.map((item) => (
                                    <>
                                        <TableRow
                                            key={item._id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(item._id)}
                                        >
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    {expandedRows[item._id] ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{item._id}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    <span>{item.referenceCustomer.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    {item.referenceCustomer.contactNumber}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                                    {item.leads.length}
                                                </span>
                                            </TableCell>
                                        </TableRow>

                                        {expandedRows[item._id] && (
                                            <TableRow className="bg-muted/30">
                                                <TableCell colSpan={5} className="p-0">
                                                    <div className="p-4">
                                                        <h4 className="text-sm font-semibold mb-2 flex items-center">
                                                            <Users className="mr-2 h-4 w-4" />
                                                            Leads from {item.referenceCustomer.name}
                                                        </h4>
                                                        <div className="rounded-md border bg-background">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-muted/50">
                                                                        <TableHead>Lead ID</TableHead>
                                                                        <TableHead>Name</TableHead>
                                                                        <TableHead>Contact Number</TableHead>
                                                                        <TableHead>Copy Link</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {item.leads.map((lead) => {
                                                                        const leadData = JSON.stringify({
                                                                            name: lead.name,
                                                                            contactNumber: lead.contactNumber
                                                                        });
                                                                        const referenceLink = `http://localhost:3000/reference?clientId=${process.env.NEXT_PUBLIC_CLIENT_ID}&&data=${encodeURIComponent(leadData)}`;
                                                                        
                                                                        return (
                                                                            <TableRow key={lead._id}>
                                                                                <TableCell className="font-medium">{lead._id}</TableCell>
                                                                                <TableCell>
                                                                                    <div className="flex items-center">
                                                                                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                        {lead.name}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <div className="flex items-center">
                                                                                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                        {lead.contactNumber}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={() => navigator.clipboard.writeText(referenceLink)}
                                                                                    >
                                                                                        Copy Link
                                                                                    </Button>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
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
    );
}