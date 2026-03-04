"use client"

import React from 'react'

export default function AnalysisTestPage() {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Analysis Dashboard Test</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Total Projects</h3>
                    <p className="text-3xl font-bold text-blue-600">12</p>
                    <p className="text-sm text-gray-500">8 completed, 4 ongoing</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Total Spent</h3>
                    <p className="text-3xl font-bold text-green-600">₹2,45,000</p>
                    <p className="text-sm text-gray-500">Across all projects</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Material Stock</h3>
                    <p className="text-3xl font-bold text-orange-600">1,250</p>
                    <p className="text-sm text-gray-500">5 low stock items</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Active Workers</h3>
                    <p className="text-3xl font-bold text-purple-600">25</p>
                    <p className="text-sm text-gray-500">Avg cost: ₹500/day</p>
                </div>
            </div>
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Quick Test</h2>
                <p>If you can see this page, the analysis route is working correctly!</p>
                <p className="mt-2 text-sm text-gray-600">
                    The full analytics dashboard is available at <code>/analysis</code>
                </p>
            </div>
        </div>
    )
}