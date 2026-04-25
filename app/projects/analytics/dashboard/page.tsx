"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    Building2, 
    Package, 
    Users, 
    Wrench, 
    TrendingUp, 
    RefreshCw,
    ArrowLeft,
    PieChart as PieChartIcon,
    BarChart3
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getClientId } from "@/functions/clientId"
import CustomPieChart from "@/components/charts/CustomPieChart"
import CustomBarChart from "@/components/charts/CustomBarChart"

// Types
interface Material {
    _id: string
    name: string
    qnt: number
    unit: string
    cost?: number
    totalCost?: number
    sectionId?: string
    miniSectionId?: string
}

interface Labor {
    _id: string
    type: string
    totalCost: number
    status: string
    sectionId?: string
}

interface Equipment {
    _id: string
    name: string
    type: string
    cost: number
    sectionId?: string
}

interface Project {
    _id: string
    name: string
    clientId: string
    spent?: number
    isCompleted?: boolean
    MaterialAvailable?: Material[]
    MaterialUsed?: Material[]
    Labors?: Labor[]
    Equipment?: Equipment[]
    createdAt: string
}

// Format currency helper
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export default function AnalyticsDashboard() {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showCompleted, setShowCompleted] = useState(false)

    // Fetch projects
    const fetchProjects = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        setRefreshing(true)
        
        try {
            const clientId = getClientId()
            
            if (!clientId) {
                throw new Error('No client ID found. Please log in again.')
            }
            
            const response = await fetch(`/api/project?clientId=${clientId}`)
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch projects')
            }
            
            let projectsArray: Project[] = []
            
            if (Array.isArray(data)) {
                projectsArray = data
            } else if (data.data && Array.isArray(data.data)) {
                projectsArray = data.data
            }
            
            setProjects(projectsArray)
            
            if (projectsArray.length > 0) {
                toast.success('Projects loaded successfully')
            }
        } catch (error) {
            console.error('Error fetching projects:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to fetch projects')
            setProjects([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    // Calculate analytics
    const calculateAnalytics = () => {
        const filteredProjects = showCompleted 
            ? projects.filter(p => p.isCompleted)
            : projects.filter(p => !p.isCompleted)

        const totalProjects = filteredProjects.length
        const totalSpent = filteredProjects.reduce((sum, p) => sum + (p.spent || 0), 0)
        
        let totalMaterialCost = 0
        let totalLaborCost = 0
        let totalEquipmentCost = 0
        
        filteredProjects.forEach(project => {
            // Materials
            if (project.MaterialAvailable) {
                totalMaterialCost += project.MaterialAvailable.reduce((sum, m) => 
                    sum + (m.totalCost || m.cost || 0), 0)
            }
            if (project.MaterialUsed) {
                totalMaterialCost += project.MaterialUsed.reduce((sum, m) => 
                    sum + (m.totalCost || m.cost || 0), 0)
            }
            
            // Labor
            if (project.Labors) {
                totalLaborCost += project.Labors.reduce((sum, l) => 
                    sum + (l.totalCost || 0), 0)
            }
            
            // Equipment
            if (project.Equipment) {
                totalEquipmentCost += project.Equipment.reduce((sum, e) => 
                    sum + (e.cost || 0), 0)
            }
        })

        return {
            totalProjects,
            totalSpent,
            totalMaterialCost,
            totalLaborCost,
            totalEquipmentCost,
            filteredProjects
        }
    }

    const analytics = calculateAnalytics()

    // Prepare chart data
    const costBreakdownData = [
        { name: 'Materials', value: analytics.totalMaterialCost, color: '#3b82f6' },
        { name: 'Labor', value: analytics.totalLaborCost, color: '#ef4444' },
        { name: 'Equipment', value: analytics.totalEquipmentCost, color: '#10b981' }
    ].filter(item => item.value > 0)

    const projectStatusData = [
        { 
            name: 'Ongoing', 
            value: projects.filter(p => !p.isCompleted).length, 
            color: '#f59e0b' 
        },
        { 
            name: 'Completed', 
            value: projects.filter(p => p.isCompleted).length, 
            color: '#10b981' 
        }
    ].filter(item => item.value > 0)

    // Project spending data for bar chart
    const projectSpendingData = analytics.filteredProjects
        .map((project, index) => ({
            name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
            value: project.spent || 0,
            color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Top 10 projects

    useEffect(() => {
        fetchProjects()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/projects">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Projects
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                        <p className="text-muted-foreground">
                            Financial insights and project analytics
                        </p>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => fetchProjects(false)}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Toggle */}
            <div className="flex gap-2">
                <Button
                    variant={!showCompleted ? "default" : "outline"}
                    onClick={() => setShowCompleted(false)}
                >
                    Ongoing Projects
                </Button>
                <Button
                    variant={showCompleted ? "default" : "outline"}
                    onClick={() => setShowCompleted(true)}
                >
                    Completed Projects
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {showCompleted ? 'Completed' : 'Ongoing'} Projects
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Total: {projects.length} projects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.totalSpent)}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all {showCompleted ? 'completed' : 'ongoing'} projects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Material Costs</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.totalMaterialCost)}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalSpent > 0 
                                ? `${((analytics.totalMaterialCost / analytics.totalSpent) * 100).toFixed(1)}% of total`
                                : 'No expenses yet'
                            }
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Labor Costs</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.totalLaborCost)}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalSpent > 0 
                                ? `${((analytics.totalLaborCost / analytics.totalSpent) * 100).toFixed(1)}% of total`
                                : 'No expenses yet'
                            }
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            {analytics.totalProjects > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cost Breakdown */}
                    {costBreakdownData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5" />
                                    Cost Breakdown
                                </CardTitle>
                                <CardDescription>
                                    Distribution of expenses by category
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center">
                                    <CustomPieChart 
                                        data={costBreakdownData} 
                                        size={200} 
                                        formatValue={formatCurrency}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Project Status */}
                    {projectStatusData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5" />
                                    Project Status
                                </CardTitle>
                                <CardDescription>
                                    Ongoing vs Completed projects
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center">
                                    <CustomPieChart 
                                        data={projectStatusData} 
                                        size={200} 
                                        formatValue={(value) => value.toString()}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Project Spending */}
                    {projectSpendingData.length > 0 && (
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Project Spending
                                </CardTitle>
                                <CardDescription>
                                    Top {Math.min(10, projectSpendingData.length)} projects by expenses
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CustomBarChart 
                                    data={projectSpendingData} 
                                    height={300} 
                                    formatValue={formatCurrency}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <PieChartIcon className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            No {showCompleted ? 'Completed' : 'Ongoing'} Projects
                        </h3>
                        <p className="text-muted-foreground text-center">
                            {showCompleted 
                                ? 'Mark projects as complete to see their analytics here'
                                : 'Add materials and labor to your projects to see analytics'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Projects Table */}
            {analytics.filteredProjects.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription>
                            Detailed breakdown of {showCompleted ? 'completed' : 'ongoing'} projects
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3">Project Name</th>
                                        <th className="text-center p-3">Status</th>
                                        <th className="text-right p-3">Materials</th>
                                        <th className="text-right p-3">Labor</th>
                                        <th className="text-right p-3">Equipment</th>
                                        <th className="text-right p-3">Total Spent</th>
                                        <th className="text-center p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.filteredProjects.map((project) => {
                                        const materialCost = (project.MaterialAvailable?.reduce((sum, m) => 
                                            sum + (m.totalCost || m.cost || 0), 0) || 0) +
                                            (project.MaterialUsed?.reduce((sum, m) => 
                                            sum + (m.totalCost || m.cost || 0), 0) || 0)
                                        
                                        const laborCost = project.Labors?.reduce((sum, l) => 
                                            sum + (l.totalCost || 0), 0) || 0
                                        
                                        const equipmentCost = project.Equipment?.reduce((sum, e) => 
                                            sum + (e.cost || 0), 0) || 0

                                        return (
                                            <tr key={project._id} className="border-b hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-medium">{project.name}</div>
                                                </td>
                                                <td className="text-center p-3">
                                                    <Badge variant={project.isCompleted ? "default" : "secondary"}>
                                                        {project.isCompleted ? "Completed" : "Ongoing"}
                                                    </Badge>
                                                </td>
                                                <td className="text-right p-3">{formatCurrency(materialCost)}</td>
                                                <td className="text-right p-3">{formatCurrency(laborCost)}</td>
                                                <td className="text-right p-3">{formatCurrency(equipmentCost)}</td>
                                                <td className="text-right p-3 font-medium">
                                                    {formatCurrency(project.spent || 0)}
                                                </td>
                                                <td className="text-center p-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/projects/${project._id}`)}
                                                    >
                                                        View Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
