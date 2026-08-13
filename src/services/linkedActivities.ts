import type { Habit, HabitEntry } from '../types/domain'
import { statusFromValue } from './habitScoring'

export type LinkedHabitEntryDraft = Pick<HabitEntry, 'habitId' | 'date' | 'value' | 'status'> &
  Partial<Pick<HabitEntry, 'id' | 'createdAt' | 'notes'>>

const normalizeName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const isTrainingHabitName = (name: string): boolean => {
  const normalized = normalizeName(name)
  return normalized === 'entrenamiento' || normalized.includes('entrenamiento')
}

export const createLinkedTrainingHabitEntry = (
  habit: Habit,
  existingEntry: HabitEntry | undefined,
  date: string,
  durationMinutes: number,
): LinkedHabitEntryDraft => {
  const addedMinutes = Math.max(0, Math.round(durationMinutes))
  const value = (existingEntry?.value ?? 0) + addedMinutes

  return {
    id: existingEntry?.id,
    createdAt: existingEntry?.createdAt,
    habitId: habit.id,
    date,
    value,
    status: statusFromValue(habit, value),
    notes: existingEntry?.notes,
  }
}
