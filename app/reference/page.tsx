"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReferenceLeadsTable } from "@/components/reference-leads-table";
import { LeadsTable } from "@/components/leads-table";
import { ReferralEntry } from "@/types/reference";
import axios from "axios";
import domain from "@/components/utils/domain";

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

interface APILeadResponse {
    userDetails: {
        name: string;
        phoneNumber: string;
    };
    projectName: string;
    _id: string;
    projectType: string;
    propertyDetails: {
        name: string;
        id: string;
    };
}


export default function LeadsDataPage() {

    const [referenceLeads, setReferenceLeads] = useState<ReferralEntry[]>([]);
    const [leads, setLeads] = useState<LeadProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("reference-leads");

    // Fetch data based on active tab
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === "reference-leads") {
                    const res = await axios.get(`${domain}/api/reference-leads?clientId=${process.env.NEXT_PUBLIC_CLIENT_ID}`);
                    const data = res.data.referenceLeads;
                    setReferenceLeads(data || []);
                } else if (activeTab === "leads") {
                    const res = await axios.get(`${domain}/api/leads?clientId=${process.env.NEXT_PUBLIC_CLIENT_ID}`);
                    // Map the API response to match the LeadsTable component's expected format


                    const leadsData = res.data.map((lead: APILeadResponse) => ({
                        name: lead.userDetails?.name || '',
                        phone: lead.userDetails?.phoneNumber || '',
                        projectDetails: {
                            projectName: lead.projectName || '',
                            projectId: lead._id || ''
                        },
                        interestedType: lead.projectType || '',
                        buildingDetails: lead.projectType === "building" && lead.propertyDetails ? {
                            buildingName: lead.propertyDetails.name || '',
                            buildingId: lead.propertyDetails.id || '',
                            flatName: "",
                            flatId: ""
                        } : undefined,
                        rowHouseDetails: lead.projectType === "rowhouse" && lead.propertyDetails ? {
                            rowHouseName: lead.propertyDetails.name || '',
                            rowHouseId: lead.propertyDetails.id || ''
                        } : undefined
                    }));
                    setLeads(leadsData || []);
                }
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`Error fetching ${activeTab}:`, error.message);
                } else {
                    console.error("Unexpected error:", error);
                }
                // Set empty array on error to avoid showing stale data
                if (activeTab === "reference-leads") {
                    setReferenceLeads([]);
                } else {
                    setLeads([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Leads Management Dashboard</h1>

            <Tabs defaultValue="reference-leads" onValueChange={setActiveTab} value={activeTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="reference-leads">Reference Leads</TabsTrigger>
                    <TabsTrigger value="leads">Leads</TabsTrigger>
                </TabsList>

                <TabsContent value="reference-leads" className="mt-0">
                    <ReferenceLeadsTable data={referenceLeads} />
                </TabsContent>

                <TabsContent value="leads" className="mt-0">
                    <LeadsTable data={leads} />
                </TabsContent>
            </Tabs>
        </div>
    );
}