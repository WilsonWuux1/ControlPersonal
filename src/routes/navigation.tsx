import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  HeartPulse,
  Home,
  Landmark,
  Quote,
  Settings,
  Target,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/habitos', label: 'Habitos', icon: CalendarCheck },
  { to: '/trabajo', label: 'Trabajo', icon: Briefcase },
  { to: '/bienestar', label: 'Bienestar', icon: HeartPulse },
  { to: '/finanzas', label: 'Finanzas', icon: Landmark },
  { to: '/progreso', label: 'Progreso', icon: BarChart3 },
  { to: '/motivacion', label: 'Motivacion', icon: Quote },
  { to: '/configuracion', label: 'Config.', icon: Settings },
]

export const quickActions = [
  { action: 'habit', label: 'Registrar habito', icon: CalendarCheck },
  { action: 'expense', label: 'Registrar gasto', icon: Landmark },
  { action: 'income', label: 'Registrar ingreso', icon: Target },
  { action: 'work', label: 'Sesion de trabajo', icon: Briefcase },
] as const

export type QuickActionType = (typeof quickActions)[number]['action']
