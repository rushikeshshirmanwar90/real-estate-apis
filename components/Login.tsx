"use client"
import React, { useState } from "react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { handleLogin } from "@/functions/login";


const Login: React.FC = () => {
    // TODO : Change the way of sending data
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleLogin(email, password);
    }

    return (
        <div className="mt-10 w-[30rem]  m-auto" >
            <div className={"flex flex-col gap-6"}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Login</CardTitle>
                        <CardDescription>
                            Login to your admin page to mange your business online
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} >
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        required
                                        onChange={(e) => setEmail(e.target.value)}
                                        value={email}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password">Password</Label>
                                        <Link
                                            href="#"
                                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>
                                    <Input id="password" type="password" required onChange={(e) => setPassword(e.target.value)} value={password} />
                                </div>
                                <Button type="submit" className="w-full">
                                    Login
                                </Button>
                            </div>
                            <div className="mt-4 text-center text-sm">
                                Don&apos;t have an account?{" "}
                                <a href="#" className="underline underline-offset-4">
                                    Contact us now
                                </a>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}

export default Login;