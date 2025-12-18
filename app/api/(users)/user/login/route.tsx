import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import bcrypt from "bcrypt";

import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest | Request) => {
    try {
        await connect();
        const { email, password } = await req.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json({
                message: "Email and password are required"
            }, { status: 400 })  // Changed to 400 Bad Request
        }

        // Find user
        const user = await Customer.findOne({ email });

        if (!user) {
            return NextResponse.json({
                message: "User not found"
            }, { status: 404 })
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json({
                message: "Invalid password"
            }, {
                status: 403
            })
        }

        if (password != user.password) {
            return NextResponse.json({
                message: "Invalid password"
            }, {
                status: 403
            })
        }

        // Success response - you might want to add more user data or a token here
        return NextResponse.json({
            message: "User logged in successfully",
            user: {
                id: user._id,
                email: user.email,
                // Add any other user properties you want to return
            }
        }, { status: 200 })

    } catch (error: unknown) {
        // Error handling
        console.error("Login error:", error);

        return NextResponse.json({
            message: "An error occurred during login",
            error: error || "Internal server error"
        }, {
            status: 500
        });
    }
}