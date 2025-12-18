"use client"

import React, { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Search, UserCircle, ChevronDown, ChevronUp, Users, Calendar, Phone, Mail, AlertCircle } from "lucide-react"
import axios from "axios"
import domain from "./utils/domain"

// Contact interface
interface Contact {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
    updatedAt: string;
}
// Contact interface
interface Contact2 {
    id: string;
    _id: string
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
    updatedAt: string;
}

const ContactsDialog: React.FC<{ clientId: string }> = ({ clientId }) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const itemsPerPage = 20

    // Fetch contacts when dialog opens or clientId changes
    useEffect(() => {
        if (isOpen && clientId) {
            fetchContacts();
        }
    }, [clientId, isOpen]);

    const fetchContacts = async () => {
        if (!clientId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${domain}/api/contacts?userId=${clientId}`);

            if (response.status === 200 && response.data && response.data.data) {
                // Transform the data to match our interface if needed
                const contactData = response.data.data.map((contact: Contact2) => ({
                    _id: contact._id || contact.id,
                    firstName: contact.firstName || '',
                    lastName: contact.lastName || '',
                    email: contact.email || '',
                    phoneNumber: contact.phoneNumber || '',
                    createdAt: contact.createdAt || new Date().toISOString(),
                    updatedAt: contact.updatedAt || new Date().toISOString(),
                }));

                setContacts(contactData);
            } else {
                setContacts([]);
                setError("No contacts found");
            }
        } catch (err: unknown) {
            console.error("Error fetching contacts:", err);
            setError("Failed to fetch contacts");
            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    // Toggle sort
    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    // Sort and filter contacts
    const sortAndFilterContacts = () => {
        let filtered = contacts.filter(
            (contact) =>
                contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.phoneNumber.includes(searchTerm),
        )

        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                const fieldA = a[sortField as keyof typeof a]
                const fieldB = b[sortField as keyof typeof b]

                if (typeof fieldA === "string" && typeof fieldB === "string") {
                    return sortDirection === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA)
                }

                return 0
            })
        }

        return filtered
    }

    const filteredContacts = sortAndFilterContacts()

    // Calculate pagination
    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedContacts = filteredContacts.slice(startIndex, startIndex + itemsPerPage)

    // Format date to a more readable format
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    // Get initials for avatar
    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }

    // Sort indicator component
    const SortIndicator = ({ field }: { field: string }) => {
        if (sortField !== field) return null

        return sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
    }

    // Reset filters when dialog opens
    const handleDialogOpen = (open: boolean) => {
        setIsOpen(open)
        if (open) {
            setSearchTerm("")
            setCurrentPage(1)
            setSortField(null)
            setSortDirection("asc")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Users className="h-4 w-4" />
                    Contacts
                    <Badge variant="secondary" className="ml-1">
                        {contacts.length || 0}
                    </Badge>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Customer Contacts
                        <Badge variant="outline" className="ml-2">
                            {filteredContacts.length} contacts
                        </Badge>
                    </DialogTitle>
                    <div className="relative w-full mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search contacts..."
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1) // Reset to first page on search
                            }}
                        />
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 -mx-6 px-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
                            <AlertCircle className="h-12 w-12 mb-4 text-destructive/70" />
                            <p className="text-center">{error}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-muted/50">
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => toggleSort("firstName")}>
                                            <div className="flex items-center">
                                                First Name
                                                <SortIndicator field="firstName" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => toggleSort("lastName")}>
                                            <div className="flex items-center">
                                                Last Name
                                                <SortIndicator field="lastName" />
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                Email
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-4 w-4" />
                                                Phone
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                Created
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedContacts.length > 0 ? (
                                        paginatedContacts.map((contact) => (
                                            <TableRow key={contact._id} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        {getInitials(contact.firstName, contact.lastName)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">{contact.firstName}</TableCell>
                                                <TableCell>{contact.lastName}</TableCell>
                                                <TableCell>
                                                    {contact.email ? (
                                                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                                                            {contact.email}
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground">Not provided</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {contact.phoneNumber ? (
                                                        <a href={`tel:${contact.phoneNumber.replace(/[^\d]/g, "")}`} className="hover:underline">
                                                            {contact.phoneNumber}
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground">Not provided</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(contact.createdAt)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                    <UserCircle className="h-10 w-10 mb-2" />
                                                    <p>No contacts found matching your search.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 pt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                        <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredContacts.length)}</span> of{" "}
                        <span className="font-medium">{filteredContacts.length}</span> contacts
                    </div>

                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>

                                {Array.from({ length: totalPages }).map((_, index) => {
                                    // Show limited page numbers for better UX
                                    if (
                                        totalPages <= 20 ||
                                        index === 0 ||
                                        index === totalPages - 1 ||
                                        (index >= currentPage - 2 && index <= currentPage)
                                    ) {
                                        return (
                                            <PaginationItem key={index}>
                                                <PaginationLink onClick={() => setCurrentPage(index + 1)} isActive={currentPage === index + 1}>
                                                    {index + 1}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    } else if (
                                        (index === 1 && currentPage > 3) ||
                                        (index === totalPages - 2 && currentPage < totalPages - 2)
                                    ) {
                                        return (
                                            <PaginationItem key={index}>
                                                <PaginationLink className="cursor-default">...</PaginationLink>
                                            </PaginationItem>
                                        )
                                    }
                                    return null
                                })}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ContactsDialog;