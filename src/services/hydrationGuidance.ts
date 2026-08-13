import type { AppSettings } from '../types/domain'
import { getProfileSummary } from './personalInsights'

export interface HydrationConditions {
  trainingMinutes?: number
  highHeat?: boolean
  intenseSweat?: boolean
  caffeineOrAlcohol?: boolean
}

export interface HydrationGuidance {
  status: 'missing-profile' | 'reference'
  referenceMl?: number
  rangeMinMl?: number
  rangeMaxMl?: number
  glassCount?: number
  message: string
  evidence: string[]
}

const mlPerGlass = 250
const lbToKg = 0.45359237

const roundToNearest = (value: number, step: number): number => Math.round(value / step) * step

export const calculateHydrationGuidance = (settings: AppSettings, conditions: HydrationConditions = {}): HydrationGuidance => {
  const profile = getProfileSummary(settings)

  if (!profile.weightLb || !profile.heightCm || !profile.age) {
    return {
      status: 'missing-profile',
      message: 'Agrega peso, altura y fecha de nacimiento para calcular una referencia diaria de agua con tu perfil.',
      evidence: ['Faltan datos corporales completos.'],
    }
  }

  const weightKg = profile.weightLb * lbToKg
  const baselineMin = weightKg * 25
  const baselineMax = weightKg * 35
  let adjustment = 0
  const evidence = [`Perfil: ${profile.age} anos, ${profile.heightCm} cm, ${profile.weightLb} lb.`]

  if ((conditions.trainingMinutes ?? 0) >= 30) {
    adjustment += 350
    evidence.push(`Entrenamiento registrado: ${conditions.trainingMinutes} min.`)
  }
  if (conditions.highHeat) {
    adjustment += 300
    evidence.push('Condicion marcada: calor alto.')
  }
  if (conditions.intenseSweat) {
    adjustment += 300
    evidence.push('Condicion marcada: sudoracion intensa.')
  }
  if (conditions.caffeineOrAlcohol) {
    adjustment += 250
    evidence.push('Condicion marcada: cafeina o alcohol.')
  }

  const rangeMinMl = roundToNearest(baselineMin + adjustment, 50)
  const rangeMaxMl = roundToNearest(baselineMax + adjustment, 50)
  const referenceMl = roundToNearest((rangeMinMl + rangeMaxMl) / 2, 50)
  const glassCount = Math.max(1, Math.round(referenceMl / mlPerGlass))

  return {
    status: 'reference',
    referenceMl,
    rangeMinMl,
    rangeMaxMl,
    glassCount,
    message: `Referencia diaria: ${referenceMl} ml, aproximadamente ${glassCount} vasos de ${mlPerGlass} ml. Ajusta segun sed, actividad y condiciones del dia.`,
    evidence,
  }
}
