import type { Habit, HabitEntry, HabitEntryStatus } from '../types/domain'

export const defaultHabitScoreWeights: Record<HabitEntryStatus, number | null> = {
  unregistered: 0,
  minimum: 0.5,
  target: 1,
  excellent: 1.2,
  paused: null,
  not_applicable: null,
}

export const statusFromValue = (habit: Habit, value: number): HabitEntryStatus => {
  if (value >= habit.excellentValue) return 'excellent'
  if (value >= habit.targetValue) return 'target'
  if (value >= habit.minimumValue) return 'minimum'
  return 'unregistered'
}

export const scoreHabitEntry = (
  habit: Habit,
  entry: HabitEntry | undefined,
  weights: Record<HabitEntryStatus, number | null> = defaultHabitScoreWeights,
): number | null => {
  const status = entry?.status ?? 'unregistered'
  const base = weights[status]
  if (base === null) return null
  const weighted = base * habit.weight
  return Math.min(weighted, 1.2 * habit.weight)
}

export const calculateHabitDayScore = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weights: Record<HabitEntryStatus, number | null> = defaultHabitScoreWeights,
): { score: number; possible: number; minimumPercent: number; targetPercent: number } => {
  const activeHabits = habits.filter((habit) => habit.status === 'active')
  const values = activeHabits
    .map((habit) => scoreHabitEntry(habit, entries.find((entry) => entry.habitId === habit.id && entry.date === date), weights))
    .filter((value): value is number => value !== null)
  const possible = activeHabits.reduce((total, habit) => total + habit.weight, 0)
  const score = values.reduce((total, value) => total + value, 0)
  const dayEntries = entries.filter((entry) => entry.date === date)
  const minimumCount = dayEntries.filter((entry) => entry.status === 'minimum' || entry.status === 'target' || entry.status === 'excellent').length
  const targetCount = dayEntries.filter((entry) => entry.status === 'target' || entry.status === 'excellent').length
  return {
    score,
    possible,
    minimumPercent: activeHabits.length ? minimumCount / activeHabits.length : 0,
    targetPercent: activeHabits.length ? targetCount / activeHabits.length : 0,
  }
}

export const dayColor = (score: number, possible: number, recovered: boolean): 'gray' | 'blue' | 'green' | 'gold' => {
  if (recovered) return 'blue'
  if (possible === 0 || score === 0) return 'gray'
  const ratio = score / possible
  if (ratio >= 1.05) return 'gold'
  if (ratio >= 0.75) return 'green'
  return 'blue'
}
