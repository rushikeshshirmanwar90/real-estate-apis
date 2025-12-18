"use client"

import React, { useState } from "react";
import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { Search, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { PropertyItem } from "../types/customer";
import ContactsDialog from "@/components/ContactDialog";
import { CustomerData } from "./add-customer-dialog";

const CustomerTable: React.FC<{ customers: CustomerData[], loading: boolean, deleteCustomer: (id: string) => void }> = ({ customers, loading, deleteCustomer }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
    const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false);

    const columns: ColumnDef<CustomerData>[] = [
        {
            accessorKey: "srNumber",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Sr. No.
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-center">{row.getValue("srNumber")}</div>,
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "email",
            header: "Email",
        },
        {
            accessorKey: "phone",
            header: "Phone",
        },
        {
            accessorKey: "properties",
            header: "Property",
            cell: ({ row }) => {
                const properties = row.original.properties;
                return properties && properties.length > 0 ? (
                    <Dialog open={isPropertyDialogOpen} onOpenChange={setIsPropertyDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="link"
                                onClick={() => {
                                    // Set the first property as selected by default
                                    setSelectedProperty(properties[0]);
                                }}
                            >
                                {properties.length === 1 ? properties[0].projectName : `${properties.length} Properties`}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Property Details</DialogTitle>
                            </DialogHeader>
                            {properties.length > 1 && (
                                <div className="mb-4">
                                    <select
                                        className="w-full p-2 border rounded"
                                        value={selectedProperty?.id || ""}
                                        onChange={(e) => {
                                            const selected = properties.find(p => p.id === e.target.value);
                                            if (selected) setSelectedProperty(selected);
                                        }}
                                    >
                                        {properties.map(prop => (
                                            <option key={prop.id} value={prop.id}>
                                                {prop.projectName} - {prop.sectionName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {selectedProperty && (
                                <div className="space-y-2">
                                    <p><strong>Project Name:</strong> {selectedProperty.projectName}</p>
                                    <p><strong>Section Name:</strong> {selectedProperty.sectionName}</p>
                                    <p><strong>Section Type:</strong> {selectedProperty.sectionType}</p>
                                    {selectedProperty.flatName && (
                                        <p><strong>Flat Name:</strong> {selectedProperty.flatName}</p>
                                    )}
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                ) : (
                    <span className="text-gray-500">No properties</span>
                );
            },
        },
        {
            accessorKey: "contacts",
            header: "Contacts",
            cell: ({ row }) => {
                const customer = row.original;
                return (
                    <ContactsDialog clientId={customer.id || ""} />
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const customer = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(customer.id || "")}>Copy customer ID</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit customer</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteCustomer(customer.id || "")}>Delete customer</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: customers,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    });

    return (
        <div>
            <div className="flex items-center py-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Loading data...
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No customers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

export default CustomerTable;