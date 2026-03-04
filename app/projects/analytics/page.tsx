"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
    Building2, 
    Package, 
    Users, 
    Wrench, 
    TrendingUp, 
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    BarChart3,
    PieChart,
    RefreshCw,
    Filter,
    Download,
    Eye,
    Layers,
    Box,
    Hammer,
    Calendar,
    MapPin,
    Activity,
    ArrowLeft
} from "lucide-react"
import { toast, Toaster } from "sonner"
import Link from "next/link"

import CustomBarChart from "@/components/charts/CustomBarChart"
import CustomPieChart from "@/components/charts/CustomPieChart"
import MaterialSpecifications from "@/components/MaterialSpecifications"

// Types
interface Material {
    _id: string
    name: string
    qnt: number
    unit: string
    cost?: number
    totalCost?: number
    perUnitCost?: number
    sectionId?: string
    miniSectionId?: string
    specs?: any
}

interface Labor {
    _id: string
    type: string
    totalCost: number
    status: string
    projectId: string
    sectionId?: string
}

interface Equipment {
    _id: string
    name: string
    type: string
    cost: number
    rentalCost?: number
    projectId: string
    sectionId?: string
}

interface Section {
    _id: string
    name: string
    isCompleted?: boolean
    miniSections?: MiniSection[]
}

interface MiniSection {
    _id: string
    name: string
    isCompleted?: boolean
    sectionId: string
}

interface Project {
    _id: string
    name: string
    projectName?: string
    clientId: string
    spent?: number
    isCompleted?: boolean
    MaterialAvailable?: Material[]
    MaterialUsed?: Material[]
    Labors?: Labor[]
    Equipment?: Equipment[]
    section?: Section[]
    createdAt: string
    updatedAt: string
}

// Format currency helper function
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

// Helper function to categorize materials
const getMaterialCategory = (materialName: string): string => {
    const name = materialName.toLowerCase()
    if (name.includes('cement') || name.includes('concrete')) return 'Cement & Concrete'
    if (name.includes('steel') || name.includes('iron') || name.includes('rebar')) return 'Steel & Metal'
    if (name.includes('brick') || name.includes('block')) return 'Bricks & Blocks'
    if (name.includes('sand') || name.includes('gravel') || name.includes('aggregate')) return 'Aggregates'
    if (name.includes('paint') || name.includes('primer')) return 'Paint & Finishes'
    if (name.includes('tile') || name.includes('marble') || name.includes('granite')) return 'Tiles & Stones'
    if (name.includes('pipe') || name.includes('plumbing')) return 'Plumbing'
    if (name.includes('wire') || name.includes('cable') || name.includes('electrical')) return 'Electrical'
    if (name.includes('wood') || name.includes('timber')) return 'Wood & Timber'
    return 'Others'
}

export default function ProjectAnalyticsPage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("overview")
    const [refreshing, setRefreshing] = useState(false)

    // Fetch projects data
    const fetchProjectsData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        setRefreshing(true)
        
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
                console.warn('⚠️ No client ID found in storage, using fallback client ID')
                clientId = '695f818566b3d06dfb6083f2'
                localStorage.setItem('clientId', clientId)
            }
            
            console.log('🔍 Fetching projects data for client:', clientId)
            
            const response = await fetch(`/api/project?clientId=${clientId}`)
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch projects')
            }
            
            if (data.success && data.projects) {
                setProjects(data.projects)
                console.log(`✅ Loaded ${data.projects.length} projects`)
                toast.success('Projects data loaded successfully')
            } else {
                throw new Error(data.message || 'No projects data found')
            }
        } catch (error) {
            console.error('❌ Error fetching projects:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to fetch projects data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    // Calculate analytics from projects
    const calculateProjectAnalytics = () => {
        const totalProjects = projects.length
        const completedProjects = projects.filter(p => p.isCompleted).length
        const ongoingProjects = totalProjects - completedProjects
        
        let totalSpent = 0
        let totalMaterialCost = 0
        let totalLaborCost = 0
        let totalEquipmentCost = 0
        
        const materialCategories: { [key: string]: number } = {}
        const laborTypes: { [key: string]: number } = {}
        const equipmentTypes: { [key: string]: number } = {}
        
        projects.forEach(project => {
            totalSpent += project.spent || 0
            
            // Material analysis
            if (project.MaterialAvailable) {
                project.MaterialAvailable.forEach(material => {
                    const cost = material.totalCost || material.cost || 0
                    totalMaterialCost += cost
                    const category = getMaterialCategory(material.name)
                    materialCategories[category] = (materialCategories[category] || 0) + cost
                })
            }
            
            if (project.MaterialUsed) {
                project.MaterialUsed.forEach(material => {
                    const cost = material.totalCost || material.cost || 0
                    totalMaterialCost += cost
                    const category = getMaterialCategory(material.name)
                    materialCategories[category] = (materialCategories[category] || 0) + cost
                })
            }
            
            // Labor analysis
            if (project.Labors) {
                project.Labors.forEach(labor => {
                    totalLaborCost += labor.totalCost
                    laborTypes[labor.type] = (laborTypes[labor.type] || 0) + labor.totalCost
                })
            }
            
            // Equipment analysis
            if (project.Equipment) {
                project.Equipment.forEach(equipment => {
                    totalEquipmentCost += equipment.cost
                    equipmentTypes[equipment.type] = (equipmentTypes[equipment.type] || 0) + equipment.cost
                })
            }
        })

        return {
            totalProjects,
            completedProjects,
            ongoingProjects,
            totalSpent,
            totalMaterialCost,
            totalLaborCost,
            totalEquipmentCost,
            materialCategories,
            laborTypes,
            equipmentTypes
        }
    }

    const analytics = calculateProjectAnalytics()

    // Prepare chart data
    const costBreakdownData = [
        { name: 'Materials', value: analytics.totalMaterialCost, color: '#3b82f6' },
        { name: 'Labor', value: analytics.totalLaborCost, color: '#ef4444' },
        { name: 'Equipment', value: analytics.totalEquipmentCost, color: '#10b981' }
    ]

    const projectStatusData = [
        { name: 'Completed', value: analytics.completedProjects, color: '#10b981' },
        { name: 'Ongoing', value: analytics.ongoingProjects, color: '#f59e0b' }
    ]

    const materialCategoryData = Object.entries(analytics.materialCategories).map(([category, cost], index) => ({
        name: category,
        value: cost,
        color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'][index % 7]
    }))

    const laborTypeData = Object.entries(analytics.laborTypes).map(([type, cost], index) => ({
        name: type,
        value: cost,
        color: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]
    }))

    const equipmentTypeData = Object.entries(analytics.equipmentTypes).map(([type, cost], index) => ({
        name: type,
        value: cost,
        color: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'][index % 5]
    }))

    // Load data on component mount
    useEffect(() => {
        fetchProjectsData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading projects data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Toaster position="top-right" />
            
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
                        <h1 className="text-3xl font-bold">Project Analytics Dashboard</h1>
                        <p className="text-muted-foreground">
                            Visual insights and data analysis for all projects
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => fetchProjectsData(false)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.completedProjects} completed, {analytics.ongoingProjects} ongoing
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.totalSpent)}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all projects
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
                            {((analytics.totalMaterialCost / analytics.totalSpent) * 100).toFixed(1)}% of total
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
                            {((analytics.totalLaborCost / analytics.totalSpent) * 100).toFixed(1)}% of total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts and Tables */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="materials">Materials</TabsTrigger>
                    <TabsTrigger value="labor">Labor</TabsTrigger>
                    <TabsTrigger value="equipment">Equipment</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Cost Breakdown Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Cost Breakdown
                                </CardTitle>
                                <CardDescription>Distribution of expenses across categories</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CustomBarChart 
                                    data={costBreakdownData} 
                                    height={300} 
                                    formatValue={formatCurrency}
                                />
                            </CardContent>
                        </Card>

                        {/* Project Status Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Project Status
                                </CardTitle>
                                <CardDescription>Completion status of all projects</CardDescription>
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
                    </div>

                    {/* Summary Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Summary</CardTitle>
                            <CardDescription>Overview of all projects with key metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Project Name</th>
                                            <th className="text-center p-3">Status</th>
                                            <th className="text-center p-3">Sections</th>
                                            <th className="text-center p-3">Materials</th>
                                            <th className="text-center p-3">Labor</th>
                                            <th className="text-center p-3">Equipment</th>
                                            <th className="text-right p-3">Total Spent</th>
                                            <th className="text-center p-3">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.map((project) => (
                                            <tr key={project._id} className="border-b hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-medium">
                                                        {project.name || project.projectName || 'Unnamed Project'}
                                                    </div>
                                                </td>
                                                <td className="text-center p-3">
                                                    <Badge variant={project.isCompleted ? "default" : "secondary"}>
                                                        {project.isCompleted ? "Completed" : "Ongoing"}
                                                    </Badge>
                                                </td>
                                                <td className="text-center p-3">
                                                    {project.section?.length || 0}
                                                </td>
                                                <td className="text-center p-3">
                                                    {(project.MaterialAvailable?.length || 0) + (project.MaterialUsed?.length || 0)}
                                                </td>
                                                <td className="text-center p-3">
                                                    {project.Labors?.length || 0}
                                                </td>
                                                <td className="text-center p-3">
                                                    {project.Equipment?.length || 0}
                                                </td>
                                                <td className="text-right p-3 font-medium">
                                                    {formatCurrency(project.spent || 0)}
                                                </td>
                                                <td className="text-center p-3 text-sm text-muted-foreground">
                                                    {new Date(project.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="materials" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Materials Category Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Materials by Category
                                </CardTitle>
                                <CardDescription>Cost distribution across material categories</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center">
                                    <CustomPieChart 
                                        data={materialCategoryData} 
                                        size={250} 
                                        formatValue={formatCurrency}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Materials Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Material Costs
                                </CardTitle>
                                <CardDescription>Cost comparison by category</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CustomBarChart 
                                    data={materialCategoryData} 
                                    height={300} 
                                    formatValue={formatCurrency}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Materials Detailed Analysis with Tabs */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Materials Analysis</CardTitle>
                            <CardDescription>Complete breakdown of materials across all projects with specifications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="available" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="available" className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-green-500" />
                                        Available Materials
                                    </TabsTrigger>
                                    <TabsTrigger value="used" className="flex items-center gap-2">
                                        <Box className="h-4 w-4 text-blue-500" />
                                        Used Materials
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="available" className="mt-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left p-4 border-b font-semibold">Project</th>
                                                    <th className="text-left p-4 border-b font-semibold">Material Name</th>
                                                    <th className="text-left p-4 border-b font-semibold">Category</th>
                                                    <th className="text-left p-4 border-b font-semibold">Specifications</th>
                                                    <th className="text-center p-4 border-b font-semibold">Quantity</th>
                                                    <th className="text-center p-4 border-b font-semibold">Unit</th>
                                                    <th className="text-right p-4 border-b font-semibold">Unit Cost</th>
                                                    <th className="text-right p-4 border-b font-semibold">Total Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {projects.flatMap(project => 
                                                    (project.MaterialAvailable || []).map(material => ({
                                                        ...material,
                                                        projectName: project.name || project.projectName || 'Unnamed Project'
                                                    }))
                                                ).length > 0 ? (
                                                    projects.flatMap(project => 
                                                        (project.MaterialAvailable || []).map(material => ({
                                                            ...material,
                                                            projectName: project.name || project.projectName || 'Unnamed Project'
                                                        }))
                                                    ).map((material, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                            <td className="p-4 border-b font-medium">{material.projectName}</td>
                                                            <td className="p-4 border-b">
                                                                <div className="font-medium text-gray-900">{material.name}</div>
                                                            </td>
                                                            <td className="p-4 border-b">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {getMaterialCategory(material.name)}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 border-b">
                                                                <div className="text-sm max-w-xs">
                                                                    {material.specs ? (
                                                                        typeof material.specs === 'string' ? (
                                                                            <span className="text-gray-700">{material.specs}</span>
                                                                        ) : (
                                                                            <div className="space-y-1">
                                                                                {Object.entries(material.specs).map(([key, value]) => (
                                                                                    <div key={key} className="text-xs">
                                                                                        <span className="font-medium text-gray-600">{key}:</span>{' '}
                                                                                        <span className="text-gray-700">{String(value)}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-gray-400 italic">No specifications</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="text-center p-4 border-b font-medium">{material.qnt}</td>
                                                            <td className="text-center p-4 border-b">{material.unit}</td>
                                                            <td className="text-right p-4 border-b">
                                                                {formatCurrency(material.perUnitCost || (material.totalCost || material.cost || 0) / (material.qnt || 1))}
                                                            </td>
                                                            <td className="text-right p-4 border-b font-semibold text-green-600">
                                                                {formatCurrency(material.totalCost || material.cost || 0)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={8} className="text-center p-8 text-gray-500">
                                                            No available materials found across all projects
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="used" className="mt-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left p-4 border-b font-semibold">Project</th>
                                                    <th className="text-left p-4 border-b font-semibold">Material Name</th>
                                                    <th className="text-left p-4 border-b font-semibold">Category</th>
                                                    <th className="text-left p-4 border-b font-semibold">Specifications</th>
                                                    <th className="text-center p-4 border-b font-semibold">Quantity</th>
                                                    <th className="text-center p-4 border-b font-semibold">Unit</th>
                                                    <th className="text-right p-4 border-b font-semibold">Unit Cost</th>
                                                    <th className="text-right p-4 border-b font-semibold">Total Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {projects.flatMap(project => 
                                                    (project.MaterialUsed || []).map(material => ({
                                                        ...material,
                                                        projectName: project.name || project.projectName || 'Unnamed Project'
                                                    }))
                                                ).length > 0 ? (
                                                    projects.flatMap(project => 
                                                        (project.MaterialUsed || []).map(material => ({
                                                            ...material,
                                                            projectName: project.name || project.projectName || 'Unnamed Project'
                                                        }))
                                                    ).map((material, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                            <td className="p-4 border-b font-medium">{material.projectName}</td>
                                                            <td className="p-4 border-b">
                                                                <div className="font-medium text-gray-900">{material.name}</div>
                                                            </td>
                                                            <td className="p-4 border-b">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {getMaterialCategory(material.name)}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 border-b">
                                                                <div className="text-sm max-w-xs">
                                                                    {material.specs ? (
                                                                        typeof material.specs === 'string' ? (
                                                                            <span className="text-gray-700">{material.specs}</span>
                                                                        ) : (
                                                                            <div className="space-y-1">
                                                                                {Object.entries(material.specs).map(([key, value]) => (
                                                                                    <div key={key} className="text-xs">
                                                                                        <span className="font-medium text-gray-600">{key}:</span>{' '}
                                                                                        <span className="text-gray-700">{String(value)}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-gray-400 italic">No specifications</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="text-center p-4 border-b font-medium">{material.qnt}</td>
                                                            <td className="text-center p-4 border-b">{material.unit}</td>
                                                            <td className="text-right p-4 border-b">
                                                                {formatCurrency(material.perUnitCost || (material.totalCost || material.cost || 0) / (material.qnt || 1))}
                                                            </td>
                                                            <td className="text-right p-4 border-b font-semibold text-blue-600">
                                                                {formatCurrency(material.totalCost || material.cost || 0)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={8} className="text-center p-8 text-gray-500">
                                                            No used materials found across all projects
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="labor" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Labor Type Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Labor by Type
                                </CardTitle>
                                <CardDescription>Cost distribution across labor types</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center">
                                    <CustomPieChart 
                                        data={laborTypeData} 
                                        size={250} 
                                        formatValue={formatCurrency}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Labor Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Labor Costs
                                </CardTitle>
                                <CardDescription>Cost comparison by labor type</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CustomBarChart 
                                    data={laborTypeData} 
                                    height={300} 
                                    formatValue={formatCurrency}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Labor Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Labor Analysis</CardTitle>
                            <CardDescription>Complete breakdown of labor across all projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Project</th>
                                            <th className="text-left p-3">Labor Type</th>
                                            <th className="text-center p-3">Status</th>
                                            <th className="text-right p-3">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.flatMap(project => 
                                            (project.Labors || []).map(labor => ({
                                                ...labor,
                                                projectName: project.name || project.projectName || 'Unnamed Project'
                                            }))
                                        ).map((labor, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{labor.projectName}</td>
                                                <td className="p-3">{labor.type}</td>
                                                <td className="text-center p-3">
                                                    <Badge variant={labor.status === 'active' ? 'default' : 'secondary'}>
                                                        {labor.status}
                                                    </Badge>
                                                </td>
                                                <td className="text-right p-3 font-medium">
                                                    {formatCurrency(labor.totalCost || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="equipment" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Equipment Type Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Equipment by Type
                                </CardTitle>
                                <CardDescription>Cost distribution across equipment types</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center">
                                    <CustomPieChart 
                                        data={equipmentTypeData} 
                                        size={250} 
                                        formatValue={formatCurrency}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Equipment Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Equipment Costs
                                </CardTitle>
                                <CardDescription>Cost comparison by equipment type</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CustomBarChart 
                                    data={equipmentTypeData} 
                                    height={300} 
                                    formatValue={formatCurrency}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Equipment Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Equipment Analysis</CardTitle>
                            <CardDescription>Complete breakdown of equipment across all projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Project</th>
                                            <th className="text-left p-3">Equipment Name</th>
                                            <th className="text-center p-3">Type</th>
                                            <th className="text-center p-3">Ownership</th>
                                            <th className="text-right p-3">Purchase Cost</th>
                                            <th className="text-right p-3">Rental Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.flatMap(project => 
                                            (project.Equipment || []).map(equipment => ({
                                                ...equipment,
                                                projectName: project.name || project.projectName || 'Unnamed Project'
                                            }))
                                        ).map((equipment, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{equipment.projectName}</td>
                                                <td className="p-3">{equipment.name}</td>
                                                <td className="text-center p-3">
                                                    <Badge variant="outline">{equipment.type}</Badge>
                                                </td>
                                                <td className="text-center p-3">
                                                    <Badge variant={equipment.rentalCost ? 'destructive' : 'default'}>
                                                        {equipment.rentalCost ? 'Rented' : 'Owned'}
                                                    </Badge>
                                                </td>
                                                <td className="text-right p-3 font-medium">
                                                    {formatCurrency(equipment.cost || 0)}
                                                </td>
                                                <td className="text-right p-3 font-medium">
                                                    {equipment.rentalCost ? formatCurrency(equipment.rentalCost) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="projects" className="space-y-6">
                    {/* Project Performance Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Project Investment Comparison
                            </CardTitle>
                            <CardDescription>Total spending across all projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CustomBarChart 
                                data={projects.map((project, index) => ({
                                    name: (project.name || project.projectName || `Project ${index + 1}`).substring(0, 15),
                                    value: project.spent || 0,
                                    color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'][index % 7]
                                }))} 
                                height={400} 
                                formatValue={formatCurrency}
                            />
                        </CardContent>
                    </Card>

                    {/* Detailed Projects Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Complete Project Details</CardTitle>
                            <CardDescription>Comprehensive view of all project data</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Project Name</th>
                                            <th className="text-center p-3">Status</th>
                                            <th className="text-center p-3">Sections</th>
                                            <th className="text-center p-3">Materials Available</th>
                                            <th className="text-center p-3">Materials Used</th>
                                            <th className="text-center p-3">Labor Entries</th>
                                            <th className="text-center p-3">Equipment</th>
                                            <th className="text-right p-3">Material Cost</th>
                                            <th className="text-right p-3">Labor Cost</th>
                                            <th className="text-right p-3">Equipment Cost</th>
                                            <th className="text-right p-3">Total Spent</th>
                                            <th className="text-center p-3">Created Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.map((project) => {
                                            const materialCost = [
                                                ...(project.MaterialAvailable || []),
                                                ...(project.MaterialUsed || [])
                                            ].reduce((sum, m) => sum + (m.totalCost || m.cost || 0), 0)
                                            
                                            const laborCost = (project.Labors || []).reduce((sum, l) => sum + (l.totalCost || 0), 0)
                                            const equipmentCost = (project.Equipment || []).reduce((sum, e) => sum + (e.cost || 0), 0)

                                            return (
                                                <tr key={project._id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <div className="font-medium">
                                                            {project.name || project.projectName || 'Unnamed Project'}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3">
                                                        <Badge variant={project.isCompleted ? "default" : "secondary"}>
                                                            {project.isCompleted ? "Completed" : "Ongoing"}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-center p-3">{project.section?.length || 0}</td>
                                                    <td className="text-center p-3">{project.MaterialAvailable?.length || 0}</td>
                                                    <td className="text-center p-3">{project.MaterialUsed?.length || 0}</td>
                                                    <td className="text-center p-3">{project.Labors?.length || 0}</td>
                                                    <td className="text-center p-3">{project.Equipment?.length || 0}</td>
                                                    <td className="text-right p-3 font-medium">{formatCurrency(materialCost)}</td>
                                                    <td className="text-right p-3 font-medium">{formatCurrency(laborCost)}</td>
                                                    <td className="text-right p-3 font-medium">{formatCurrency(equipmentCost)}</td>
                                                    <td className="text-right p-3 font-bold text-green-600">
                                                        {formatCurrency(project.spent || 0)}
                                                    </td>
                                                    <td className="text-center p-3 text-sm text-muted-foreground">
                                                        {new Date(project.createdAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}