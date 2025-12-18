import { EmailTemplate } from "@/components/mail/EmailTemplate";
import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { render } from '@react-email/components';
import { transporter } from "@/lib/transporter";

const generateOTP = (): number => {
    return Math.floor(100000 + Math.random() * 900000); // Ensures a 6-digit OTP
};

export const POST = async (req: NextRequest | Request) => {
    try {
        await connect();

        // Parse request body safely
        const body = await req.json();
        if (!body.email) {
            return NextResponse.json(
                { message: "Email is required." },
                { status: 400 }
            );
        }

        const { email, OTP: customOTP } = body;

        // ✅ FIX: Use custom OTP if provided, otherwise generate one
        const OTP = customOTP || generateOTP();

        console.log('📧 Sending OTP email...');
        console.log('   Email:', email);
        console.log('   OTP:', OTP);
        console.log('   Custom OTP provided:', !!customOTP);

        const emailHtml = await render(EmailTemplate({ verificationCode: OTP }));

        const info = await transporter.sendMail({
            from: `"Exponentor" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your Email Verification Code",
            html: emailHtml
        });

        console.log('✅ OTP email sent successfully');
        console.log('   Message ID:', info.messageId);

        return NextResponse.json(
            {
                message: "Email sent successfully!",
                otp: OTP,
                messageId: info.messageId,
            },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error("❌ Email sending error:", error);
        return NextResponse.json(
            { message: "Failed to send email.", error: error },
            { status: 500 }
        );
    }
};
