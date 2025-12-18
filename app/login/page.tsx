"use client"
import Login from '@/components/Login'
import React, { useEffect } from 'react'
import { useRouter } from "next/navigation"
import { useClientAuth } from '@/hooks/use-auth'

const Page: React.FC = () => {
    const router = useRouter();
    const { clientId } = useClientAuth()
    useEffect(() => {
        if (clientId) {
            router.push("/");
        }
    }, [])

    return (
        <div>
            tmp
            <Login />
        </div>
    )
}

export default Page