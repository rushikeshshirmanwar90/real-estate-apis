"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast, Toaster } from "sonner"

export default function ClientSetupPage() {
    const [clientId, setClientId] = useState('695f818566b3d06dfb6083f2')
    const [currentClientId, setCurrentClientId] = useState<string | null>(null)
    const [currentUser, setCurrentUser] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)

    // Use useEffect to access localStorage only on client side
    useEffect(() => {
        setIsClient(true)
        if (typeof window !== 'undefined') {
            setCurrentClientId(localStorage.getItem('clientId'))
            setCurrentUser(localStorage.getItem('user'))
        }
    }, [])

    const setupClientId = () => {
        if (!isClient || typeof window === 'undefined') return
        
        if (clientId.trim()) {
            localStorage.setItem('clientId', clientId.trim())
            setCurrentClientId(clientId.trim())
            toast.success('Client ID saved successfully!')
            
            // Redirect to analytics after a short delay
            setTimeout(() => {
                window.location.href = '/analysis'
            }, 1500)
        } else {
            toast.error('Please enter a valid client ID')
        }
    }

    const clearStorage = () => {
        if (!isClient || typeof window === 'undefined') return
        
        localStorage.removeItem('clientId')
        localStorage.removeItem('user')
        sessionStorage.clear()
        setCurrentClientId(null)
        setCurrentUser(null)
        toast.success('Storage cleared!')
    }

    const navigateTo = (path: string) => {
        if (typeof window !== 'undefined') {
            window.location.href = path
        }
    }

    // Don't render anything until we're on the client side
    if (!isClient) {
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Analytics Setup</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Loading...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <Toaster position="top-right" />
            
            <Card>
                <CardHeader>
                    <CardTitle>Analytics Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current Status */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Current Status</h3>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                            <p><strong>Client ID:</strong> {currentClientId || 'Not set'}</p>
                            <p><strong>User Data:</strong> {currentUser ? 'Present' : 'Not set'}</p>
                        </div>
                    </div>

                    {/* Set Client ID */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Set Client ID</h3>
                        <div className="flex gap-2">
                            <Input
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Enter client ID"
                                className="flex-1"
                            />
                            <Button onClick={setupClientId}>
                                Save & Go to Analytics
                            </Button>
                        </div>
                        <p className="text-sm text-gray-600">
                            Default client ID: 695f818566b3d06dfb6083f2
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Quick Actions</h3>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" onClick={() => navigateTo('/analysis')}>
                                Go to Analytics
                            </Button>
                            <Button variant="outline" onClick={() => navigateTo('/analysis/simple')}>
                                Simple Dashboard
                            </Button>
                            <Button variant="outline" onClick={() => navigateTo('/analysis/debug')}>
                                Debug Info
                            </Button>
                            <Button variant="destructive" onClick={clearStorage}>
                                Clear Storage
                            </Button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Instructions</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>1. The client ID is used to fetch your project data</p>
                            <p>2. If you don't have a client ID, use the default one provided</p>
                            <p>3. Click "Save & Go to Analytics" to set up and view your dashboard</p>
                            <p>4. If you encounter issues, try the "Simple Dashboard" first</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}