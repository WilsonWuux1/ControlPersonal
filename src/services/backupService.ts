import { z } from 'zod'
import { loadAppData, replaceAllData } from '../db/repository'
import type { AppData, BackupEntityName } from '../types/domain'
import { newId, nowIso } from '../utils/date'
import { decryptText, encryptText } from './cryptoService'
import { backupEnvelopeSchema } from '../validation/schemas'

export interface BackupEnvelope {
  schemaVersion: number
  backupId: string
  createdAt: string
  deviceName: string
  entityCounts: Record<BackupEntityName, number>
  data: AppData
}

export interface ImportPreview {
  backupId: string
  createdAt: string
  deviceName: string
  entityCounts: Record<string, number>
}

const countEntities = (data: AppData): Record<BackupEntityName, number> => ({
  settings: 1,
  habits: data.habits.length,
  habitEntries: data.habitEntries.length,
  priorities: data.priorities.length,
  projects: data.projects.length,
  tasks: data.tasks.length,
  workSessions: data.workSessions.length,
  recreationLogs: data.recreationLogs.length,
  sleepLogs: data.sleepLogs.length,
  mealLogs: data.mealLogs.length,
  trainingLogs: data.trainingLogs.length,
  careLogs: data.careLogs.length,
  socialLogs: data.socialLogs.length,
  accounts: data.accounts.length,
  movements: data.movements.length,
  budgets: data.budgets.length,
  obligations: data.obligations.length,
  debts: data.debts.length,
  debtPayments: data.debtPayments.length,
  funds: data.funds.length,
  principles: data.principles.length,
  motivationLinks: data.motivationLinks.length,
  dailyCheckIns: data.dailyCheckIns.length,
  moodEnergyLogs: data.moodEnergyLogs.length,
  weightLogs: data.weightLogs.length,
})

export const createBackupEnvelope = async (): Promise<BackupEnvelope> => {
  const data = await loadAppData()
  return {
    schemaVersion: 1,
    backupId: newId(),
    createdAt: nowIso(),
    deviceName: data.settings.deviceName,
    entityCounts: countEntities(data),
    data,
  }
}

export const serializeBackup = async (encryptPassword?: string): Promise<string> => {
  const envelope = await createBackupEnvelope()
  const serialized = JSON.stringify(envelope, null, 2)
  return encryptPassword ? encryptText(serialized, encryptPassword) : serialized
}

export const parseBackup = async (text: string, password?: string): Promise<BackupEnvelope> => {
  const raw = text.includes('"encrypted":true') || text.includes('"encrypted": true') ? await decryptText(text, password ?? '') : text
  const parsed = backupEnvelopeSchema.parse(JSON.parse(raw))
  const data = parsed.data as unknown as AppData
  return {
    schemaVersion: parsed.schemaVersion,
    backupId: parsed.backupId,
    createdAt: parsed.createdAt,
    deviceName: parsed.deviceName,
    entityCounts: parsed.entityCounts as Record<BackupEntityName, number>,
    data,
  }
}

export const previewBackup = async (text: string, password?: string): Promise<ImportPreview> => {
  const envelope = await parseBackup(text, password)
  return {
    backupId: envelope.backupId,
    createdAt: envelope.createdAt,
    deviceName: envelope.deviceName,
    entityCounts: envelope.entityCounts,
  }
}

export const detectDuplicateIds = (current: AppData, incoming: AppData): string[] => {
  const currentIds = new Set<string>()
  const duplicateIds: string[] = []
  for (const values of Object.values(current)) {
    if (Array.isArray(values)) values.forEach((item: { id: string }) => currentIds.add(item.id))
  }
  for (const values of Object.values(incoming)) {
    if (Array.isArray(values)) {
      values.forEach((item: { id: string }) => {
        if (currentIds.has(item.id)) duplicateIds.push(item.id)
      })
    }
  }
  return duplicateIds
}

export const importBackup = async (text: string, mode: 'replace' | 'merge', password?: string): Promise<{ imported: number; duplicates: number }> => {
  const incoming = await parseBackup(text, password)
  if (incoming.schemaVersion > 1) throw new Error('El respaldo usa una version de esquema no compatible.')
  if (mode === 'replace') {
    await replaceAllData(incoming.data)
    return { imported: Object.values(incoming.entityCounts).reduce((total, count) => total + count, 0), duplicates: 0 }
  }
  const current = await loadAppData()
  const duplicates = new Set(detectDuplicateIds(current, incoming.data))
  const merged = z.custom<AppData>().parse({
    ...incoming.data,
    settings: current.settings,
    habits: [...current.habits, ...incoming.data.habits.filter((item) => !duplicates.has(item.id))],
    habitEntries: [...current.habitEntries, ...incoming.data.habitEntries.filter((item) => !duplicates.has(item.id))],
    priorities: [...current.priorities, ...incoming.data.priorities.filter((item) => !duplicates.has(item.id))],
    projects: [...current.projects, ...incoming.data.projects.filter((item) => !duplicates.has(item.id))],
    tasks: [...current.tasks, ...incoming.data.tasks.filter((item) => !duplicates.has(item.id))],
    workSessions: [...current.workSessions, ...incoming.data.workSessions.filter((item) => !duplicates.has(item.id))],
    recreationLogs: [...current.recreationLogs, ...incoming.data.recreationLogs.filter((item) => !duplicates.has(item.id))],
    sleepLogs: [...current.sleepLogs, ...incoming.data.sleepLogs.filter((item) => !duplicates.has(item.id))],
    mealLogs: [...current.mealLogs, ...incoming.data.mealLogs.filter((item) => !duplicates.has(item.id))],
    trainingLogs: [...current.trainingLogs, ...incoming.data.trainingLogs.filter((item) => !duplicates.has(item.id))],
    careLogs: [...current.careLogs, ...incoming.data.careLogs.filter((item) => !duplicates.has(item.id))],
    socialLogs: [...current.socialLogs, ...incoming.data.socialLogs.filter((item) => !duplicates.has(item.id))],
    accounts: [...current.accounts, ...incoming.data.accounts.filter((item) => !duplicates.has(item.id))],
    movements: [...current.movements, ...incoming.data.movements.filter((item) => !duplicates.has(item.id))],
    budgets: [...current.budgets, ...incoming.data.budgets.filter((item) => !duplicates.has(item.id))],
    obligations: [...current.obligations, ...incoming.data.obligations.filter((item) => !duplicates.has(item.id))],
    debts: [...current.debts, ...incoming.data.debts.filter((item) => !duplicates.has(item.id))],
    debtPayments: [...current.debtPayments, ...incoming.data.debtPayments.filter((item) => !duplicates.has(item.id))],
    funds: [...current.funds, ...incoming.data.funds.filter((item) => !duplicates.has(item.id))],
    principles: [...current.principles, ...incoming.data.principles.filter((item) => !duplicates.has(item.id))],
    motivationLinks: [...current.motivationLinks, ...incoming.data.motivationLinks.filter((item) => !duplicates.has(item.id))],
    dailyCheckIns: [...current.dailyCheckIns, ...incoming.data.dailyCheckIns.filter((item) => !duplicates.has(item.id))],
    moodEnergyLogs: [...current.moodEnergyLogs, ...(incoming.data.moodEnergyLogs ?? []).filter((item) => !duplicates.has(item.id))],
    weightLogs: [...current.weightLogs, ...(incoming.data.weightLogs ?? []).filter((item) => !duplicates.has(item.id))],
  })
  await replaceAllData(merged)
  return { imported: Object.values(incoming.entityCounts).reduce((total, count) => total + count, 0) - duplicates.size, duplicates: duplicates.size }
}
