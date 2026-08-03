import { differenceInYears, parseISO } from 'date-fns'
import type { AppData, AppSettings, MotivationLink } from '../types/domain'
import { todayIso } from '../utils/date'
import { averageSleepHours, dailyEffectiveWorkMinutes } from './timeCalculations'

export interface ProfileSummary {
  age?: number
  heightCm?: number
  weightLb?: number
  bodyMassIndex?: number
  bmiReferenceMin?: number
  bmiReferenceMax?: number
  bmiReferenceTarget?: number
  referenceWeightMinLb?: number
  referenceWeightMaxLb?: number
  referenceWeightTargetLb?: number
  weightToReferenceLb?: number
  bmiCategory?: 'Bajo peso' | 'Rango de referencia' | 'Sobrepeso' | 'Obesidad grado I' | 'Obesidad grado II' | 'Obesidad grado III'
}

export interface BodyProfileSummary {
  title: string
  description: string
}

type BodyProfileData = Pick<AppData, 'settings' | 'trainingLogs' | 'mealLogs' | 'sleepLogs'>

const kgPerLb = 0.45359237
const lbPerKg = 2.2046226218
const lowerFirst = (value: string) => `${value.charAt(0).toLowerCase()}${value.slice(1)}`

export const getProfileSummary = (settings: AppSettings, now = new Date()): ProfileSummary => {
  const age = settings.birthDate ? differenceInYears(now, parseISO(settings.birthDate)) : undefined
  const weightLb = settings.weightLb ?? settings.weightKg
  const weightKg = weightLb ? weightLb * kgPerLb : undefined
  const bodyMassIndex = settings.heightCm && weightKg ? Number((weightKg / (settings.heightCm / 100) ** 2).toFixed(1)) : undefined
  const heightMeters = settings.heightCm ? settings.heightCm / 100 : undefined
  const usesAdultReference = !age || age >= 20
  const bmiReferenceMin = usesAdultReference ? 18.5 : undefined
  const bmiReferenceMax = usesAdultReference ? 24.9 : undefined
  const bmiReferenceTarget = usesAdultReference ? 22 : undefined
  const referenceWeightMinLb = heightMeters && bmiReferenceMin ? Number((bmiReferenceMin * heightMeters ** 2 * lbPerKg).toFixed(1)) : undefined
  const referenceWeightMaxLb = heightMeters && bmiReferenceMax ? Number((bmiReferenceMax * heightMeters ** 2 * lbPerKg).toFixed(1)) : undefined
  const referenceWeightTargetLb = heightMeters && bmiReferenceTarget ? Number((bmiReferenceTarget * heightMeters ** 2 * lbPerKg).toFixed(1)) : undefined
  const weightToReferenceLb =
    weightLb && referenceWeightMinLb && referenceWeightMaxLb
      ? weightLb < referenceWeightMinLb
        ? Number((referenceWeightMinLb - weightLb).toFixed(1))
        : weightLb > referenceWeightMaxLb
          ? Number((weightLb - referenceWeightMaxLb).toFixed(1))
          : 0
      : undefined
  const bmiCategory = bodyMassIndex
    ? bodyMassIndex < 18.5
      ? 'Bajo peso'
      : bodyMassIndex < 25
        ? 'Rango de referencia'
        : bodyMassIndex < 30
          ? 'Sobrepeso'
          : bodyMassIndex < 35
            ? 'Obesidad grado I'
            : bodyMassIndex < 40
              ? 'Obesidad grado II'
              : 'Obesidad grado III'
    : undefined
  return {
    age,
    heightCm: settings.heightCm,
    weightLb,
    bodyMassIndex,
    bmiReferenceMin,
    bmiReferenceMax,
    bmiReferenceTarget,
    referenceWeightMinLb,
    referenceWeightMaxLb,
    referenceWeightTargetLb,
    weightToReferenceLb,
    bmiCategory,
  }
}

export const bodyProfileSummary = (data: BodyProfileData): BodyProfileSummary => {
  const profile = getProfileSummary(data.settings)
  const sleepAverage = averageSleepHours(data.sleepLogs)
  const trainingDays = new Set(data.trainingLogs.map((log) => log.dateTime.slice(0, 10))).size
  const plannedMeals = data.mealLogs.length ? data.mealLogs.filter((meal) => meal.planned).length / data.mealLogs.length : 0

  if (!profile.bodyMassIndex || !profile.weightLb || !profile.heightCm || !profile.bmiCategory) {
    return {
      title: 'Completa tu perfil corporal.',
      description: 'Agrega altura, peso y fecha de nacimiento para generar una lectura visual con IMC, rango de peso y una meta inicial.',
    }
  }

  const targetWeight = profile.bodyMassIndex >= 25 ? Math.max(Math.round(profile.weightLb * 0.95), Math.round(profile.referenceWeightMaxLb ?? profile.weightLb)) : profile.referenceWeightTargetLb ? Math.round(profile.referenceWeightTargetLb) : Math.round(profile.weightLb)
  const activityText =
    trainingDays === 0
      ? 'recuperar gradualmente la actividad fisica'
      : `mantener tus ${trainingDays} dias registrados de actividad fisica`
  const foodText = plannedMeals < 0.5 ? 'mejorar tus horarios de alimentacion' : 'sostener tus comidas planificadas'
  const sleepText =
    sleepAverage > 0 && sleepAverage < data.settings.sleepGoalHours
      ? 'mejorar tu descanso'
      : 'mantener horarios de descanso estables'

  if (profile.bodyMassIndex >= 30) {
    return {
      title: 'Tu peso requiere atencion.',
      description: `Tu IMC de ${profile.bodyMassIndex} corresponde a ${lowerFirst(profile.bmiCategory)}. Te recomendamos comenzar con una meta inicial de ${targetWeight} lb, ${activityText}, ${foodText} y ${sleepText}. No necesitas resolverlo todo de una vez: el objetivo es avanzar de forma constante.`,
    }
  }

  if (profile.bodyMassIndex >= 25) {
    return {
      title: 'Tu peso esta sobre el rango de referencia.',
      description: `Tu IMC de ${profile.bodyMassIndex} corresponde a sobrepeso. Una primera meta razonable es ${targetWeight} lb, junto con ${activityText}, ${foodText} y ${sleepText}. El objetivo inicial es crear traccion, no buscar perfeccion.`,
    }
  }

  if (profile.bodyMassIndex < 18.5) {
    return {
      title: 'Tu peso esta por debajo del rango de referencia.',
      description: `Tu IMC de ${profile.bodyMassIndex} corresponde a bajo peso. Usa como referencia un rango de ${profile.referenceWeightMinLb}-${profile.referenceWeightMaxLb} lb para tu altura y prioriza alimentacion regular, fuerza basica y descanso estable.`,
    }
  }

  return {
    title: 'Tu peso esta dentro del rango de referencia.',
    description: `Tu IMC de ${profile.bodyMassIndex} esta en rango. Mantener actividad fisica, alimentacion ordenada y descanso estable ayuda a sostener este punto sin convertirlo en presion diaria.`,
  }
}

export const recommendationSeed = (data: AppData): string[] => {
  const today = todayIso()
  const profile = getProfileSummary(data.settings)
  const todayCheckIn = data.dailyCheckIns.find((item) => item.date === today)
  const sleepAverage = averageSleepHours(data.sleepLogs)
  const workMinutes = dailyEffectiveWorkMinutes(data.workSessions, today)
  const trainingDays = new Set(data.trainingLogs.map((log) => log.dateTime.slice(0, 10))).size
  const scrollMinutes = data.recreationLogs
    .filter((log) => log.type === 'Desplazamiento automatico')
    .reduce((total, log) => total + log.durationMinutes, 0)
  const creativeMinutes = data.recreationLogs
    .filter((log) => log.type === 'Creacion de contenido')
    .reduce((total, log) => total + log.durationMinutes, 0)
  const recommendations: string[] = []

  if (profile.age && profile.heightCm && profile.weightLb) {
    recommendations.push(`Perfil registrado: ${profile.age} anos, ${profile.heightCm} cm y ${profile.weightLb} lb.`)
  } else {
    recommendations.push('Completa edad, altura y peso en Configuracion para que las recomendaciones tengan mas contexto.')
  }
  if (profile.bodyMassIndex && profile.bmiReferenceMin && profile.bmiReferenceMax && profile.referenceWeightMinLb && profile.referenceWeightMaxLb) {
    recommendations.push(
      `IMC actual ${profile.bodyMassIndex} (${profile.bmiCategory}). Referencia adulta: IMC ${profile.bmiReferenceMin}-${profile.bmiReferenceMax}; para ${profile.heightCm} cm equivale a ${profile.referenceWeightMinLb}-${profile.referenceWeightMaxLb} lb.`,
    )
  }
  if (sleepAverage > 0 && sleepAverage < data.settings.sleepGoalHours) {
    recommendations.push(`Tu sueno promedio esta bajo tu meta de ${data.settings.sleepGoalHours} h. Prioriza una hora de cierre mas estable esta semana.`)
  }
  if (workMinutes > 600) {
    recommendations.push('Hoy superaste 10 horas de trabajo efectivo. Registra el logro, pero evita convertir el exceso en meta habitual.')
  }
  if (trainingDays === 0) {
    recommendations.push('No hay entrenamientos registrados. Una caminata o movilidad corta ya sirve como punto de reinicio.')
  }
  if (scrollMinutes > creativeMinutes && scrollMinutes > 0) {
    recommendations.push('El scroll automatico supera el tiempo creativo registrado. Considera cambiar una parte por consumo intencional o creacion.')
  }
  if ((todayCheckIn?.mood ?? 3) <= 2) {
    recommendations.push('Tu animo de hoy esta bajo. Elige una accion pequena, revisa un principio favorito y evita tomar decisiones grandes desde cansancio.')
  }

  return recommendations
}

export const motivationForLowMood = (data: AppData): MotivationLink[] => {
  const mood = data.dailyCheckIns.find((item) => item.date === todayIso())?.mood ?? 3
  if (mood > 2) return []
  const favorites = data.motivationLinks.filter((link) => link.favorite)
  const localNotes = data.motivationLinks.filter((link) => link.localNote)
  return [...favorites, ...localNotes].slice(0, 3)
}
