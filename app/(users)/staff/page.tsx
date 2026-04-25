"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'

import { AddStaffDialog } from '@/components/staff/add-staff-dialog'
import { StaffTable } from '@/components/staff/staff-table'
import { StaffDataProps, StaffProps } from '@/components/types/staff'
import domain from '@/components/utils/domain'
import { getClientId } from '@/functions/clientId'
import { useToast } from '@/hooks/use-toast'


interface StaffApiResponse {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
}


const Page = () => {
    const [staff, setStaff] = useState<StaffProps[]>([]);
    const [random, setRandom] = useState<number>();
    const [loading, setLoading] = useState<boolean>(true);
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
                setLoading(false);
                return;
            }
            
            setClientId(id);
        };
        
        fetchClientId();
    }, []);

    useEffect(() => {
        const fetchStaffData = async () => {
            console.log('🔍 Attempting to fetch staff data with clientId:', clientId);
            
            if (!clientId) {
                console.log('⚠️ ClientId is not available yet, skipping API call');
                return;
            }
            
            setLoading(true);
            
            try {
                console.log('📡 Making API call with clientId:', clientId);
                console.log('📡 Domain:', domain);
                
                // Try new API first (using client's staffs array)
                console.log('🔍 Trying new Staff API (client staffs array)...');
                let staffUrl = `${domain}/api/clients/staff?clientId=${clientId}`;
                console.log('📤 Staff URL:', staffUrl);
                
                let res = await axios.get(staffUrl);
                console.log('📥 Staff Response Status:', res.status);
                console.log('📥 Staff Response Data:', JSON.stringify(res.data, null, 2));
                
                let data = res.data.data || res.data.staffData;
                
                // Fallback to old API if new API returns empty or fails
                if (!data || (Array.isArray(data) && data.length === 0)) {
                    console.log('⚠️ New API returned no data, trying fallback...');
                    
                    try {
                        staffUrl = `${domain}/api/staff?clientId=${clientId}`;
                        console.log('📤 Fallback Staff URL:', staffUrl);
                        
                        res = await axios.get(staffUrl);
                        console.log('📥 Fallback Response Status:', res.status);
                        console.log('📥 Fallback Response Data:', JSON.stringify(res.data, null, 2));
                        
                        data = res.data.data || res.data.staffData;
                        
                        if (!data || (Array.isArray(data) && data.length === 0)) {
                            console.log('⚠️ Fallback API also returned no data');
                            data = [];
                        } else {
                            console.log('✅ Fallback API returned staff data:', data.length, 'items');
                        }
                    } catch (fallbackError: any) {
                        console.error('❌ Fallback API error:', fallbackError);
                        data = [];
                    }
                } else {
                    console.log('✅ New API returned staff data:', data.length, 'items');
                }

                const transformedData: StaffProps[] = Array.isArray(data) ? data.map((item: StaffApiResponse, index: number) => ({
                    id: item._id,
                    srNumber: index + 1,
                    name: `${item.firstName} ${item.lastName}`,
                    email: item.email,
                    phone: item.phoneNumber
                })) : [];

                console.log('✅ Final staff data processed:', transformedData.length, 'items');
                setStaff(transformedData);
                setLoading(false);
            } catch (error: any) {
                console.error("❌ Error fetching staff data:", error);
                console.error('❌ Error response:', error.response?.data);
                console.error('❌ Error status:', error.response?.status);
                
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
                        description: "Staff data not found. Please contact support.",
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
                        description: "Failed to load staff data",
                        variant: "destructive",
                    });
                }
                
                setStaff([]);
                setLoading(false);
            }
        };

        fetchStaffData();
    }, [clientId, random])

    const addStaff = async (data: StaffDataProps) => {
        if (!clientId) {
            toast({
                title: "Error",
                description: "Client ID not found",
                variant: "destructive",
            });
            return;
        }

        const payload = {
            ...data,
            clientId: clientId
        };

        console.log('🚀 Adding staff with payload:', payload);

        try {
            const res = await axios.post(`${domain}/api/user`, payload);
            if (res) {
                console.log("✅ Staff added successfully");
                toast({
                    title: "Success",
                    description: "Staff added successfully",
                });
            }
        } catch (error: any) {
            console.error("❌ Error adding staff:", error);
            console.error('❌ Error response:', error.response?.data);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to add staff",
                variant: "destructive",
            });
        } finally {
            updateData();
        }
    }

    const updateData = () => {
        const number = Math.random() * 1000;
        setRandom(number);
    }

    return (
        <div>
            <div className="flex flex-col">
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
                        <AddStaffDialog addStaff={addStaff} />
                    </div>
                    <div className="mt-6">
                        <StaffTable staff={staff} loading={loading} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page
