"use client"

import { useEffect, useState } from "react";
import Cookies from 'js-cookie';
import jwt from 'jsonwebtoken';


interface DecodedToken {
    userId: string;
    exp: number;
    iat: number;
    email: string;
}

// Custom hook for client authentication
export function useClientAuth() {
    const [clientId, setClientId] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // Try to get the token from cookies
        const token = Cookies.get('client_auth_token');

        if (!token) {
            setAuthError('No authentication token found');
            setAuthLoading(false);
            return;
        }

        try {
            // Decode the token
            const decoded = jwt.decode(token) as DecodedToken;

            if (!decoded || !decoded.userId) {
                setAuthError('Invalid authentication token');
                setAuthLoading(false);
                return;
            }

            // Check token expiration
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                setAuthError('Authentication token expired');
                setAuthLoading(false);
                return;
            }

            // Set the client ID
            setClientId(decoded.userId);
            setAuthLoading(false);
        } catch (err) {
            console.error('Error decoding authentication token:', err);
            setAuthError('Authentication error');
            setAuthLoading(false);
        }
    }, []);

    return { clientId, authLoading, authError };
}