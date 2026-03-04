import React from 'react'

interface MaterialSpecificationsProps {
    specs: any
    variant?: 'available' | 'used'
}

const MaterialSpecifications: React.FC<MaterialSpecificationsProps> = ({ 
    specs, 
    variant = 'available' 
}) => {
    const colorClasses = {
        available: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-900',
            label: 'text-green-700'
        },
        used: {
            bg: 'bg-blue-50',
            border: 'border-blue-200', 
            text: 'text-blue-900',
            label: 'text-blue-700'
        }
    }

    const colors = colorClasses[variant]

    if (!specs) {
        return (
            <div className="bg-gray-100 p-3 rounded-lg border border-dashed border-gray-300">
                <span className="text-gray-500 italic text-sm">No specifications available</span>
            </div>
        )
    }

    if (typeof specs === 'string') {
        return (
            <div className={`${colors.bg} p-3 rounded-lg border ${colors.border} shadow-sm`}>
                <span className={`${colors.text} font-medium text-sm`}>{specs}</span>
            </div>
        )
    }

    return (
        <div className={`${colors.bg} p-3 rounded-lg border ${colors.border} shadow-sm space-y-2`}>
            {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-1">
                    <span className={`font-semibold ${colors.label} text-sm uppercase tracking-wide`}>
                        {key}:
                    </span>
                    <span className={`${colors.text} font-medium ml-3 text-sm bg-white px-2 py-1 rounded shadow-sm`}>
                        {String(value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default MaterialSpecifications