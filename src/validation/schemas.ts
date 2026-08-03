import { z } from 'zod'

export const positiveAmountSchema = z.coerce.number().finite().positive('Debe ser mayor a cero')
export const optionalAmountSchema = z.coerce.number().finite().min(0)
export const shortTextSchema = z.string().trim().min(1, 'Campo requerido').max(160)
export const notesSchema = z.string().trim().max(1000).optional()

export const backupEnvelopeSchema = z.object({
  schemaVersion: z.number(),
  backupId: z.string(),
  createdAt: z.string(),
  deviceName: z.string(),
  entityCounts: z.record(z.string(), z.number()),
  data: z.record(z.string(), z.unknown()),
})
