import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Phone, MapPin, Calendar, Building2 } from "lucide-react"

const clientData = [
    {
        _id: "67d6d72a52f8dc7d3ae22917",
        name: "rushi",
        email: "rushi@gmail.com",
        phoneNumber: 9370789436,
        password: "$2b$10$ueQonNjF/rWo1nhQV.70SOh1vs3ZoXe4SIfcsk46g9pFPOaRXIIkq",
        state: "Maharashtra",
        city: "nanded",
        area: "shrinager",
        address: "shrinager Naded",
        createdAt: "2025-03-16T13:50:34.526Z",
        updatedAt: "2025-03-16T13:50:34.526Z",
        __v: 0,
    },
    {
        _id: "683f3e555345f6c782609edd",
        name: "Shree Developers",
        phoneNumber: 9876543210,
        email: "contact@shreedevelopers.com",
        city: "Pune",
        state: "Maharashtra",
        address: "Office No. 101, Business Tower, Baner, Pune",
        logo: "https://example.com/uploads/shree-logo.png",
        createdAt: "2025-06-03T18:26:29.077Z",
        updatedAt: "2025-06-03T18:26:29.077Z",
        __v: 0,
    },
    {
        _id: "6841e8972f20c5340659d444",
        name: "Rushikekhs Shrimanwar",
        phoneNumber: 9579896842,
        email: "rushikeshshrimanwar@gmail.com",
        city: "Nanded-Waghala",
        state: "Maharashtra",
        address: "Shrinager nanded 1-10-113 Guru Gobind Singh Ji Road Kohinor City Kailash Nagar",
        logo: "https://res.cloudinary.com/dlcq8i2sc/image/upload/v1749149851/ddb0a3jotgm3je1sxeym.png",
        createdAt: "2025-06-05T18:57:27.303Z",
        updatedAt: "2025-06-05T18:57:27.303Z",
        __v: 0,
    },
]

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

function getInitials(name: string) {
    return name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

export default function ClientDashboard() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Client Dashboard</h1>
                    <p className="text-slate-600 text-lg">Manage and view your client information</p>
                    <div className="flex items-center gap-4 mt-4">
                        <Badge variant="secondary" className="text-sm">
                            {clientData.length} Total Clients
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                            Active Directory
                        </Badge>
                    </div>
                </div>

                {/* Client Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clientData.map((client) => (
                        <Card
                            key={client._id}
                            className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm"
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12 ring-2 ring-slate-200">
                                            <AvatarImage src={client.logo || "/placeholder.svg"} alt={client.name} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                                {getInitials(client.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg font-semibold text-slate-900 capitalize">{client.name}</CardTitle>
                                            <p className="text-sm text-slate-500 mt-1">Client ID: {client._id.slice(-6)}</p>
                                        </div>
                                    </div>
                                    {client.logo && (
                                        <Badge variant="secondary" className="text-xs">
                                            <Building2 className="w-3 h-3 mr-1" />
                                            Business
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Contact Information */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                        <span className="text-slate-700 truncate">{client.email}</span>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                        <span className="text-slate-700">+91 {client.phoneNumber}</span>
                                    </div>

                                    <div className="flex items-start gap-3 text-sm">
                                        <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-slate-700">
                                            <p className="font-medium capitalize">
                                                {client.city}, {client.state}
                                            </p>
                                            {client.area && <p className="text-slate-500 capitalize">{client.area}</p>}
                                            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{client.address}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-200"></div>

                                {/* Metadata */}
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Joined {formatDate(client.createdAt)}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        Active
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Summary Stats */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm">Total Clients</p>
                                    <p className="text-3xl font-bold">{clientData.length}</p>
                                </div>
                                <Building2 className="w-8 h-8 text-blue-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm">Active Clients</p>
                                    <p className="text-3xl font-bold">{clientData.length}</p>
                                </div>
                                <Mail className="w-8 h-8 text-green-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm">Maharashtra</p>
                                    <p className="text-3xl font-bold">100%</p>
                                </div>
                                <MapPin className="w-8 h-8 text-purple-200" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
