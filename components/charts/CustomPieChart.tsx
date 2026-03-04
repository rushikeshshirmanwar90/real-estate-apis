import React from 'react'

interface ChartData {
    name: string
    value: number
    color?: string
}

interface PieChartProps {
    data: ChartData[]
    size?: number
    showLegend?: boolean
    formatValue?: (value: number) => string
}

const PieChart: React.FC<PieChartProps> = ({ 
    data, 
    size = 200, 
    showLegend = true,
    formatValue = (value) => value.toLocaleString()
}) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <p className="text-muted-foreground text-sm">No data available</p>
            </div>
        )
    }

    const total = data.reduce((sum, item) => sum + item.value, 0)
    let currentAngle = 0
    
    const colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#65a30d']
    
    return (
        <div className={`flex items-center ${showLegend ? 'gap-6' : 'justify-center'}`}>
            {/* Pie Chart */}
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    {data.map((item, index) => {
                        if (item.value === 0) return null
                        
                        const percentage = (item.value / total) * 100
                        const angle = (item.value / total) * 360
                        const radius = size / 2 - 10
                        const centerX = size / 2
                        const centerY = size / 2
                        
                        const startAngle = (currentAngle * Math.PI) / 180
                        const endAngle = ((currentAngle + angle) * Math.PI) / 180
                        
                        const x1 = centerX + radius * Math.cos(startAngle)
                        const y1 = centerY + radius * Math.sin(startAngle)
                        const x2 = centerX + radius * Math.cos(endAngle)
                        const y2 = centerY + radius * Math.sin(endAngle)
                        
                        const largeArcFlag = angle > 180 ? 1 : 0
                        
                        const pathData = [
                            `M ${centerX} ${centerY}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            'Z'
                        ].join(' ')
                        
                        currentAngle += angle
                        
                        return (
                            <path
                                key={index}
                                d={pathData}
                                fill={item.color || colors[index % colors.length]}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                stroke="white"
                                strokeWidth="2"
                            />
                        )
                    })}
                    
                    {/* White circle background for center text */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={size / 8}
                        fill="white"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                    />
                </svg>
                
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                            {formatValue(total)}
                        </div>
                        <div className="text-xs text-gray-700 font-medium">Total</div>
                    </div>
                </div>
            </div>
            
            {/* Legend */}
            {showLegend && (
                <div className="space-y-2">
                    {data.map((item, index) => {
                        const percentage = total > 0 ? (item.value / total) * 100 : 0
                        return (
                            <div key={index} className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: item.color || colors[index % colors.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-700 truncate">
                                        {item.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatValue(item.value)} ({percentage.toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default PieChart