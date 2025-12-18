"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    ChevronDown,
    Home,
    LayoutDashboard,
    LogOut,
    Settings,
    UserCircle2,
    Receipt,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"

export function AdminSidebar() {
    const pathname = usePathname()

    const navigation = [
        { name: "Dashboard", href: "/agency", icon: LayoutDashboard },
        { name: "Client", href: "/super-admin/clients", icon: Receipt },
    ]

    return (
        <Sidebar variant="floating" className="border-r border-border">
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                        <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Avatar" />
                        <AvatarFallback className="bg-primary text-primary-foreground">RS</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-semibold">Rushikesh Shrimanwar</span>
                        <span className="text-xs text-muted-foreground">Agency</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">Profile menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <UserCircle2 className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigation.map((item) => (
                                <SidebarMenuItem key={item.name}>
                                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name}>
                                        <Link href={item.href}>
                                            <item.icon className="h-5 w-5" />
                                            <span>{item.name}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4">
                <Button variant="outline" className="w-full justify-start">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                </Button>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

