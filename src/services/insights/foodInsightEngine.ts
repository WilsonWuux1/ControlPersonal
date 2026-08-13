export interface MealClassification {
  proteinSource?: boolean
  fruit?: boolean
  vegetable?: boolean
  legume?: boolean
  sugaryDrink?: boolean
  friedLikely?: boolean
  ultraProcessedLikely?: boolean
  homePreparedLikely?: boolean
  confidence: 'low' | 'medium' | 'high'
  evidence: string[]
}

const dictionary = {
  proteinSource: ['pollo', 'huevo', 'carne', 'atun', 'pescado', 'queso', 'yogurt', 'yogur'],
  fruit: ['fresa', 'fresas', 'arandano', 'arandanos', 'frambuesa', 'mora', 'manzana', 'banano', 'banana'],
  vegetable: ['ensalada', 'tomate', 'lechuga', 'zanahoria', 'brocoli', 'verdura', 'verduras'],
  legume: ['frijol', 'frijoles', 'frijolitos', 'lenteja', 'lentejas'],
  sugaryDrink: ['coca cola', 'gaseosa', 'fresco', 'jugo envasado'],
  friedLikely: ['frito', 'frita', 'papas fritas', 'pollo frito'],
  ultraProcessedLikely: ['pizza', 'hamburguesa', 'hot dog', 'galleta', 'snack', 'nachos'],
  homePreparedLikely: ['casero', 'hecho en casa', 'cocido', 'asado', 'guisado'],
}

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const hasAny = (text: string, words: string[]): string[] => words.filter((word) => text.includes(word))

export const classifyMealText = (description: string): MealClassification => {
  const text = normalize(description)
  const evidence: string[] = []
  const result: MealClassification = { confidence: 'low', evidence }
  const entries = Object.entries(dictionary) as Array<[Exclude<keyof MealClassification, 'confidence' | 'evidence'>, string[]]>

  for (const [key, words] of entries) {
    const matches = hasAny(text, words)
    if (matches.length > 0) {
      result[key] = true
      evidence.push(`${key}: ${matches.join(', ')}`)
    }
  }

  result.confidence = evidence.length >= 4 ? 'high' : evidence.length >= 2 ? 'medium' : 'low'
  return result
}
