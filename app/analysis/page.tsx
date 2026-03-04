"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    X,
    Calendar,
    MapPin,
    Activity
} from "lucide-react"
import { toast, Toaster } from "sonner"

// Types based on the existing structure
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

interface AnalyticsData {
    projects: Project[]
    totalProjects: number
    completedProjects: number
    ongoingProjects: number
    totalSpent: number
    totalMaterialCost: number
    totalLaborCost: number
    totalEquipmentCost: number
    materialStats: {
        totalAvailable: number
        totalUsed: number
        lowStockItems: number
        categories: { [key: string]: number }
    }
    laborStats: {
        activeWorkers: number
        totalLaborHours: number
        averageCostPerHour: number
    }
    equipmentStats: {
        totalEquipment: number
        activeRentals: number
        totalRentalCost: number
    }
}

// Project Card Component
interface ProjectCardProps {
    project: Project
    onViewDetails: (projectId: string) => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onViewDetails }) => {
    const totalMaterials = (project.MaterialAvailable?.length || 0) + (project.MaterialUsed?.length || 0)
    const totalLabors = project.Labors?.length || 0
    const totalEquipment = project.Equipment?.length || 0
    
    // Calculate total costs
    const materialCost = [
        ...(project.MaterialAvailable || []),
        ...(project.MaterialUsed || [])
    ].reduce((sum, m) => sum + (m.totalCost || m.cost || 0), 0)
    
    const laborCost = (project.Labors || []).reduce((sum: number, l: any) => sum + (l.totalCost || 0), 0)
    const equipmentCost = (project.Equipment || []).reduce((sum: number, e: any) => sum + (e.totalCost || e.cost || 0), 0)

    return (
        <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">
                            {project.name || project.projectName || 'Unnamed Project'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.createdAt).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <Badge variant={project.isCompleted ? "default" : "secondary"}>
                        {project.isCompleted ? "Completed" : "Ongoing"}
                    </Badge>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                            {formatCurrency(project.spent || 0)}
                        </div>
                        <p className="text-xs text-green-700">Total Spent</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                            {project.section?.length || 0}
                        </div>
                        <p className="text-xs text-blue-700">Sections</p>
                    </div>
                </div>

                {/* Resource Summary */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-orange-500" />
                            <span>Materials</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{totalMaterials}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatCurrency(materialCost)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>Labor</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{totalLabors}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatCurrency(laborCost)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-indigo-500" />
                            <span>Equipment</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{totalEquipment}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatCurrency(equipmentCost)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => onViewDetails(project._id)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
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

// Materials Detail View Component
interface MaterialsDetailViewProps {
    project: Project
    timeFilter: 'daily' | 'weekly' | 'monthly'
    groupDataByTime: (data: any[], timeFilter: 'daily' | 'weekly' | 'monthly') => { [key: string]: any[] }
}

const MaterialsDetailView: React.FC<MaterialsDetailViewProps> = ({ project, timeFilter, groupDataByTime }) => {
    const allMaterials = [
        ...(project.MaterialAvailable || []).map(m => ({ ...m, status: 'available' })),
        ...(project.MaterialUsed || []).map(m => ({ ...m, status: 'used' }))
    ]

    const groupedMaterials = groupDataByTime(allMaterials, timeFilter)
    const materialsByCategory = allMaterials.reduce((acc, material) => {
        const category = getMaterialCategory(material.name)
        if (!acc[category]) acc[category] = []
        acc[category].push(material)
        return acc
    }, {} as { [key: string]: any[] })

    return (
        <div className="space-y-6">
            {/* Materials Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {project.MaterialAvailable?.length || 0}
                            </div>
                            <p className="text-sm text-muted-foreground">Available Materials</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {project.MaterialUsed?.length || 0}
                            </div>
                            <p className="text-sm text-muted-foreground">Used Materials</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {Object.keys(materialsByCategory).length}
                            </div>
                            <p className="text-sm text-muted-foreground">Categories</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Materials by Category */}
            <Card>
                <CardHeader>
                    <CardTitle>Materials by Category</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(materialsByCategory).map(([category, materials]) => (
                            <div key={category} className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    {category} ({materials.length} items)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {materials.map((material, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div>
                                                <span className="font-medium">{material.name}</span>
                                                <div className="text-sm text-muted-foreground">
                                                    {material.qnt} {material.unit}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium">
                                                    {formatCurrency(material.totalCost || material.cost || 0)}
                                                </div>
                                                <Badge variant={material.status === 'available' ? 'default' : 'secondary'} className="text-xs">
                                                    {material.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Timeline View */}
            <Card>
                <CardHeader>
                    <CardTitle>Materials Timeline ({timeFilter})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(groupedMaterials).map(([period, materials]) => (
                            <div key={period} className="border-l-2 border-blue-200 pl-4">
                                <h4 className="font-medium text-blue-600">{period}</h4>
                                <div className="mt-2 space-y-2">
                                    {materials.map((material, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <span>{material.name} ({material.qnt} {material.unit})</span>
                                            <Badge variant="outline">{material.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// Labor Detail View Component
interface LaborDetailViewProps {
    project: Project
    timeFilter: 'daily' | 'weekly' | 'monthly'
    groupDataByTime: (data: any[], timeFilter: 'daily' | 'weekly' | 'monthly') => { [key: string]: any[] }
}

const LaborDetailView: React.FC<LaborDetailViewProps> = ({ project, timeFilter, groupDataByTime }) => {
    const labors = project.Labors || []
    const groupedLabors = groupDataByTime(labors, timeFilter)
    const laborsByType = labors.reduce((acc, labor) => {
        if (!acc[labor.type]) acc[labor.type] = []
        acc[labor.type].push(labor)
        return acc
    }, {} as { [key: string]: any[] })

    const totalLaborCost = labors.reduce((sum, labor) => sum + (labor.totalCost || 0), 0)
    const activeLabors = labors.filter(labor => labor.status === 'active').length
    const completedLabors = labors.filter(labor => labor.status === 'completed').length

    return (
        <div className="space-y-6">
            {/* Labor Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {labors.length}
                            </div>
                            <p className="text-sm text-muted-foreground">Total Labor Entries</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {activeLabors}
                            </div>
                            <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {completedLabors}
                            </div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {formatCurrency(totalLaborCost)}
                            </div>
                            <p className="text-sm text-muted-foreground">Total Cost</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Labor by Type */}
            <Card>
                <CardHeader>
                    <CardTitle>Labor by Type</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(laborsByType).map(([type, typeLabors]) => (
                            <div key={type} className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    {type} ({typeLabors.length} entries)
                                </h4>
                                <div className="space-y-2">
                                    {typeLabors.map((labor, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div>
                                                <span className="font-medium">Labor Entry #{index + 1}</span>
                                                <div className="text-sm text-muted-foreground">
                                                    Type: {labor.type}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium">
                                                    {formatCurrency(labor.totalCost || 0)}
                                                </div>
                                                <Badge variant={labor.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                                    {labor.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Labor Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>Labor Timeline ({timeFilter})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(groupedLabors).map(([period, periodLabors]) => (
                            <div key={period} className="border-l-2 border-purple-200 pl-4">
                                <h4 className="font-medium text-purple-600">{period}</h4>
                                <div className="mt-2 space-y-2">
                                    {periodLabors.map((labor, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <span>{labor.type} - {formatCurrency(labor.totalCost || 0)}</span>
                                            <Badge variant="outline">{labor.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// Equipment Detail View Component
interface EquipmentDetailViewProps {
    project: Project
    timeFilter: 'daily' | 'weekly' | 'monthly'
    groupDataByTime: (data: any[], timeFilter: 'daily' | 'weekly' | 'monthly') => { [key: string]: any[] }
}

const EquipmentDetailView: React.FC<EquipmentDetailViewProps> = ({ project, timeFilter, groupDataByTime }) => {
    const equipment = project.Equipment || []
    const groupedEquipment = groupDataByTime(equipment, timeFilter)
    const equipmentByType = equipment.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = []
        acc[item.type].push(item)
        return acc
    }, {} as { [key: string]: any[] })

    const totalEquipmentCost = equipment.reduce((sum, item) => sum + (item.cost || 0), 0)
    const totalRentalCost = equipment.reduce((sum, item) => sum + (item.rentalCost || 0), 0)
    const rentedEquipment = equipment.filter(item => item.rentalCost && item.rentalCost > 0).length

    return (
        <div className="space-y-6">
            {/* Equipment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">
                                {equipment.length}
                            </div>
                            <p className="text-sm text-muted-foreground">Total Equipment</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {rentedEquipment}
                            </div>
                            <p className="text-sm text-muted-foreground">Rented Items</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalEquipmentCost)}
                            </div>
                            <p className="text-sm text-muted-foreground">Purchase Cost</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalRentalCost)}
                            </div>
                            <p className="text-sm text-muted-foreground">Rental Cost</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Equipment by Type */}
            <Card>
                <CardHeader>
                    <CardTitle>Equipment by Type</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(equipmentByType).map(([type, typeEquipment]) => (
                            <div key={type} className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Wrench className="h-4 w-4" />
                                    {type} ({typeEquipment.length} items)
                                </h4>
                                <div className="space-y-2">
                                    {typeEquipment.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div>
                                                <span className="font-medium">{item.name}</span>
                                                <div className="text-sm text-muted-foreground">
                                                    Type: {item.type}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium">
                                                    {formatCurrency(item.cost || 0)}
                                                </div>
                                                {item.rentalCost && item.rentalCost > 0 && (
                                                    <div className="text-sm text-muted-foreground">
                                                        Rental: {formatCurrency(item.rentalCost)}
                                                    </div>
                                                )}
                                                <Badge variant={item.rentalCost ? 'destructive' : 'default'} className="text-xs">
                                                    {item.rentalCost ? 'Rented' : 'Owned'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Equipment Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>Equipment Timeline ({timeFilter})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(groupedEquipment).map(([period, periodEquipment]) => (
                            <div key={period} className="border-l-2 border-indigo-200 pl-4">
                                <h4 className="font-medium text-indigo-600">{period}</h4>
                                <div className="mt-2 space-y-2">
                                    {periodEquipment.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <span>{item.name} ({item.type})</span>
                                            <div className="flex items-center gap-2">
                                                <span>{formatCurrency(item.cost || 0)}</span>
                                                <Badge variant="outline">{item.rentalCost ? 'Rented' : 'Owned'}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// Project Details Modal Component
interface ProjectDetailsModalProps {
    project: Project | undefined
    onClose: () => void
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ project, onClose }) => {
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'materials' | 'labor' | 'equipment'>('overview')
    const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily')

    if (!project) return null

    // Helper function to group data by time periods
    const groupDataByTime = (data: any[], timeFilter: 'daily' | 'weekly' | 'monthly') => {
        const grouped: { [key: string]: any[] } = {}
        
        data.forEach(item => {
            const date = new Date(item.addedAt || item.createdAt || item.workDate || Date.now())
            let key = ''
            
            switch (timeFilter) {
                case 'daily':
                    key = date.toISOString().split('T')[0] // YYYY-MM-DD
                    break
                case 'weekly':
                    const weekStart = new Date(date)
                    weekStart.setDate(date.getDate() - date.getDay())
                    key = `Week of ${weekStart.toISOString().split('T')[0]}`
                    break
                case 'monthly':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    break
            }
            
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(item)
        })
        
        return grouped
    }

    // Calculate totals for different categories
    const materialCost = [
        ...(project.MaterialAvailable || []),
        ...(project.MaterialUsed || [])
    ].reduce((sum, m) => sum + (m.totalCost || m.cost || 0), 0)
    
    const laborCost = (project.Labors || []).reduce((sum: number, l: any) => sum + (l.totalCost || 0), 0)
    const equipmentCost = (project.Equipment || []).reduce((sum: number, e: any) => sum + (e.totalCost || e.cost || 0), 0)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold">
                            {project.name || project.projectName || 'Project Details'}
                        </h2>
                        <p className="text-muted-foreground">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <Tabs value={activeDetailTab} onValueChange={(value: any) => setActiveDetailTab(value)}>
                        <div className="flex items-center justify-between mb-6">
                            <TabsList className="grid w-full grid-cols-4 max-w-md">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="materials">Materials</TabsTrigger>
                                <TabsTrigger value="labor">Labor</TabsTrigger>
                                <TabsTrigger value="equipment">Equipment</TabsTrigger>
                            </TabsList>
                            
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Time Filter:</span>
                                <div className="flex rounded-md border">
                                    {(['daily', 'weekly', 'monthly'] as const).map((filter) => (
                                        <Button
                                            key={filter}
                                            variant={timeFilter === filter ? "default" : "ghost"}
                                            size="sm"
                                            className="rounded-none first:rounded-l-md last:rounded-r-md"
                                            onClick={() => setTimeFilter(filter)}
                                        >
                                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Project Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Package className="h-5 w-5 text-orange-500" />
                                            Materials
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600">
                                            {formatCurrency(materialCost)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {(project.MaterialAvailable?.length || 0)} available, {(project.MaterialUsed?.length || 0)} used
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Users className="h-5 w-5 text-purple-500" />
                                            Labor
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-purple-600">
                                            {formatCurrency(laborCost)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {project.Labors?.length || 0} labor entries
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Wrench className="h-5 w-5 text-indigo-500" />
                                            Equipment
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-indigo-600">
                                            {formatCurrency(equipmentCost)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {project.Equipment?.length || 0} equipment items
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sections Overview */}
                            {project.section && project.section.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Layers className="h-5 w-5" />
                                            Project Sections ({project.section.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {project.section.map((section) => (
                                                <div key={section._id} className="border rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-medium">{section.name}</h4>
                                                        <Badge variant={section.isCompleted ? "default" : "outline"}>
                                                            {section.isCompleted ? "Done" : "Active"}
                                                        </Badge>
                                                    </div>
                                                    {section.miniSections && section.miniSections.length > 0 && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {section.miniSections.length} mini-sections
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="materials" className="space-y-6">
                            <MaterialsDetailView 
                                project={project} 
                                timeFilter={timeFilter}
                                groupDataByTime={groupDataByTime}
                            />
                        </TabsContent>

                        <TabsContent value="labor" className="space-y-6">
                            <LaborDetailView 
                                project={project} 
                                timeFilter={timeFilter}
                                groupDataByTime={groupDataByTime}
                            />
                        </TabsContent>

                        <TabsContent value="equipment" className="space-y-6">
                            <EquipmentDetailView 
                                project={project} 
                                timeFilter={timeFilter}
                                groupDataByTime={groupDataByTime}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}

export default function AnalysisPage() {
    const router = useRouter()
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedProject, setSelectedProject] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("overview")
    const [refreshing, setRefreshing] = useState(false)

    // Handle view details navigation
    const handleViewDetails = (projectId: string) => {
        router.push(`/analysis/project/${projectId}`)
    }

    // Fetch analytics data
    const fetchAnalyticsData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        setRefreshing(true)
        
        try {
            // Get client ID from multiple sources with fallback
            let clientId = localStorage.getItem('clientId') || 
                          sessionStorage.getItem('clientId') ||
                          localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!)?.clientId : null
            
            // If no clientId found, try to get from user data
            if (!clientId) {
                const userData = localStorage.getItem('user')
                if (userData) {
                    const user = JSON.parse(userData)
                    clientId = user.clientId || user._id || user.id
                }
            }
            
            // Use the provided client ID as fallback
            if (!clientId) {
                console.warn('⚠️ No client ID found in storage, using fallback client ID')
                clientId = '695f818566b3d06dfb6083f2'
                // Store it in localStorage for future use
                localStorage.setItem('clientId', clientId)
            }
            
            // Debug logging
            console.log('🔍 Debug Info:', {
                clientId,
                localStorage_clientId: localStorage.getItem('clientId'),
                sessionStorage_clientId: sessionStorage.getItem('clientId'),
                localStorage_user: localStorage.getItem('user'),
                parsedUser: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
            })
            
            console.log('🔍 Fetching analytics data for client:', clientId)
            
            // Use the analytics API endpoint
            console.log('📡 Calling analytics API...')
            const analyticsResponse = await fetch(`/api/analytics?clientId=${clientId}`)
            console.log('📡 Analytics response status:', analyticsResponse.status)
            
            if (!analyticsResponse.ok) {
                console.error('❌ Analytics API failed with status:', analyticsResponse.status)
                const errorText = await analyticsResponse.text()
                console.error('❌ Error response:', errorText)
                throw new Error(`Analytics API failed: ${analyticsResponse.status} - ${errorText}`)
            }
            
            const analyticsData = await analyticsResponse.json()
            console.log('📊 Analytics API Response:', analyticsData)
            console.log('📊 Response keys:', Object.keys(analyticsData))
            console.log('📊 Data payload:', analyticsData.data)
            console.log('📊 Data payload keys:', analyticsData.data ? Object.keys(analyticsData.data) : 'No data payload')
            
            if (!analyticsData.success) {
                throw new Error(analyticsData.message || 'Failed to fetch analytics data')
            }

            // Safely extract data with null checks - data is nested under 'data' property
            const dataPayload = analyticsData.data || {}
            const responseProjects = dataPayload.projects || []
            const responseAnalytics = dataPayload.analytics || {}
            
            console.log(`✅ Loaded analytics for ${responseProjects.length} projects`)
            console.log('📊 Analytics structure:', {
                projects: responseProjects.length,
                analytics: Object.keys(responseAnalytics),
                dataPayload: dataPayload
            })
            
            // Set the analytics data with proper structure
            setAnalyticsData({
                projects: responseProjects,
                totalProjects: responseAnalytics.totalProjects || responseProjects.length,
                completedProjects: responseAnalytics.completedProjects || 0,
                ongoingProjects: responseAnalytics.ongoingProjects || responseProjects.length,
                totalSpent: responseAnalytics.totalSpent || 0,
                totalMaterialCost: responseAnalytics.totalMaterialCost || 0,
                totalLaborCost: responseAnalytics.totalLaborCost || 0,
                totalEquipmentCost: responseAnalytics.totalEquipmentCost || 0,
                materialStats: responseAnalytics.materialStats || {
                    totalAvailable: 0,
                    totalUsed: 0,
                    lowStockItems: 0,
                    categories: {}
                },
                laborStats: responseAnalytics.laborStats || {
                    activeWorkers: 0,
                    totalLaborHours: 0,
                    averageCostPerHour: 0
                },
                equipmentStats: responseAnalytics.equipmentStats || {
                    totalEquipment: 0,
                    activeRentals: 0,
                    totalRentalCost: 0
                }
            })
            
            toast.success('Analytics data refreshed successfully')
        } catch (error) {
            console.error('❌ Error fetching analytics:', error)
            
            // Try fallback approach - fetch projects directly
            console.log('🔄 Trying fallback approach...')
            try {
                const clientId = localStorage.getItem('clientId') || 
                               JSON.parse(localStorage.getItem('user') || '{}').clientId ||
                               '695f818566b3d06dfb6083f2' // Use the provided client ID
                
                const projectsResponse = await fetch(`/api/project?clientId=${clientId}`)
                const projectsData = await projectsResponse.json()
                
                console.log('🔄 Fallback projects response:', projectsData)
                
                if (projectsData.success && projectsData.projects) {
                    // Calculate basic analytics from projects
                    const projects = projectsData.projects || []
                    const basicAnalytics = {
                        projects,
                        totalProjects: projects.length,
                        completedProjects: projects.filter((p: any) => p.isCompleted).length,
                        ongoingProjects: projects.filter((p: any) => !p.isCompleted).length,
                        totalSpent: projects.reduce((sum: number, p: any) => sum + (p.spent || 0), 0),
                        totalMaterialCost: 0,
                        totalLaborCost: 0,
                        totalEquipmentCost: 0,
                        materialStats: {
                            totalAvailable: 0,
                            totalUsed: 0,
                            lowStockItems: 0,
                            categories: {}
                        },
                        laborStats: {
                            activeWorkers: 0,
                            totalLaborHours: 0,
                            averageCostPerHour: 0
                        },
                        equipmentStats: {
                            totalEquipment: 0,
                            activeRentals: 0,
                            totalRentalCost: 0
                        }
                    }
                    
                    setAnalyticsData(basicAnalytics)
                    toast.success('Basic analytics loaded (fallback mode)')
                } else {
                    throw new Error('Fallback also failed: ' + (projectsData.message || 'No projects data'))
                }
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError)
                toast.error(error instanceof Error ? error.message : 'Failed to fetch analytics data')
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    // Calculate comprehensive analytics
    const calculateAnalytics = (projects: Project[]): AnalyticsData => {
        const totalProjects = projects.length
        const completedProjects = projects.filter(p => p.isCompleted).length
        const ongoingProjects = totalProjects - completedProjects
        
        let totalSpent = 0
        let totalMaterialCost = 0
        let totalLaborCost = 0
        let totalEquipmentCost = 0
        
        let totalAvailableMaterials = 0
        let totalUsedMaterials = 0
        let lowStockItems = 0
        const materialCategories: { [key: string]: number } = {}
        
        let activeWorkers = 0
        let totalLaborHours = 0
        let totalLaborCostSum = 0
        
        let totalEquipment = 0
        let activeRentals = 0
        let totalRentalCost = 0

        projects.forEach(project => {
            // Project spending
            totalSpent += project.spent || 0
            
            // Material analysis
            if (project.MaterialAvailable) {
                project.MaterialAvailable.forEach(material => {
                    const cost = material.totalCost || material.cost || 0
                    totalMaterialCost += cost
                    totalAvailableMaterials += material.qnt
                    
                    // Categorize materials
                    const category = getMaterialCategory(material.name)
                    materialCategories[category] = (materialCategories[category] || 0) + material.qnt
                    
                    // Check for low stock (less than 10 units)
                    if (material.qnt < 10) {
                        lowStockItems++
                    }
                })
            }
            
            if (project.MaterialUsed) {
                project.MaterialUsed.forEach(material => {
                    const cost = material.totalCost || material.cost || 0
                    totalMaterialCost += cost
                    totalUsedMaterials += material.qnt
                })
            }
            
            // Labor analysis
            if (project.Labors) {
                project.Labors.forEach(labor => {
                    totalLaborCost += labor.totalCost
                    totalLaborCostSum += labor.totalCost
                    
                    if (labor.status === 'active') {
                        activeWorkers++
                    }
                })
            }
            
            // Equipment analysis
            if (project.Equipment) {
                project.Equipment.forEach(equipment => {
                    totalEquipmentCost += equipment.cost
                    totalEquipment++
                    
                    if (equipment.rentalCost) {
                        activeRentals++
                        totalRentalCost += equipment.rentalCost
                    }
                })
            }
        })

        return {
            projects,
            totalProjects,
            completedProjects,
            ongoingProjects,
            totalSpent,
            totalMaterialCost,
            totalLaborCost,
            totalEquipmentCost,
            materialStats: {
                totalAvailable: totalAvailableMaterials,
                totalUsed: totalUsedMaterials,
                lowStockItems,
                categories: materialCategories
            },
            laborStats: {
                activeWorkers,
                totalLaborHours,
                averageCostPerHour: activeWorkers > 0 ? totalLaborCostSum / activeWorkers : 0
            },
            equipmentStats: {
                totalEquipment,
                activeRentals,
                totalRentalCost
            }
        }
    }

    // Helper function to get detailed material inventory
    const getMaterialInventoryDetails = () => {
        if (!analyticsData) return []
        
        const materialMap = new Map<string, {
            name: string
            available: number
            used: number
            unit: string
            totalValue: number
        }>()

        // Process all projects
        analyticsData.projects.forEach(project => {
            // Process available materials
            project.MaterialAvailable?.forEach(material => {
                const key = `${material.name}-${material.unit}`
                const existing = materialMap.get(key)
                const cost = material.totalCost || material.cost || 0
                
                if (existing) {
                    existing.available += material.qnt
                    existing.totalValue += cost
                } else {
                    materialMap.set(key, {
                        name: material.name,
                        available: material.qnt,
                        used: 0,
                        unit: material.unit,
                        totalValue: cost
                    })
                }
            })

            // Process used materials
            project.MaterialUsed?.forEach(material => {
                const key = `${material.name}-${material.unit}`
                const existing = materialMap.get(key)
                const cost = material.totalCost || material.cost || 0
                
                if (existing) {
                    existing.used += material.qnt
                    existing.totalValue += cost
                } else {
                    materialMap.set(key, {
                        name: material.name,
                        available: 0,
                        used: material.qnt,
                        unit: material.unit,
                        totalValue: cost
                    })
                }
            })
        })

        return Array.from(materialMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    }

    // Load data on component mount
    useEffect(() => {
        fetchAnalyticsData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading analytics data...</p>
                </div>
            </div>
        )
    }

    if (!analyticsData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Failed to load analytics data</p>
                    <div className="space-x-2">
                        <Button onClick={() => fetchAnalyticsData()} className="mb-2">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/analysis/simple'}>
                            View Simple Dashboard
                        </Button>
                    </div>
                    <div className="mt-4 space-x-2">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/analysis/debug'}>
                            Debug Info
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/analysis/test'}>
                            Test Page
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
                    <h1 className="text-3xl font-bold">Project Analysis Dashboard</h1>
                    <p className="text-muted-foreground">
                        Comprehensive insights into your construction projects
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => fetchAnalyticsData(false)}
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
                        <div className="text-2xl font-bold">{analyticsData.totalProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            {analyticsData.completedProjects} completed, {analyticsData.ongoingProjects} ongoing
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analyticsData.totalSpent)}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all projects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Material Stock</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.materialStats.totalAvailable}</div>
                        <p className="text-xs text-muted-foreground">
                            {analyticsData.materialStats.lowStockItems} low stock items
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.laborStats.activeWorkers}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg cost: {formatCurrency(analyticsData.laborStats.averageCostPerHour)}/worker
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analytics Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="materials">Materials</TabsTrigger>
                    <TabsTrigger value="labor">Labor</TabsTrigger>
                    <TabsTrigger value="equipment">Equipment</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Cost Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Cost Breakdown</CardTitle>
                                <CardDescription>Distribution of expenses across categories</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Materials</span>
                                        <span>{formatCurrency(analyticsData.totalMaterialCost)}</span>
                                    </div>
                                    <Progress 
                                        value={(analyticsData.totalMaterialCost / analyticsData.totalSpent) * 100} 
                                        className="h-2"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Labor</span>
                                        <span>{formatCurrency(analyticsData.totalLaborCost)}</span>
                                    </div>
                                    <Progress 
                                        value={(analyticsData.totalLaborCost / analyticsData.totalSpent) * 100} 
                                        className="h-2"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Equipment</span>
                                        <span>{formatCurrency(analyticsData.totalEquipmentCost)}</span>
                                    </div>
                                    <Progress 
                                        value={(analyticsData.totalEquipmentCost / analyticsData.totalSpent) * 100} 
                                        className="h-2"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Project Status</CardTitle>
                                <CardDescription>Current project completion status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>Completed</span>
                                        </div>
                                        <Badge variant="secondary">{analyticsData.completedProjects}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-yellow-500" />
                                            <span>Ongoing</span>
                                        </div>
                                        <Badge variant="secondary">{analyticsData.ongoingProjects}</Badge>
                                    </div>
                                    <Progress 
                                        value={(analyticsData.completedProjects / analyticsData.totalProjects) * 100} 
                                        className="h-2"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        {Math.round((analyticsData.completedProjects / analyticsData.totalProjects) * 100)}% completion rate
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Material Categories</CardTitle>
                                <CardDescription>Distribution by material type</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(analyticsData.materialStats.categories).map(([category, count]) => (
                                        <div key={category} className="flex justify-between items-center">
                                            <span className="text-sm">{category}</span>
                                            <Badge variant="outline">{count} units</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Stock Status</CardTitle>
                                <CardDescription>Current inventory levels</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {analyticsData.materialStats.totalAvailable}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Available</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {analyticsData.materialStats.totalUsed}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Used</p>
                                    </div>
                                </div>
                                {analyticsData.materialStats.lowStockItems > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                        <span className="text-sm text-yellow-800">
                                            {analyticsData.materialStats.lowStockItems} items running low
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Material Stock Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Material Inventory</CardTitle>
                            <CardDescription>Complete breakdown of all materials across projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2">Material</th>
                                            <th className="text-center p-2">Available</th>
                                            <th className="text-center p-2">Used</th>
                                            <th className="text-center p-2">Unit</th>
                                            <th className="text-right p-2">Total Value</th>
                                            <th className="text-center p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getMaterialInventoryDetails().map((material, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        <Box className="h-4 w-4 text-blue-500" />
                                                        <span className="font-medium">{material.name}</span>
                                                    </div>
                                                </td>
                                                <td className="text-center p-2">
                                                    <Badge variant="secondary">{material.available}</Badge>
                                                </td>
                                                <td className="text-center p-2">
                                                    <Badge variant="outline">{material.used}</Badge>
                                                </td>
                                                <td className="text-center p-2 text-sm text-muted-foreground">
                                                    {material.unit}
                                                </td>
                                                <td className="text-right p-2 font-medium">
                                                    {formatCurrency(material.totalValue)}
                                                </td>
                                                <td className="text-center p-2">
                                                    {material.available < 10 ? (
                                                        <Badge variant="destructive" className="text-xs">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Low Stock
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="default" className="text-xs">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            In Stock
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="labor" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Labor Analytics</CardTitle>
                            <CardDescription>Workforce and cost analysis</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {analyticsData.laborStats.activeWorkers}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Active Workers</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600">
                                        {formatCurrency(analyticsData.totalLaborCost)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Total Labor Cost</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-purple-600">
                                        {formatCurrency(analyticsData.laborStats.averageCostPerHour)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Avg Cost/Worker</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="equipment" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Equipment Analytics</CardTitle>
                            <CardDescription>Equipment usage and rental costs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {analyticsData.equipmentStats.totalEquipment}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Total Equipment</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-orange-600">
                                        {analyticsData.equipmentStats.activeRentals}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Active Rentals</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-red-600">
                                        {formatCurrency(analyticsData.equipmentStats.totalRentalCost)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Rental Costs</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="projects" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Projects Overview</CardTitle>
                            <CardDescription>Manage and analyze your construction projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {analyticsData.projects.map((project) => (
                                    <ProjectCard 
                                        key={project._id} 
                                        project={project}
                                        onViewDetails={handleViewDetails}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}