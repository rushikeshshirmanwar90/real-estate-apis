"use client"

import React, { useEffect, useState } from 'react'
import axios from 'axios'

import CustomerTable from '@/components/customers/customer-table'
import { AddCustomerDialog, CustomerData } from '@/components/customers/add-customer-dialog'
import domain from '@/components/utils/domain'
import { ApiUser } from '@/components/types/customer'
import { successToast } from '@/components/toasts'

const Page = () => {


    const [loading, setLoading] = useState<boolean>(true);
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [random, setRandom] = useState<number>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${domain}/api/user`);
                const apiUsers: ApiUser[] = res.data;

                // console.log(apiUsers);

                // Filter only users with userType "customer" and map to Customer type
                const customerData = apiUsers
                    .filter(user => user.userType === "customer")
                    .map((user, index) => ({
                        id: user._id,
                        srNumber: index + 1,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        phone: user.phoneNumber,
                        properties: user.properties?.property || [],
                        firstName: user.firstName,
                        lastName: user.lastName,
                        phoneNumber: user.phoneNumber,
                        userType: user.userType,
                        clientId: user.clientId,
                    }));

                const tmp = customerData.reverse()
                setCustomers(tmp);

                setCustomers(customerData);
            } catch (error) {
                console.error("Error fetching customer data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [random]);


    const addCustomer = async (data: CustomerData) => {
        try {
            await axios.post(`${domain}/api/user`, data);
            updateData();
            successToast("user added successfully");
        } catch (error: unknown) {
            console.error("can't able to add the customer");
            console.log(error)
        }
    }

    const deleteCustomer = async (id: string) => {
        try {
            await axios.delete(`${domain}/api/user`, {
                params: { id: id }
            });
            updateData();
            successToast("user deleted successfully");
        } catch (error: unknown) {
            console.error("can't able to add the customer");
            console.log(error)
        }
    }

    const updateData = () => {
        const num = Math.random() * 1000
        setRandom(num);
    }


    return (
        <div>
            <div className="flex flex-col">
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
                        <AddCustomerDialog addCustomer={addCustomer} />
                    </div>
                    <div className="mt-6">
                        <CustomerTable customers={customers} loading={loading} deleteCustomer={deleteCustomer} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page
