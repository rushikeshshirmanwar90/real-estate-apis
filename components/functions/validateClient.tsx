import { cookies } from "next/headers";
import { Client } from "@/lib/models/super-admin/Client";
import jwt from "jsonwebtoken"

interface cookieDataProps {
    email: string;
    userId: string;
}

export const validateClient = async () => {
    const cookieStore = await cookies();
    const getCookie = cookieStore.get("client_auth_token")

    if (!getCookie) {
        return false;
    }

    const decodedToken = jwt.decode(String(getCookie.value)) as cookieDataProps;

    const userId = decodedToken.userId;

    const isValidClient = await Client.findById(userId);

    if (!isValidClient) {
        return false;
    }

    return true
}