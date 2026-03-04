"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    Building2, 
    Package, 
    Users, 
    DollarSign,
    RefreshCw,
    AlertTriangle,
    CheckCircle
} from "lucide-react"
import { toast, Toaster } from "sonner"

export default function SimpleAnalysisPage() {
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSimpleData = async () => {
        setLoading(true)
        setError(null)
        
        try {
            // Get client ID with fallback to the provided one
            let clientId = localStorage.getItem('clientId')
            
            if (!clientId) {
                const userData = localStorage.getItem('user')
                if (userData) {
                    const user = JSON.parse(userData)
                    clientId = user.clientId || user._id
                }
            }

            // Use the provided client ID as fallback
            if (!clientId) {
                console.warn('⚠️ No client ID found, using provided fallback')
                clientId = '695f818566b3d06dfb6083f2'
                // Store it for future use
                localStorage.setItem('clientId', clientId)
            }

            console.log('Fetching projects for client:', clientId)
            
            // Fetch projects directly
            const response = await fetch(`/api/project?clientId=${clientId}`)
            const data = await response.json()
            
            console.log('Projects response:', data)
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`)
            }
            
            if (data.success) {
                setProjects(data.projects || [])
                toast.success('Data loaded successfully')
            } else {
                throw new Error(data.message || 'Failed to fetch projects')
            }
            
        } catch (err: any) {
            console.error('Error:', err)
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSimpleData()
    }, [])

    // Calculate simple analytics
    const totalProjects = projects.length
    const completedProjects = projects.filter(p => p.isCompleted).length
    const ongoingProjects = totalProjects - completedProjects
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0)
    
    // Count materials
    const totalMaterials = projects.reduce((sum, p) => {
        const available = p.MaterialAvailable?.length || 0
        const used = p.MaterialUsed?.length || 0
        return sum + available + used
    }, 0)

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <Toaster position="top-right" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>Loading analytics...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Toaster position="top-right" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={fetchSimpleData}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Toaster position="top-right" />
            
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Simple Analytics Dashboard</h1>
                    <p className="text-gray-600">Basic project insights and statistics</p>
                </div>
                <Button variant="outline" onClick={fetchSimpleData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            {completedProjects} completed, {ongoingProjects} ongoing
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{totalSpent.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across all projects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalMaterials}</div>
                        <p className="text-xs text-muted-foreground">
                            Available and used items
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Projects completed
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Projects List */}
            <Card>
                <CardHeader>
                    <CardTitle>Projects Overview</CardTitle>
                    <CardDescription>All your construction projects</CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length === 0 ? (
                        <div className="text-center py-8">
                            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No projects found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {projects.map((project) => (
                                <div key={project._id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold">
                                            {project.name || project.projectName || 'Unnamed Project'}
                                        </h3>
                                        <Badge variant={project.isCompleted ? "default" : "secondary"}>
                                            {project.isCompleted ? "Completed" : "Ongoing"}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Spent</p>
                                            <p className="font-medium">₹{(project.spent || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Available Materials</p>
                                            <p className="font-medium">{project.MaterialAvailable?.length || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Used Materials</p>
                                            <p className="font-medium">{project.MaterialUsed?.length || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Sections</p>
                                            <p className="font-medium">{project.section?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}