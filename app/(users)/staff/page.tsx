"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'

import { AddStaffDialog } from '@/components/staff/add-staff-dialog'
import { StaffTable } from '@/components/staff/staff-table'
import { StaffDataProps, StaffProps } from '@/components/types/staff'
import domain from '@/components/utils/domain'


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

    useEffect(() => {
        const fetchStaffData = async () => {
            try {
                const res = await axios.get(`${domain}/api/staff`)
                const data = res.data.staffData


                const transformedData: StaffProps[] = data.map((item: StaffApiResponse) => ({
                    id: item._id,
                    srNumber: data.indexOf(item) + 1,
                    name: `${item.firstName} ${item.lastName}`,
                    email: item.email,
                    phone: item.phoneNumber
                }));

                setStaff(transformedData)
                setLoading(false)
            } catch (error) {
                console.error("Error fetching staff data:", error)
                setLoading(false)
            }
        }

        fetchStaffData()
    }, [random])

    const addStaff = async (data: StaffDataProps) => {
        try {
            const res = await axios.post(`${domain}/api/user`, data)
            if (res) {
                console.log("staff added successfully");
            }
        } catch (error: unknown) {
            console.log("something went wrong");
            console.error(error);
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
