"use client"

import dynamic from 'next/dynamic'

// Dynamically import the client component with no SSR
const ClientSetupPage = dynamic(() => import('./ClientSetupPage'), {
    ssr: false,
    loading: () => (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="animate-pulse">
                <div className="bg-gray-200 h-8 w-48 rounded mb-4"></div>
                <div className="bg-gray-200 h-32 w-full rounded"></div>
            </div>
        </div>
    )
})

export default function AnalysisSetupPage() {
    return <ClientSetupPage />
}