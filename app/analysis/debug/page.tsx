"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function DebugPage() {
    const [apiResponse, setApiResponse] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        
        try {
            let clientId = localStorage.getItem('clientId') || 
                          sessionStorage.getItem('clientId') ||
                          localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!)?.clientId : null
            
            if (!clientId) {
                const userData = localStorage.getItem('user')
                if (userData) {
                    const user = JSON.parse(userData)
                    clientId = user.clientId || user._id || user.id
                }
            }
            
            if (!clientId) {
                clientId = '695f818566b3d06dfb6083f2'
                localStorage.setItem('clientId', clientId)
            }
            
            console.log('🔍 Fetching projects for client:', clientId)
            
            const response = await fetch(`/api/project?clientId=${clientId}`)
            const data = await response.json()
            
            console.log('📡 Full API Response:', data)
            
            setApiResponse({
                status: response.status,
                ok: response.ok,
                data: data,
                clientId: clientId
            })
            
        } catch (err) {
            console.error('❌ Error:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">API Debug Page</h1>
                <Button onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>API Response Structure</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && <p>Loading...</p>}
                    {error && <p className="text-red-500">Error: {error}</p>}
                    {apiResponse && (
                        <div className="space-y-4">
                            <div>
                                <strong>Status:</strong> {apiResponse.status} ({apiResponse.ok ? 'OK' : 'Error'})
                            </div>
                            <div>
                                <strong>Client ID:</strong> {apiResponse.clientId}
                            </div>
                            <div>
                                <strong>Response Keys:</strong> {Object.keys(apiResponse.data).join(', ')}
                            </div>
                            <div>
                                <strong>Success:</strong> {apiResponse.data.success ? 'true' : 'false'}
                            </div>
                            {apiResponse.data.data && (
                                <div>
                                    <strong>Data Keys:</strong> {Object.keys(apiResponse.data.data).join(', ')}
                                </div>
                            )}
                            {apiResponse.data.data && apiResponse.data.data.projects && (
                                <div>
                                    <strong>Projects Count:</strong> {apiResponse.data.data.projects.length}
                                    <div className="mt-2">
                                        <strong>Project IDs:</strong>
                                        <ul className="list-disc list-inside mt-1">
                                            {apiResponse.data.data.projects.slice(0, 5).map((project: any, index: number) => (
                                                <li key={index} className="text-sm">
                                                    {project._id} - {project.name || project.projectName || 'Unnamed'}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                            <div className="mt-4">
                                <strong>Full Response:</strong>
                                <pre className="bg-gray-100 p-4 rounded mt-2 text-xs overflow-auto max-h-96">
                                    {JSON.stringify(apiResponse.data, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}