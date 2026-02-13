import { ResponsiveContainer, AreaChart, Area } from "recharts"

interface SparklineProps {
    data: number[]
    color?: string
}

export function Sparkline({ data, color = "hsl(var(--primary))" }: SparklineProps) {
    const chartData = data.map((value, index) => ({ value, index }))

    return (
        <div className="h-[40px] w-[120px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        fill={color}
                        fillOpacity={0.2}
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
