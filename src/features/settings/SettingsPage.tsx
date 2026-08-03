import { useEffect, useState } from 'react'
import { Download, Lock, RefreshCw, Upload } from 'lucide-react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../stores/appStore'
import { importBackup, previewBackup, serializeBackup, type ImportPreview } from '../../services/backupService'
import { hashPin } from '../../services/cryptoService'
import { todayIso } from '../../utils/date'

export function SettingsPage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const addWeightLog = useAppStore((state) => state.addWeightLog)
  const resetAll = useAppStore((state) => state.resetAll)
  const load = useAppStore((state) => state.load)
  const addToast = useAppStore((state) => state.addToast)
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [importText, setImportText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')
  const [weightDraft, setWeightDraft] = useState('')

  useEffect(() => {
    if (!data) return
    setWeightDraft(String(data.settings.weightLb ?? data.settings.weightKg ?? ''))
  }, [data?.settings.weightKg, data?.settings.weightLb, data])

  if (!data) return null

  const exportBackup = async (encrypted: boolean) => {
    const text = await serializeBackup(encrypted ? password : undefined)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `control-personal-${todayIso().replaceAll('-', '')}.json`
    link.click()
    URL.revokeObjectURL(url)
    await updateSettings({ lastBackupAt: new Date().toISOString() })
    addToast({ title: 'Respaldo exportado', tone: 'success' })
  }

  const readImportFile = async (file: File) => {
    const text = await file.text()
    setImportText(text)
    setPreview(await previewBackup(text, password || undefined))
  }

  const enablePin = async () => {
    if (pin.length < 4) {
      addToast({ title: 'PIN demasiado corto', detail: 'Usa al menos 4 digitos.', tone: 'warning' })
      return
    }
    const result = await hashPin(pin)
    await updateSettings({ lockEnabled: true, lockSalt: result.salt, lockVerifier: result.verifier })
    setPin('')
  }

  const approximateBytes = new Blob([JSON.stringify(data)]).size
  return (
    <section className="page stack">
      <div className="stat-grid">
        <StatCard label="Persistencia" value={data.settings.persistentStorage ? 'Concedida' : 'No concedida'} icon={<RefreshCw />} />
        <StatCard label="Uso aproximado" value={`${Math.round(approximateBytes / 1024)} KB`} icon={<Download />} />
        <StatCard label="Ultimo respaldo" value={data.settings.lastBackupAt ? data.settings.lastBackupAt.slice(0, 10) : 'Nunca'} icon={<Upload />} />
        <StatCard label="Dispositivo" value={data.settings.deviceName} icon={<Lock />} />
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Preferencias</h2>
          </div>
          <div className="form-grid two">
            <label>
              Nombre
              <input value={data.settings.userName} onChange={(event) => updateSettings({ userName: event.target.value })} />
            </label>
            <label>
              Dispositivo
              <input value={data.settings.deviceName} onChange={(event) => updateSettings({ deviceName: event.target.value })} />
            </label>
            <label>
              Moneda
              <input value={data.settings.currency} onChange={(event) => updateSettings({ currency: event.target.value.toUpperCase() })} />
            </label>
            <label>
              Meta de sueno
              <input type="number" value={data.settings.sleepGoalHours} onChange={(event) => updateSettings({ sleepGoalHours: Number(event.target.value) })} />
            </label>
            <label>
              Fecha de nacimiento
              <input type="date" value={data.settings.birthDate ?? ''} onChange={(event) => updateSettings({ birthDate: event.target.value || undefined })} />
            </label>
            <label>
              Altura en cm
              <input
                type="number"
                min="80"
                max="250"
                value={data.settings.heightCm ?? ''}
                onChange={(event) => updateSettings({ heightCm: event.target.value ? Number(event.target.value) : undefined })}
              />
            </label>
            <label>
              Peso en lb
              <div className="inline-control">
                <input type="number" min="50" max="800" step="0.1" value={weightDraft} onChange={(event) => setWeightDraft(event.target.value)} />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const weight = Number(weightDraft)
                    if (!Number.isFinite(weight) || weight <= 0) return
                    await addWeightLog({ date: todayIso(), dateTime: new Date().toISOString(), weightLb: weight })
                    addToast({ title: 'Peso registrado', detail: `${weight} lb`, tone: 'success' })
                  }}
                >
                  Registrar
                </Button>
              </div>
            </label>
            <label>
              Sexo biologico
              <select
                value={data.settings.biologicalSex ?? 'unspecified'}
                onChange={(event) => updateSettings({ biologicalSex: event.target.value as 'female' | 'male' | 'unspecified' })}
              >
                <option value="unspecified">Prefiero no indicar</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
              </select>
            </label>
            <label>
              Tema
              <select value={data.settings.theme} onChange={(event) => updateSettings({ theme: event.target.value as 'light' | 'dark' | 'system' })}>
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </label>
            <label>
              Bloqueo por inactividad
              <input type="number" value={data.settings.inactivityMinutes} onChange={(event) => updateSettings({ inactivityMinutes: Number(event.target.value) })} />
            </label>
          </div>
          <p className="muted">
            Los datos pertenecen solo a este navegador y dispositivo. Borrar datos del navegador puede eliminar IndexedDB; usa respaldos para mover informacion entre telefono y computadora.
          </p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Bloqueo local</h2>
          </div>
          <p>Proteccion local de privacidad. No reemplaza seguridad de servidor y no tiene recuperacion remota.</p>
          <div className="inline-form">
            <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" placeholder="Nuevo PIN" />
            <Button onClick={enablePin}>Activar PIN</Button>
          </div>
          {data.settings.lockEnabled ? (
            <Button variant="secondary" onClick={() => updateSettings({ lockEnabled: false, lockSalt: undefined, lockVerifier: undefined })}>
              Desactivar PIN
            </Button>
          ) : null}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Respaldos y restauracion</h2>
        </div>
        <div className="form-grid two">
          <label>
            Contraseña opcional para cifrar o importar
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <div className="actions">
            <Button onClick={() => exportBackup(false)}>Exportar JSON</Button>
            <Button variant="secondary" onClick={() => exportBackup(true)} disabled={!password}>
              Exportar cifrado
            </Button>
          </div>
          <label>
            Importar respaldo
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) readImportFile(file)
              }}
            />
          </label>
        </div>
        {preview ? (
          <div className="notice info">
            <p>
              Respaldo {preview.backupId} de {preview.deviceName}. Registros:{' '}
              {Object.values(preview.entityCounts).reduce((sum, count) => sum + count, 0)}.
            </p>
            <Button
              onClick={async () => {
                await serializeBackup()
                await importBackup(importText, 'replace', password || undefined)
                await load()
                addToast({ title: 'Respaldo restaurado', tone: 'success' })
              }}
            >
              Reemplazar datos
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await importBackup(importText, 'merge', password || undefined)
                await load()
                addToast({ title: 'Respaldo combinado', tone: 'success' })
              }}
            >
              Combinar sin duplicados
            </Button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Instalar aplicacion</h2>
        </div>
        <div className="insight-grid">
          <p>Chrome Android: abre el menu del navegador y usa Instalar aplicacion.</p>
          <p>Safari iPhone: comparte la pagina y elige Agregar a pantalla de inicio.</p>
          <p>Chrome o Edge en computadora: usa el icono de instalacion en la barra de direcciones.</p>
          <p>Despues de la primera carga, los recursos internos quedan cacheados por el service worker.</p>
        </div>
      </section>

      <section className="panel danger-zone">
        <div className="panel-header">
          <h2>Reiniciar sistema</h2>
        </div>
        <p>El reinicio borra los datos locales de Control Personal en este navegador.</p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Reiniciar todos los datos
        </Button>
      </section>

      {confirmReset ? (
        <ConfirmReset
          value={resetPhrase}
          onChange={setResetPhrase}
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            if (resetPhrase === 'ELIMINAR') {
              await resetAll()
              setConfirmReset(false)
              setResetPhrase('')
            }
          }}
        />
      ) : null}
    </section>
  )
}

function ConfirmReset({ value, onChange, onCancel, onConfirm }: { value: string; onChange: (value: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <ConfirmDialog
        open
        title="Confirmar reinicio"
        message="Antes de confirmar escribe ELIMINAR en el campo visible bajo este dialogo."
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
      <div className="modal-backdrop secondary-confirm" aria-live="polite">
        <label className="confirm-phrase">
          Confirmacion escrita
          <input value={value} onChange={(event) => onChange(event.target.value)} autoFocus />
        </label>
      </div>
    </>
  )
}
