export interface NumericBaseline {
  count: number
  average: number
  median: number
  min: number
  max: number
  trend: 'decreasing' | 'stable' | 'increasing'
  percentChange?: number
}

export const confidenceFromSample = (sampleSize: number): 'insufficient' | 'low' | 'medium' | 'high' => {
  if (sampleSize < 10) return 'insufficient'
  if (sampleSize < 20) return 'low'
  if (sampleSize < 40) return 'medium'
  return 'high'
}

export const median = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export const numericBaseline = (values: number[]): NumericBaseline => {
  if (values.length === 0) {
    return { count: 0, average: 0, median: 0, min: 0, max: 0, trend: 'stable' }
  }
  const average = values.reduce((total, value) => total + value, 0) / values.length
  const firstHalf = values.slice(0, Math.max(1, Math.floor(values.length / 2)))
  const secondHalf = values.slice(Math.floor(values.length / 2))
  const firstAverage = firstHalf.reduce((total, value) => total + value, 0) / firstHalf.length
  const secondAverage = secondHalf.reduce((total, value) => total + value, 0) / secondHalf.length
  const difference = secondAverage - firstAverage
  const threshold = Math.max(1, Math.abs(firstAverage) * 0.1)
  const trend = difference > threshold ? 'increasing' : difference < -threshold ? 'decreasing' : 'stable'
  const percentChange = firstAverage !== 0 ? Number(((difference / Math.abs(firstAverage)) * 100).toFixed(1)) : undefined

  return {
    count: values.length,
    average: Number(average.toFixed(2)),
    median: Number(median(values).toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values),
    trend,
    percentChange,
  }
}
