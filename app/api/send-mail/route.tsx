import { EmailTemplate } from "@/components/mail/PropertyMail";
import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { render } from '@react-email/components';
import { transporter } from "@/lib/transporter";


export const POST = async (req: NextRequest | Request) => {
    try {
        await connect();

        const body = await req.json();
        if (!body.email) {
            return NextResponse.json(
                { message: "Email is required." },
                { status: 400 }
            );
        }

        const { email } = body;

        const emailHtml = await render(<EmailTemplate details={body.details} />);

        const info = await transporter.sendMail({
            from: `"Rushikesh Shrimanwar"`,
            to: email,
            subject: "Your Email Verification Code",
            html: emailHtml
        });

        return NextResponse.json(
            {
                message: "Email sent successfully!",
                info,
            },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error("Email sending error:", error);
        return NextResponse.json(
            { message: "Failed to send email.", error: error },
            { status: 500 }
        );
    }
};
