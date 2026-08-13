export type InsightArea = 'general' | 'sleep' | 'energy' | 'mood' | 'activity' | 'food' | 'work' | 'study' | 'finance' | 'recreation'
export type InsightPriority = 'low' | 'medium' | 'high'
export type InsightConfidence = 'insufficient' | 'low' | 'medium' | 'high'

export interface PersonalInsight {
  id: string
  area: InsightArea
  title: string
  message: string
  evidence: string[]
  action?: string
  priority: InsightPriority
  confidence: InsightConfidence
  sampleSize?: number
  generatedAt: string
}

export interface DailyEvaluation {
  title: string
  message: string
  mainAction: string
  evidence: string[]
  insights: PersonalInsight[]
}
