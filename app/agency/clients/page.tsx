"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Phone, MapPin, Calendar, Building2, Plus, MoreVertical, Pencil, Trash2, Check, Copy } from "lucide-react"
import { ClientFormProps } from "../(forms)/client-form/types"
import axios from "axios"
import domain from "@/components/utils/domain"
import TopHeader from "@/components/TopHeader"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { successToast } from "@/components/toasts"

function formatDate(dateString: string) {
    if (!dateString) return "Unknown"
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

function getInitials(name: string) {
    if (!name) return "N/A"
    return name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

const Page = () => {
    const router = useRouter();
    const [clientData, setClientData] = useState<ClientFormProps[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [update, setUpdate] = useState<number>(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                setError(null)
                const res = await axios.get(`${domain}/api/client`)
                const data = res.data.clientData
                console.log(data);
                setClientData(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error("Error fetching client data:", error)
                setError("Failed to fetch client data")
                setClientData([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [update])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-slate-600">Loading clients...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-red-600">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    const copyToClipboard = (text: string, clientId: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(clientId)
            alert("Client ID copied to clipboard!")

            // Reset the copied state after 2 seconds
            setTimeout(() => {
                setCopiedId(null)
            }, 2000)
        })
    }

    const deleteClient = async (clientId: string) => {
        try {
            await axios.delete(`${domain}/api/client?id=${clientId}`)
            successToast("Client deleted successfully");
            setUpdate(update + 1);
        } catch (error) {
            console.error("Error deleting client:", error)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <TopHeader title="Clients" buttonText="Add Client" tagTitle="Our Featured Clients" TagIcon={Plus} link="/super-admin/client-form" />
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
                                            <p className="text-sm text-slate-500 mt-1">Client ID: {client._id || ""}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {client.logo && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Building2 className="w-3 h-3 mr-1" />
                                                Business
                                            </Badge>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => {
                                                    router.push(`/super-admin/client-form?id=${client._id}`)
                                                }} className="cursor-pointer">
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    <span>Edit Details</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    const confirmDelete = window.confirm("Are you sure you want to delete this client?")
                                                    if (confirmDelete) {
                                                        deleteClient(client._id || "")
                                                    }
                                                }} className="cursor-pointer text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onClick={() => copyToClipboard(client._id || "", client._id || "")}
                                                >
                                                    {copiedId === client._id ? (
                                                        <>
                                                            <Check className="mr-2 h-4 w-4 text-green-600" />
                                                            <span>Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            <span>Copy Client ID</span>
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
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
                                        <span>Joined {formatDate(client.createdAt || "")}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {client.agency ? `Agency : ${client.agency}` : ""}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

            </div>
        </div>
    )
}

export default Page