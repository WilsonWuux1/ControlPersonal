export const workFocusOptions = [
  { value: 1, label: 'Muy distraido' },
  { value: 2, label: 'Distraido' },
  { value: 3, label: 'Concentrado' },
  { value: 4, label: 'Enfocado' },
  { value: 5, label: 'Muy enfocado' },
] as const

export const workFocusLabel = (value: number): string => workFocusOptions.find((option) => option.value === value)?.label ?? `${value}/5`
