import React from 'react'

interface ChartData {
    name: string
    value: number
    color?: string
}

interface BarChartProps {
    data: ChartData[]
    height?: number
    showValues?: boolean
    formatValue?: (value: number) => string
}

const BarChart: React.FC<BarChartProps> = ({ 
    data, 
    height = 300, 
    showValues = true,
    formatValue = (value) => value.toLocaleString()
}) => {
    if (!data || data.length === 0) {
        return (
            <div className="w-full flex items-center justify-center" style={{ height }}>
                <p className="text-muted-foreground">No data available</p>
            </div>
        )
    }

    const maxValue = Math.max(...data.map(d => d.value))
    const chartHeight = height - 100 // Reserve space for labels and values
    const colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#65a30d']
    
    return (
        <div className="w-full bg-white" style={{ height }}>
            {/* Chart area */}
            <div className="flex items-end justify-center gap-2 px-4 pt-4" style={{ height: chartHeight }}>
                {data.map((item, index) => {
                    const barHeight = maxValue > 0 ? Math.max((item.value / maxValue) * (chartHeight - 60), 8) : 8
                    const barColor = item.color || colors[index % colors.length]
                    
                    return (
                        <div key={index} className="flex flex-col items-center flex-1 max-w-20">
                            {/* Value label on top */}
                            {showValues && (
                                <div className="text-xs font-bold mb-2 text-gray-900 text-center bg-white px-2 py-1 rounded shadow-sm border">
                                    {formatValue(item.value)}
                                </div>
                            )}
                            
                            {/* Bar */}
                            <div 
                                className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer shadow-sm border border-gray-200"
                                style={{ 
                                    height: `${barHeight}px`,
                                    backgroundColor: barColor,
                                    minHeight: '8px',
                                    maxWidth: '60px'
                                }}
                                title={`${item.name}: ${formatValue(item.value)}`}
                            />
                        </div>
                    )
                })}
            </div>
            
            {/* Labels at bottom */}
            <div className="flex justify-center gap-2 px-4 pt-3 pb-2">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 max-w-20">
                        <div className="text-xs text-center font-medium text-gray-600 break-words leading-tight">
                            {item.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default BarChart