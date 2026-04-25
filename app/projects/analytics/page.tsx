"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    Building2, 
    Package, 
    Users, 
    Wrench, 
    DollarSign,
    BarChart3,
    PieChart as PieChartIcon,
    RefreshCw,
    Download,
    Eye,
    ArrowLeft,
    Layers,
    ChevronRight,
    TrendingUp,
    Activity
} from "lucide-react"
import { toast, Toaster } from "sonner"
import { getClientId } from "@/functions/clientId"

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
    specs?: any
}

interface Labor {
    _id: string
    type: string
    category?: string
    totalCost: number
    status: string
    sectionId?: string
    miniSectionId?: string
}

interface Equipment {
    _id: string
    name: string
    type: string
    totalCost?: number
    cost?: number
    status?: string
    sectionId?: string
    projectSectionId?: string
}

interface Section {
    _id: string
    name: string
    type?: string
    isCompleted?: boolean
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
    Equipments?: Equipment[]
    section?: Section[]
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

// Simple Pie Chart Component
interface PieChartProps {
    data: { name: string; value: number; color: string }[]
    size?: number
}

const SimplePieChart: React.FC<PieChartProps> = ({ data, size = 200 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    
    if (total === 0) {
        return (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <p className="text-muted-foreground text-sm">No data</p>
            </div>
        )
    }
    
    let currentAngle = -90
    const paths = data.map((item, index) => {
        const percentage = (item.value / total) * 100
        const angle = (percentage / 100) * 360
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        currentAngle = endAngle
        
        const startX = size / 2 + (size / 2 - 10) * Math.cos((startAngle * Math.PI) / 180)
        const startY = size / 2 + (size / 2 - 10) * Math.sin((startAngle * Math.PI) / 180)
        const endX = size / 2 + (size / 2 - 10) * Math.cos((endAngle * Math.PI) / 180)
        const endY = size / 2 + (size / 2 - 10) * Math.sin((endAngle * Math.PI) / 180)
        
        const largeArcFlag = angle > 180 ? 1 : 0
        
        return (
            <path
                key={index}
                d={`M ${size / 2} ${size / 2} L ${startX} ${startY} A ${size / 2 - 10} ${size / 2 - 10} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
            />
        )
    })
    
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {paths}
            <circle cx={size / 2} cy={size / 2} r={size / 4} fill="white" />
        </svg>
    )
}

export default function ProjectAnalyticsPage() {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showCompleted, setShowCompleted] = useState(false)

    // Fetch projects data
    const fetchProjectsData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        setRefreshing(true)
        
        try {
            const clientId = getClientId()
            
            if (!clientId) {
                throw new Error('No client ID found. Please log in again.')
            }
            
            console.log('🔍 Fetching projects for clientId:', clientId)
            
            const response = await fetch(`/api/project?clientId=${clientId}`)
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch projects')
            }
            
            let projectsArray: Project[] = []
            
            if (Array.isArray(data)) {
                projectsArray = data
            } else if (data.success && data.projects) {
                projectsArray = data.projects
            } else if (data.data && Array.isArray(data.data)) {
                projectsArray = data.data
            } else if (data.success && data.data && Array.isArray(data.data)) {
                projectsArray = data.data
            }
            
            console.log(`📊 Fetched ${projectsArray.length} projects`)
            
            // Load completion status and equipment data for all projects
            const projectsWithData = await Promise.all(
                projectsArray.map(async (project) => {
                    let updatedProject = { ...project }
                    
                    // Load completion status
                    try {
                        if (project._id) {
                            const response = await fetch(`/api/completion?updateType=project&id=${project._id}`)
                            const responseData = await response.json()
                            if (responseData.success && responseData.data) {
                                updatedProject.isCompleted = Boolean(responseData.data.isCompleted)
                            }
                        }
                    } catch (error) {
                        console.warn(`Could not load completion status for project ${project._id}:`, error)
                        updatedProject.isCompleted = false
                    }
                    
                    // Load equipment data separately (not embedded in project)
                    try {
                        if (project._id) {
                            console.log(`🔧 Fetching equipment for project ${project.name} (${project._id})`)
                            const equipmentResponse = await fetch(`/api/equipment?projectId=${project._id}`)
                            const equipmentData = await equipmentResponse.json()
                            
                            if (equipmentResponse.ok && equipmentData.success) {
                                const equipmentArray = equipmentData.data || []
                                updatedProject.Equipments = equipmentArray
                                console.log(`✅ Loaded ${equipmentArray.length} equipment items for project ${project.name}`)
                                
                                if (equipmentArray.length > 0) {
                                    const totalEquipmentCost = equipmentArray.reduce(
                                        (sum: number, eq: any) => sum + (eq.totalCost || eq.cost || 0), 
                                        0
                                    )
                                    console.log(`💰 Total equipment cost for ${project.name}: ₹${totalEquipmentCost}`)
                                }
                            } else {
                                console.warn(`⚠️ No equipment data for project ${project.name}`)
                                updatedProject.Equipments = []
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error loading equipment for project ${project._id}:`, error)
                        updatedProject.Equipments = []
                    }
                    
                    return updatedProject
                })
            )
            
            console.log('✅ All project data loaded with equipment')
            
            setProjects(projectsWithData)
            
            if (projectsWithData.length > 0) {
                toast.success('Projects data loaded successfully')
            } else {
                toast.info('No projects found')
            }
        } catch (error) {
            console.error('Error fetching projects:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to fetch projects data')
            setProjects([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    // Calculate project expenses
    const calculateProjectExpenses = (project: Project) => {
        const available = (project.MaterialAvailable || []).reduce(
            (sum, m) => sum + (m.totalCost || m.cost || 0), 0
        )
        const used = (project.MaterialUsed || []).reduce(
            (sum, m) => sum + (m.totalCost || m.cost || 0), 0
        )
        const labor = (project.Labors || []).reduce(
            (sum, l) => sum + (l.totalCost || 0), 0
        )
        
        // Calculate equipment cost with detailed logging
        let equipment = 0
        if (project.Equipments && Array.isArray(project.Equipments)) {
            console.log(`🔧 Calculating equipment for ${project.name}:`, {
                equipmentCount: project.Equipments.length,
                equipmentItems: project.Equipments.map(e => ({
                    type: e.type,
                    totalCost: e.totalCost,
                    cost: e.cost,
                    quantity: (e as any).quantity,
                    perUnitCost: (e as any).perUnitCost,
                    status: e.status
                }))
            })
            
            equipment = project.Equipments.reduce((sum, e) => {
                // Only count active equipment
                if (e.status && e.status !== 'active') {
                    console.log(`⏭️ Skipping ${e.type} - status: ${e.status}`)
                    return sum
                }
                
                const equipmentCost = e.totalCost || e.cost || 0
                console.log(`➕ Adding ${e.type}: ₹${equipmentCost}`)
                return sum + equipmentCost
            }, 0)
            
            console.log(`💰 Total equipment cost for ${project.name}: ₹${equipment}`)
        } else {
            console.log(`⚠️ No equipment array for ${project.name}`)
        }
        
        return {
            available,
            used,
            labor,
            equipment,
            total: project.spent || 0
        }
    }

    // Filter projects
    const filteredProjects = projects.filter(p => 
        showCompleted ? p.isCompleted === true : p.isCompleted === false
    )

    // Calculate totals
    const ongoingProjects = projects.filter(p => p.isCompleted === false)
    const completedProjects = projects.filter(p => p.isCompleted === true)
    
    const totalExpenses = filteredProjects.reduce((sum, p) => sum + (p.spent || 0), 0)
    const totalMaterials = filteredProjects.reduce((sum, p) => {
        const expenses = calculateProjectExpenses(p)
        return sum + expenses.used
    }, 0)
    const totalLabor = filteredProjects.reduce((sum, p) => {
        const expenses = calculateProjectExpenses(p)
        return sum + expenses.labor
    }, 0)
    const totalEquipment = filteredProjects.reduce((sum, p) => {
        const expenses = calculateProjectExpenses(p)
        return sum + expenses.equipment
    }, 0)

    // Prepare pie chart data
    const pieChartData = filteredProjects
        .filter(p => (p.spent || 0) > 0)
        .map((p, index) => ({
            name: p.name,
            value: p.spent || 0,
            color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'][index % 7]
        }))

    // Navigate to project details
    const handleViewProject = (projectId: string) => {
        router.push(`/projects/analytics/dashboard?projectId=${projectId}`)
    }

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
                        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                        <p className="text-muted-foreground">
                            Financial overview and project insights
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
                    {/* Test Equipment API Button */}
                    <Button 
                        variant="outline"
                        className="border-purple-500 text-purple-600"
                        onClick={async () => {
                            try {
                                const clientId = getClientId()
                                console.log('🧪 Testing Equipment API...')
                                
                                // Test 1: Get all equipment
                                const allEquipmentResponse = await fetch('/api/equipment')
                                const allEquipmentData = await allEquipmentResponse.json()
                                console.log('📦 All Equipment:', allEquipmentData)
                                
                                // Test 2: Get equipment for first project
                                if (projects.length > 0) {
                                    const firstProjectId = projects[0]._id
                                    const projectEquipmentResponse = await fetch(`/api/equipment?projectId=${firstProjectId}`)
                                    const projectEquipmentData = await projectEquipmentResponse.json()
                                    console.log(`🔧 Equipment for project ${projects[0].name}:`, projectEquipmentData)
                                }
                                
                                toast.success('Check console for equipment API test results')
                            } catch (error) {
                                console.error('❌ Equipment API test failed:', error)
                                toast.error('Equipment API test failed')
                            }
                        }}
                    >
                        🧪 Test Equipment API
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card 
                    className={`cursor-pointer transition-all ${!showCompleted ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setShowCompleted(false)}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ongoing Projects</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ongoingProjects.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Active projects
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    className={`cursor-pointer transition-all ${showCompleted ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setShowCompleted(true)}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
                        <Building2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedProjects.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Finished projects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <Layers className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{projects.length}</div>
                        <p className="text-xs text-muted-foreground">
                            All projects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">
                            {showCompleted ? 'Completed' : 'Ongoing'} projects
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Expense Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Material Costs</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalMaterials)}</div>
                        <p className="text-xs text-muted-foreground">
                            {((totalMaterials / totalExpenses) * 100 || 0).toFixed(1)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Labor Costs</CardTitle>
                        <Users className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalLabor)}</div>
                        <p className="text-xs text-muted-foreground">
                            {((totalLabor / totalExpenses) * 100 || 0).toFixed(1)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Equipment Costs</CardTitle>
                        <Wrench className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalEquipment)}</div>
                        <p className="text-xs text-muted-foreground">
                            {((totalEquipment / totalExpenses) * 100 || 0).toFixed(1)}% of total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Debug Panel - Remove this after debugging */}
                {process.env.NODE_ENV === 'development' && (
                    <Card className="lg:col-span-3 border-yellow-500 bg-yellow-50">
                        <CardHeader>
                            <CardTitle className="text-yellow-800">🐛 Debug Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <p><strong>Total Projects:</strong> {projects.length}</p>
                                <p><strong>Filtered Projects:</strong> {filteredProjects.length}</p>
                                <p><strong>Total Equipment Cost:</strong> {formatCurrency(totalEquipment)}</p>
                                <div className="mt-4">
                                    <strong>Equipment by Project:</strong>
                                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                                        {filteredProjects.map(p => {
                                            const expenses = calculateProjectExpenses(p)
                                            return (
                                                <div key={p._id} className="text-xs border-l-2 border-yellow-600 pl-2">
                                                    <strong>{p.name}:</strong> {p.Equipments?.length || 0} items, 
                                                    Cost: {formatCurrency(expenses.equipment)}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pie Chart */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            {showCompleted ? 'Completed' : 'Ongoing'} Projects
                        </CardTitle>
                        <CardDescription>
                            Cost distribution
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <SimplePieChart data={pieChartData} size={220} />
                        <div className="mt-4 w-full space-y-2">
                            {pieChartData.slice(0, 5).map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="truncate max-w-[150px]">{item.name}</span>
                                    </div>
                                    <span className="font-medium">{formatCurrency(item.value)}</span>
                                </div>
                            ))}
                            {pieChartData.length > 5 && (
                                <p className="text-xs text-muted-foreground text-center">
                                    +{pieChartData.length - 5} more projects
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Projects List */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>
                            {showCompleted ? 'Completed' : 'Ongoing'} Projects ({filteredProjects.length})
                        </CardTitle>
                        <CardDescription>
                            Click on a project to view detailed analytics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredProjects.length === 0 ? (
                            <div className="text-center py-12">
                                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    No {showCompleted ? 'completed' : 'ongoing'} projects found
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {filteredProjects.map((project) => {
                                    const expenses = calculateProjectExpenses(project)
                                    return (
                                        <div
                                            key={project._id}
                                            className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                                            onClick={() => handleViewProject(project._id)}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">{project.name}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {project.section?.length || 0} sections
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={project.isCompleted ? "default" : "secondary"}>
                                                        {project.isCompleted ? "Completed" : "Ongoing"}
                                                    </Badge>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="text-center p-2 bg-green-50 rounded">
                                                    <div className="text-lg font-bold text-green-600">
                                                        {formatCurrency(expenses.total)}
                                                    </div>
                                                    <p className="text-xs text-green-700">Total</p>
                                                </div>
                                                <div className="text-center p-2 bg-blue-50 rounded">
                                                    <div className="text-sm font-bold text-blue-600">
                                                        {formatCurrency(expenses.used)}
                                                    </div>
                                                    <p className="text-xs text-blue-700">Materials</p>
                                                </div>
                                                <div className="text-center p-2 bg-orange-50 rounded">
                                                    <div className="text-sm font-bold text-orange-600">
                                                        {formatCurrency(expenses.labor)}
                                                    </div>
                                                    <p className="text-xs text-orange-700">Labor</p>
                                                </div>
                                                <div className="text-center p-2 bg-purple-50 rounded">
                                                    <div className="text-sm font-bold text-purple-600">
                                                        {formatCurrency(expenses.equipment)}
                                                    </div>
                                                    <p className="text-xs text-purple-700">Equipment</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
