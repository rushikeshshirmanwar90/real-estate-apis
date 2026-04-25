"use client"
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getClientId, getUserData } from '@/functions/clientId';
import { useRouter } from 'next/navigation';

export default function DebugAuthPage() {
    const [userData, setUserData] = useState<any>(null);
    const [clientId, setClientId] = useState<string | null>(null);
    const [rawUserData, setRawUserData] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        loadAuthData();
    }, []);

    const loadAuthData = () => {
        const user = getUserData();
        const id = getClientId();
        const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

        setUserData(user);
        setClientId(id);
        setRawUserData(raw || 'No data found');
    };

    const clearAuth = () => {
        if (typeof window !== 'undefined') {
            localStorage.clear();
            loadAuthData();
        }
    };

    return (
        <div className="container mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Authentication Debug</CardTitle>
                    <CardDescription>
                        View and debug authentication data stored in localStorage
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Client ID */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Client ID</h3>
                        <div className="bg-gray-100 p-4 rounded-md">
                            <code className="text-sm">
                                {clientId || 'No clientId found'}
                            </code>
                        </div>
                    </div>

                    {/* User Data (Parsed) */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">User Data (Parsed)</h3>
                        <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                            <pre className="text-xs">
                                {userData ? JSON.stringify(userData, null, 2) : 'No user data found'}
                            </pre>
                        </div>
                    </div>

                    {/* Raw User Data */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Raw User Data (localStorage)</h3>
                        <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                            <pre className="text-xs">
                                {rawUserData}
                            </pre>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button onClick={loadAuthData} variant="outline">
                            Refresh Data
                        </Button>
                        <Button onClick={clearAuth} variant="destructive">
                            Clear Auth Data
                        </Button>
                        <Button onClick={() => router.push('/login')} variant="default">
                            Go to Login
                        </Button>
                    </div>

                    {/* Instructions */}
                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                            <li>Check if clientId is displayed correctly</li>
                            <li>For client users: clientId should equal _id</li>
                            <li>For staff/admin: clientId should be different from _id</li>
                            <li>If clientId is missing, click "Clear Auth Data" and login again</li>
                            <li>Check browser console for detailed logs</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
