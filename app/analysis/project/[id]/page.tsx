"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
    ArrowLeft,
    Home
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

export default function SingleProjectAnalysisPage() {
    const params = useParams()
    const router = useRouter()
    const projectId = params.id as string
    
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("overview")
    const [refreshing, setRefreshing] = useState(false)

    // Fetch single project data
    const fetchProjectData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        setRefreshing(true)
        
        // Declare clientId at function level so it's accessible in catch block
        let clientId = localStorage.getItem('clientId') || 
                      sessionStorage.getItem('clientId') ||
                      localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!)?.clientId : null
        
        try {
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
            
            console.log('🔍 Fetching project data for:', projectId)
            
            // First try to get all projects and find the specific one
            const response = await fetch(`/api/project?clientId=${clientId}`)
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch project data')
            }
            
            console.log('📡 API Response:', data)
            console.log('📡 Response keys:', Object.keys(data))
            
            // Handle the correct API response structure for projects API
            let projects = []
            if (data.success && data.data && data.data.projects) {
                // Response structure: { success: true, data: { projects: [...], meta: {...} } }
                projects = data.data.projects
                console.log('📊 Using data.data.projects structure')
            } else if (data.success && data.projects) {
                // Alternative structure: { success: true, projects: [...] }
                projects = data.projects
                console.log('📊 Using data.projects structure')
            } else if (data.data && Array.isArray(data.data)) {
                // Direct array structure: { data: [...] }
                projects = data.data
                console.log('📊 Using data.data array structure')
            } else if (Array.isArray(data)) {
                // Direct array response
                projects = data
                console.log('📊 Using direct array structure')
            } else {
                console.log('❌ Unknown API response structure:', data)
                throw new Error('Invalid API response structure')
            }
            
            console.log(`📊 Found ${projects.length} projects, looking for ID: ${projectId}`)
            
            if (projects.length > 0) {
                const foundProject = projects.find((p: Project) => p._id === projectId)
                if (foundProject) {
                    setProject(foundProject)
                    console.log('✅ Project loaded:', foundProject.name || foundProject.projectName)
                    toast.success('Project data loaded successfully')
                } else {
                    console.log('❌ Project not found in list. Available IDs:', projects.map((p: any) => p._id))
                    throw new Error(`Project with ID ${projectId} not found`)
                }
            } else {
                throw new Error('No projects found for this client')
            }
        } catch (error) {
            console.error('❌ Error fetching project:', error)
            
            // Try fallback approach - fetch specific project by ID
            console.log('🔄 Trying fallback approach - fetching project by ID...')
            try {
                const fallbackResponse = await fetch(`/api/project?clientId=${clientId}&id=${projectId}`)
                const fallbackData = await fallbackResponse.json()
                
                console.log('🔄 Fallback response:', fallbackData)
                
                if (fallbackResponse.ok && fallbackData.success && fallbackData.data) {
                    setProject(fallbackData.data)
                    console.log('✅ Project loaded via fallback:', fallbackData.data.name || fallbackData.data.projectName)
                    toast.success('Project data loaded successfully')
                } else {
                    throw new Error(fallbackData.message || 'Project not found')
                }
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError)
                toast.error(error instanceof Error ? error.message : 'Failed to fetch project data')
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    // Calculate project analytics
    const calculateProjectAnalytics = () => {
        if (!project) return null

        const materialCost = [
            ...(project.MaterialAvailable || []),
            ...(project.MaterialUsed || [])
        ].reduce((sum, m) => sum + (m.totalCost || m.cost || 0), 0)
        
        const laborCost = (project.Labors || []).reduce((sum, l) => sum + (l.totalCost || 0), 0)
        const equipmentCost = (project.Equipment || []).reduce((sum, e) => sum + (e.cost || 0), 0)
        
        // Material categories
        const materialCategories: { [key: string]: number } = {}
        const allMaterials = [
            ...(project.MaterialAvailable || []),
            ...(project.MaterialUsed || [])
        ]
        
        allMaterials.forEach(material => {
            const category = getMaterialCategory(material.name)
            const cost = material.totalCost || material.cost || 0
            materialCategories[category] = (materialCategories[category] || 0) + cost
        })
        
        // Labor types
        const laborTypes: { [key: string]: number } = {}
        ;(project.Labors || []).forEach(labor => {
            laborTypes[labor.type] = (laborTypes[labor.type] || 0) + labor.totalCost
        })
        
        // Equipment types
        const equipmentTypes: { [key: string]: number } = {}
        ;(project.Equipment || []).forEach(equipment => {
            equipmentTypes[equipment.type] = (equipmentTypes[equipment.type] || 0) + equipment.cost
        })

        return {
            materialCost,
            laborCost,
            equipmentCost,
            totalCost: materialCost + laborCost + equipmentCost,
            materialCategories,
            laborTypes,
            equipmentTypes,
            completedSections: (project.section || []).filter(s => s.isCompleted).length,
            totalSections: (project.section || []).length,
            availableMaterials: project.MaterialAvailable?.length || 0,
            usedMaterials: project.MaterialUsed?.length || 0,
            totalLabors: project.Labors?.length || 0,
            totalEquipment: project.Equipment?.length || 0,
            activeLabors: (project.Labors || []).filter(l => l.status === 'active').length,
            rentedEquipment: (project.Equipment || []).filter(e => e.rentalCost && e.rentalCost > 0).length
        }
    }

    const analytics = calculateProjectAnalytics()

    // Prepare chart data
    const costBreakdownData = analytics ? [
        { name: 'Materials', value: analytics.materialCost, color: '#3b82f6' },
        { name: 'Labor', value: analytics.laborCost, color: '#ef4444' },
        { name: 'Equipment', value: analytics.equipmentCost, color: '#10b981' }
    ] : []

    const materialCategoryData = analytics ? Object.entries(analytics.materialCategories).map(([category, cost], index) => ({
        name: category,
        value: cost,
        color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'][index % 7]
    })) : []

    const laborTypeData = analytics ? Object.entries(analytics.laborTypes).map(([type, cost], index) => ({
        name: type,
        value: cost,
        color: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]
    })) : []

    const equipmentTypeData = analytics ? Object.entries(analytics.equipmentTypes).map(([type, cost], index) => ({
        name: type,
        value: cost,
        color: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'][index % 5]
    })) : []

    // Load data on component mount
    useEffect(() => {
        if (projectId) {
            fetchProjectData()
        }
    }, [projectId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading project analysis...</p>
                    <p className="text-xs text-muted-foreground mt-2">Project ID: {projectId}</p>
                </div>
            </div>
        )
    }

    if (!project || !analytics) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Project not found or failed to load</p>
                    <div className="text-xs text-muted-foreground mb-4">
                        <p>Project ID: {projectId}</p>
                        <p>Client ID: {localStorage.getItem('clientId') || 'Not found'}</p>
                    </div>
                    <div className="space-x-2">
                        <Button onClick={() => fetchProjectData()} className="mb-2">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                        <Link href="/analysis">
                            <Button variant="outline">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Analysis
                            </Button>
                        </Link>
                        <Link href="/analysis/debug">
                            <Button variant="outline" size="sm">
                                Debug API
                            </Button>
                        </Link>
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
                <div className="flex items-center gap-4">
                    <Link href="/analysis">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Analysis
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">
                            {project.name || project.projectName || 'Project Analysis'}
                        </h1>
                        <p className="text-muted-foreground">
                            Comprehensive analysis and insights for this project
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => fetchProjectData(false)}
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

            {/* Project Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Project Information
                            </CardTitle>
                            <CardDescription>
                                Created: {new Date(project.createdAt).toLocaleDateString()} | 
                                Last Updated: {new Date(project.updatedAt).toLocaleDateString()}
                            </CardDescription>
                        </div>
                        <Badge variant={project.isCompleted ? "default" : "secondary"} className="text-sm">
                            {project.isCompleted ? "Completed" : "Ongoing"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {analytics.totalSections}
                            </div>
                            <p className="text-sm text-blue-700">Total Sections</p>
                            <p className="text-xs text-muted-foreground">
                                {analytics.completedSections} completed
                            </p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(project.spent || 0)}
                            </div>
                            <p className="text-sm text-green-700">Total Spent</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                                {analytics.availableMaterials + analytics.usedMaterials}
                            </div>
                            <p className="text-sm text-orange-700">Total Materials</p>
                            <p className="text-xs text-muted-foreground">
                                {analytics.availableMaterials} available, {analytics.usedMaterials} used
                            </p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {analytics.totalLabors}
                            </div>
                            <p className="text-sm text-purple-700">Labor Entries</p>
                            <p className="text-xs text-muted-foreground">
                                {analytics.activeLabors} active
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Material Costs</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.materialCost)}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalCost > 0 ? ((analytics.materialCost / analytics.totalCost) * 100).toFixed(1) : 0}% of total costs
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Labor Costs</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.laborCost)}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalCost > 0 ? ((analytics.laborCost / analytics.totalCost) * 100).toFixed(1) : 0}% of total costs
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Equipment Costs</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.equipmentCost)}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalCost > 0 ? ((analytics.equipmentCost / analytics.totalCost) * 100).toFixed(1) : 0}% of total costs
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
                    <TabsTrigger value="sections">Sections</TabsTrigger>
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

                        {/* Project Progress */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Project Progress
                                </CardTitle>
                                <CardDescription>Section completion status</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Sections Completed</span>
                                        <span>{analytics.completedSections} / {analytics.totalSections}</span>
                                    </div>
                                    <Progress 
                                        value={analytics.totalSections > 0 ? (analytics.completedSections / analytics.totalSections) * 100 : 0} 
                                        className="h-3"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {analytics.totalSections > 0 ? Math.round((analytics.completedSections / analytics.totalSections) * 100) : 0}% completion rate
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <div className="text-lg font-bold text-green-600">
                                            {analytics.completedSections}
                                        </div>
                                        <p className="text-xs text-green-700">Completed</p>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                        <div className="text-lg font-bold text-yellow-600">
                                            {analytics.totalSections - analytics.completedSections}
                                        </div>
                                        <p className="text-xs text-yellow-700">Pending</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Resource Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Resource Summary</CardTitle>
                            <CardDescription>Overview of materials, labor, and equipment</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Package className="h-4 w-4 text-blue-500" />
                                        Materials
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Available</span>
                                            <Badge variant="default">{analytics.availableMaterials}</Badge>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Used</span>
                                            <Badge variant="secondary">{analytics.usedMaterials}</Badge>
                                        </div>
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Total Cost</span>
                                            <span>{formatCurrency(analytics.materialCost)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4 text-purple-500" />
                                        Labor
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Active</span>
                                            <Badge variant="default">{analytics.activeLabors}</Badge>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Total Entries</span>
                                            <Badge variant="secondary">{analytics.totalLabors}</Badge>
                                        </div>
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Total Cost</span>
                                            <span>{formatCurrency(analytics.laborCost)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Wrench className="h-4 w-4 text-green-500" />
                                        Equipment
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Owned</span>
                                            <Badge variant="default">{analytics.totalEquipment - analytics.rentedEquipment}</Badge>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Rented</span>
                                            <Badge variant="destructive">{analytics.rentedEquipment}</Badge>
                                        </div>
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Total Cost</span>
                                            <span>{formatCurrency(analytics.equipmentCost)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-6">
                    {/* Materials Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    {/* Materials Detailed Tables with Tabs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Materials Details
                            </CardTitle>
                            <CardDescription>
                                Complete breakdown of all materials with specifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="available" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="available" className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-green-500" />
                                        Available Materials ({analytics.availableMaterials})
                                    </TabsTrigger>
                                    <TabsTrigger value="used" className="flex items-center gap-2">
                                        <Box className="h-4 w-4 text-blue-500" />
                                        Used Materials ({analytics.usedMaterials})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="available" className="mt-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                            <thead className="bg-gray-50">
                                                <tr>
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
                                                {(project.MaterialAvailable || []).length > 0 ? (
                                                    (project.MaterialAvailable || []).map((material, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
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
                                                        <td colSpan={7} className="text-center p-8 text-gray-500">
                                                            No available materials found
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
                                                {(project.MaterialUsed || []).length > 0 ? (
                                                    (project.MaterialUsed || []).map((material, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
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
                                                        <td colSpan={7} className="text-center p-8 text-gray-500">
                                                            No used materials found
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
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Labor Details ({analytics.totalLabors} entries)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Labor Type</th>
                                            <th className="text-center p-3">Status</th>
                                            <th className="text-right p-3">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(project.Labors || []).map((labor, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{labor.type}</td>
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
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="h-5 w-5" />
                                Equipment Details ({analytics.totalEquipment} items)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Equipment Name</th>
                                            <th className="text-center p-3">Type</th>
                                            <th className="text-center p-3">Ownership</th>
                                            <th className="text-right p-3">Purchase Cost</th>
                                            <th className="text-right p-3">Rental Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(project.Equipment || []).map((equipment, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{equipment.name}</td>
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

                <TabsContent value="sections" className="space-y-6">
                    {/* Sections Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="h-5 w-5" />
                                Project Sections ({analytics.totalSections} sections)
                            </CardTitle>
                            <CardDescription>
                                {analytics.completedSections} completed, {analytics.totalSections - analytics.completedSections} pending
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(project.section || []).map((section) => (
                                    <div key={section._id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium">{section.name}</h4>
                                            <Badge variant={section.isCompleted ? "default" : "outline"}>
                                                {section.isCompleted ? "Completed" : "Pending"}
                                            </Badge>
                                        </div>
                                        {section.miniSections && section.miniSections.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm text-muted-foreground">
                                                    Mini-sections ({section.miniSections.length}):
                                                </p>
                                                <div className="space-y-1">
                                                    {section.miniSections.map((miniSection) => (
                                                        <div key={miniSection._id} className="flex items-center justify-between text-sm">
                                                            <span>{miniSection.name}</span>
                                                            <Badge 
                                                                variant={miniSection.isCompleted ? "default" : "outline"} 
                                                                className="text-xs"
                                                            >
                                                                {miniSection.isCompleted ? "Done" : "Pending"}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}