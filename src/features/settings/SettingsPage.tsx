import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronDown,
  Database,
  Download,
  Droplets,
  HardDrive,
  Lock,
  RefreshCw,
  Scale,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppStore } from '../../stores/appStore'
import {
  importBackup,
  previewBackup,
  serializeBackup,
  type ImportPreview,
} from '../../services/backupService'
import { hashPin } from '../../services/cryptoService'
import { deviceNotificationsSupported, requestDeviceNotificationPermission } from '../../services/deviceNotifications'
import { todayIso } from '../../utils/date'

type SettingsSection =
  | 'notifications'
  | 'security'
  | 'backup'
  | 'install'
  | 'danger'
  | null

export function SettingsPage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore(
    (state) => state.updateSettings,
  )
  const addWeightLog = useAppStore(
    (state) => state.addWeightLog,
  )
  const resetAll = useAppStore((state) => state.resetAll)
  const load = useAppStore((state) => state.load)
  const addToast = useAppStore((state) => state.addToast)

  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [importText, setImportText] = useState('')
  const [preview, setPreview] =
    useState<ImportPreview | null>(null)
  const [confirmReset, setConfirmReset] =
    useState(false)
  const [resetPhrase, setResetPhrase] = useState('')
  const [weightDraft, setWeightDraft] = useState('')
  const [openSection, setOpenSection] =
    useState<SettingsSection>(null)

  useEffect(() => {
    if (!data) return

    setWeightDraft(
      String(
        data.settings.weightLb ??
          data.settings.weightKg ??
          '',
      ),
    )
  }, [
    data?.settings.weightKg,
    data?.settings.weightLb,
    data,
  ])

  if (!data) return null

  const approximateBytes = new Blob([
    JSON.stringify(data),
  ]).size

  const approximateKb = Math.round(
    approximateBytes / 1024,
  )

  const lastBackup =
    data.settings.lastBackupAt?.slice(0, 10) ??
    'Nunca'

  const toggleSection = (
    section: Exclude<SettingsSection, null>,
  ) => {
    setOpenSection((current) =>
      current === section ? null : section,
    )
  }

  const exportBackup = async (
    encrypted: boolean,
  ) => {
    const text = await serializeBackup(
      encrypted ? password : undefined,
    )

    const blob = new Blob([text], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `control-personal-${todayIso().replaceAll(
      '-',
      '',
    )}.json`

    link.click()
    URL.revokeObjectURL(url)

    await updateSettings({
      lastBackupAt: new Date().toISOString(),
    })

    addToast({
      title: 'Respaldo exportado',
      tone: 'success',
    })
  }

  const readImportFile = async (file: File) => {
    const text = await file.text()

    setImportText(text)
    setPreview(
      await previewBackup(
        text,
        password || undefined,
      ),
    )
  }

  const enablePin = async () => {
    if (pin.length < 4) {
      addToast({
        title: 'PIN demasiado corto',
        detail: 'Usa al menos 4 dígitos.',
        tone: 'warning',
      })

      return
    }

    const result = await hashPin(pin)

    await updateSettings({
      lockEnabled: true,
      lockSalt: result.salt,
      lockVerifier: result.verifier,
    })

    setPin('')

    addToast({
      title: 'PIN activado',
      tone: 'success',
    })
  }

  const disablePin = async () => {
    await updateSettings({
      lockEnabled: false,
      lockSalt: undefined,
      lockVerifier: undefined,
    })

    addToast({
      title: 'PIN desactivado',
      tone: 'success',
    })
  }

  const registerWeight = async () => {
    const weight = Number(weightDraft)

    if (
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      addToast({
        title: 'Peso no válido',
        detail: 'Ingresa un valor mayor que cero.',
        tone: 'warning',
      })

      return
    }

    await addWeightLog({
      date: todayIso(),
      dateTime: new Date().toISOString(),
      weightLb: weight,
    })

    addToast({
      title: 'Peso registrado',
      detail: `${weight} lb`,
      tone: 'success',
    })
  }

  const enableDeviceNotifications = async () => {
    if (!deviceNotificationsSupported()) {
      addToast({
        title: 'No disponible en este navegador',
        detail: 'Las notificaciones internas seguiran funcionando dentro de la app.',
        tone: 'warning',
      })
      return
    }

    const permission = await requestDeviceNotificationPermission()
    const enabled = permission === 'granted'
    await updateSettings({ deviceNotificationsEnabled: enabled })
    addToast({
      title: enabled ? 'Notificaciones del dispositivo activadas' : 'Permiso no concedido',
      detail: enabled
        ? 'La app podra mostrar avisos en el panel del telefono cuando el navegador lo permita.'
        : 'Puedes seguir usando la campana interna.',
      tone: enabled ? 'success' : 'warning',
    })
  }

  const restoreBackup = async (
    mode: 'replace' | 'merge',
  ) => {
    if (mode === 'replace') {
      await serializeBackup()
    }

    await importBackup(
      importText,
      mode,
      password || undefined,
    )

    await load()

    addToast({
      title:
        mode === 'replace'
          ? 'Respaldo restaurado'
          : 'Respaldo combinado',
      tone: 'success',
    })

    setPreview(null)
    setImportText('')
  }

  return (
    <section className="page settings-mobile-page">
      <header className="settings-page-header">
        <div>
          <p>Perfil, seguridad y datos locales</p> 
        </div>

        <span
          className={`settings-lock-state${
            data.settings.lockEnabled
              ? ' is-active'
              : ''
          }`}
        >
          <Lock size={14} aria-hidden="true" />

          {data.settings.lockEnabled
            ? 'PIN activo'
            : 'Sin PIN'}
        </span>
      </header>

      <div
        className="settings-summary-grid"
        aria-label="Resumen del sistema"
      >
        <article className="settings-summary-card tone-blue">
          <RefreshCw size={17} aria-hidden="true" />

          <span>Persistencia</span>

          <strong>
            {data.settings.persistentStorage
              ? 'Concedida'
              : 'No'}
          </strong>
        </article>

        <article className="settings-summary-card tone-violet">
          <HardDrive size={17} aria-hidden="true" />

          <span>Uso local</span>

          <strong>{approximateKb} KB</strong>
        </article>

        <article className="settings-summary-card tone-green">
          <Upload size={17} aria-hidden="true" />

          <span>Respaldo</span>

          <strong>{lastBackup}</strong>
        </article>

        <article className="settings-summary-card tone-slate">
          <Smartphone size={17} aria-hidden="true" />

          <span>Dispositivo</span>

          <strong>
            {data.settings.deviceName || 'Sin nombre'}
          </strong>
        </article>
      </div>

      <section className="panel settings-profile-panel">
        <div className="settings-section-heading">
          <div>
            <span>Datos principales</span>
            <h2>Perfil y preferencias</h2>
          </div>

          <UserRound size={19} aria-hidden="true" />
        </div>

        <div className="settings-form-grid">
          <label className="settings-field-wide">
            Nombre

            <input
              value={data.settings.userName}
              onChange={(event) =>
                updateSettings({
                  userName: event.target.value,
                })
              }
            />
          </label>

          <label>
            Fecha de nacimiento

            <input
              type="date"
              value={
                data.settings.birthDate ?? ''
              }
              onChange={(event) =>
                updateSettings({
                  birthDate:
                    event.target.value ||
                    undefined,
                })
              }
            />
          </label>

          <label>
            Sexo biológico

            <select
              value={
                data.settings.biologicalSex ??
                'unspecified'
              }
              onChange={(event) =>
                updateSettings({
                  biologicalSex:
                    event.target
                      .value as
                      | 'female'
                      | 'male'
                      | 'unspecified',
                })
              }
            >
              <option value="unspecified">
                Prefiero no indicar
              </option>

              <option value="female">
                Femenino
              </option>

              <option value="male">
                Masculino
              </option>
            </select>
          </label>

          <label>
            Altura en cm

            <input
              type="number"
              min="80"
              max="250"
              value={data.settings.heightCm ?? ''}
              onChange={(event) =>
                updateSettings({
                  heightCm: event.target.value
                    ? Number(
                        event.target.value,
                      )
                    : undefined,
                })
              }
            />
          </label>

          <label>
            Meta de sueño

            <input
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={
                data.settings.sleepGoalHours
              }
              onChange={(event) =>
                updateSettings({
                  sleepGoalHours: Number(
                    event.target.value,
                  ),
                })
              }
            />
          </label>

          <label className="settings-field-wide">
            Peso en lb

            <div className="settings-inline-control">
              <div className="settings-weight-input">
                <Scale
                  size={16}
                  aria-hidden="true"
                />

                <input
                  type="number"
                  min="50"
                  max="800"
                  step="0.1"
                  value={weightDraft}
                  onChange={(event) =>
                    setWeightDraft(
                      event.target.value,
                    )
                  }
                />
              </div>

              <Button
                variant="secondary"
                onClick={() =>
                  void registerWeight()
                }
              >
                Registrar
              </Button>
            </div>
          </label>
        </div>

        <div className="settings-divider" />

        <div className="settings-system-grid">
          <label>
            Dispositivo

            <input
              value={data.settings.deviceName}
              onChange={(event) =>
                updateSettings({
                  deviceName:
                    event.target.value,
                })
              }
            />
          </label>

          <label>
            Moneda

            <input
              value={data.settings.currency}
              maxLength={4}
              onChange={(event) =>
                updateSettings({
                  currency:
                    event.target.value.toUpperCase(),
                })
              }
            />
          </label>

          <label>
            Tema

            <select
              value={data.settings.theme}
              onChange={(event) =>
                updateSettings({
                  theme:
                    event.target
                      .value as
                      | 'light'
                      | 'dark'
                      | 'system',
                })
              }
            >
              <option value="system">
                Sistema
              </option>

              <option value="light">
                Claro
              </option>

              <option value="dark">
                Oscuro
              </option>
            </select>
          </label>

          <label>
            Bloqueo por inactividad

            <div className="settings-number-suffix">
              <input
                type="number"
                min="0"
                value={
                  data.settings.inactivityMinutes
                }
                onChange={(event) =>
                  updateSettings({
                    inactivityMinutes: Number(
                      event.target.value,
                    ),
                  })
                }
              />

              <span>min</span>
            </div>
          </label>
        </div>

        <p className="settings-local-note">
          Los datos pertenecen únicamente a este
          navegador y dispositivo. Usa respaldos
          antes de borrar datos del navegador o
          cambiar de equipo.
        </p>
      </section>

      <section className="settings-collapse">
        <button
          type="button"
          className="settings-collapse__summary"
          aria-expanded={openSection === 'notifications'}
          onClick={() => toggleSection('notifications')}
        >
          <div className="settings-collapse__identity">
            <span className="settings-collapse__icon tone-green">
              <Bell size={17} aria-hidden="true" />
            </span>

            <div>
              <strong>Notificaciones y agua</strong>
              <span>Recordatorios prudentes y equivalencias personales</span>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={openSection === 'notifications' ? 'is-open' : undefined}
            aria-hidden="true"
          />
        </button>

        {openSection === 'notifications' ? (
          <div className="settings-collapse__body">
            <div className="settings-form-grid">
              <label className="settings-field-wide">
                Panel del telefono
                <div className="settings-inline-control">
                  <div>
                    <strong>
                      {data.settings.deviceNotificationsEnabled
                        ? 'Activadas'
                        : 'Desactivadas'}
                    </strong>
                    <span>
                      Requiere permiso del navegador. Sin backend no se garantizan
                      avisos exactos con la app completamente cerrada.
                    </span>
                  </div>
                  <Button
                    variant={data.settings.deviceNotificationsEnabled ? 'secondary' : 'primary'}
                    onClick={() =>
                      data.settings.deviceNotificationsEnabled
                        ? updateSettings({ deviceNotificationsEnabled: false })
                        : void enableDeviceNotifications()
                    }
                  >
                    {data.settings.deviceNotificationsEnabled
                      ? 'Desactivar'
                      : 'Activar'}
                  </Button>
                </div>
              </label>

              <label>
                <Droplets size={16} aria-hidden="true" />
                Vaso
                <div className="settings-number-suffix">
                  <input
                    type="number"
                    min="1"
                    value={data.settings.hydrationGlassMl ?? 250}
                    onChange={(event) =>
                      updateSettings({
                        hydrationGlassMl: Number(event.target.value),
                      })
                    }
                  />
                  <span>ml</span>
                </div>
              </label>

              <label>
                <Droplets size={16} aria-hidden="true" />
                Botella
                <div className="settings-number-suffix">
                  <input
                    type="number"
                    min="1"
                    value={data.settings.hydrationBottleMl ?? 600}
                    onChange={(event) =>
                      updateSettings({
                        hydrationBottleMl: Number(event.target.value),
                      })
                    }
                  />
                  <span>ml</span>
                </div>
              </label>

              <label>
                Movimiento
                <div className="settings-number-suffix">
                  <input
                    type="number"
                    min="10"
                    value={data.settings.movementReminderMinutes ?? 55}
                    onChange={(event) =>
                      updateSettings({
                        movementReminderMinutes: Number(event.target.value),
                      })
                    }
                  />
                  <span>min</span>
                </div>
              </label>

              <label>
                Silencio inicia
                <input
                  type="time"
                  value={data.settings.notificationQuietStart ?? '22:30'}
                  onChange={(event) =>
                    updateSettings({
                      notificationQuietStart: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Silencio termina
                <input
                  type="time"
                  value={data.settings.notificationQuietEnd ?? '07:00'}
                  onChange={(event) =>
                    updateSettings({
                      notificationQuietEnd: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <div className="settings-notification-toggles">
              {[
                ['general', 'Generales'],
                ['habits', 'Habitos'],
                ['movement', 'Movimiento'],
                ['hydration', 'Agua'],
                ['meals', 'Comidas'],
                ['work', 'Trabajo'],
                ['study', 'Estudio'],
                ['finance', 'Finanzas'],
                ['sleep', 'Sueno'],
              ].map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={data.settings.notificationPreferences?.[key as keyof NonNullable<typeof data.settings.notificationPreferences>] ?? true}
                    onChange={(event) =>
                      updateSettings({
                        notificationPreferences: {
                          general: true,
                          habits: true,
                          movement: true,
                          hydration: true,
                          meals: true,
                          work: true,
                          study: true,
                          finance: true,
                          sleep: true,
                          ...data.settings.notificationPreferences,
                          [key]: event.target.checked,
                        },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="settings-collapse">
        <button
          type="button"
          className="settings-collapse__summary"
          aria-expanded={
            openSection === 'security'
          }
          onClick={() =>
            toggleSection('security')
          }
        >
          <div className="settings-collapse__identity">
            <span className="settings-collapse__icon tone-blue">
              <ShieldCheck
                size={17}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>Privacidad y bloqueo</strong>

              <span>
                {data.settings.lockEnabled
                  ? 'PIN local activado'
                  : 'Protección local opcional'}
              </span>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={
              openSection === 'security'
                ? 'is-open'
                : undefined
            }
            aria-hidden="true"
          />
        </button>

        {openSection === 'security' ? (
          <div className="settings-collapse__body">
            <p className="settings-helper">
              El PIN protege el acceso local. No
              reemplaza la seguridad de un servidor
              y no tiene recuperación remota.
            </p>

            {!data.settings.lockEnabled ? (
              <div className="settings-pin-row">
                <input
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value)
                  }
                  type="password"
                  inputMode="numeric"
                  placeholder="Nuevo PIN"
                  aria-label="Nuevo PIN"
                />

                <Button
                  onClick={() => void enablePin()}
                  disabled={pin.length < 4}
                >
                  Activar
                </Button>
              </div>
            ) : (
              <div className="settings-security-active">
                <div>
                  <Lock
                    size={17}
                    aria-hidden="true"
                  />

                  <span>
                    El bloqueo por PIN está activo.
                  </span>
                </div>

                <Button
                  variant="secondary"
                  onClick={() =>
                    void disablePin()
                  }
                >
                  Desactivar PIN
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="settings-collapse">
        <button
          type="button"
          className="settings-collapse__summary"
          aria-expanded={openSection === 'backup'}
          onClick={() => toggleSection('backup')}
        >
          <div className="settings-collapse__identity">
            <span className="settings-collapse__icon tone-green">
              <Database
                size={17}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                Respaldos y restauración
              </strong>

              <span>
                Último respaldo: {lastBackup}
              </span>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={
              openSection === 'backup'
                ? 'is-open'
                : undefined
            }
            aria-hidden="true"
          />
        </button>

        {openSection === 'backup' ? (
          <div className="settings-collapse__body">
            <label>
              Contraseña opcional

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Para exportar o importar cifrado"
              />
            </label>

            <div className="settings-backup-actions">
              <Button
                onClick={() =>
                  void exportBackup(false)
                }
                icon={
                  <Download
                    size={16}
                    aria-hidden="true"
                  />
                }
              >
                Exportar JSON
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  void exportBackup(true)
                }
                disabled={!password}
                icon={
                  <Lock
                    size={16}
                    aria-hidden="true"
                  />
                }
              >
                Cifrado
              </Button>
            </div>

            <label className="settings-file-field">
              Importar respaldo

              <input
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  const file =
                    event.target.files?.[0]

                  if (file) {
                    void readImportFile(file)
                  }
                }}
              />
            </label>

            {preview ? (
              <div className="settings-backup-preview">
                <div>
                  <strong>
                    Respaldo encontrado
                  </strong>

                  <span>
                    {preview.deviceName} ·{' '}
                    {Object.values(
                      preview.entityCounts,
                    ).reduce(
                      (sum, count) =>
                        sum + count,
                      0,
                    )}{' '}
                    registros
                  </span>
                </div>

                <div className="settings-backup-restore">
                  <Button
                    onClick={() =>
                      void restoreBackup(
                        'replace',
                      )
                    }
                  >
                    Reemplazar
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() =>
                      void restoreBackup('merge')
                    }
                  >
                    Combinar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="settings-collapse">
        <button
          type="button"
          className="settings-collapse__summary"
          aria-expanded={
            openSection === 'install'
          }
          onClick={() =>
            toggleSection('install')
          }
        >
          <div className="settings-collapse__identity">
            <span className="settings-collapse__icon tone-violet">
              <Smartphone
                size={17}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>Instalar aplicación</strong>

              <span>
                Acceso rápido desde teléfono o PC
              </span>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={
              openSection === 'install'
                ? 'is-open'
                : undefined
            }
            aria-hidden="true"
          />
        </button>

        {openSection === 'install' ? (
          <div className="settings-collapse__body">
            <div className="settings-install-list">
              <article>
                <strong>Android · Chrome</strong>

                <span>
                  Menú del navegador → Instalar
                  aplicación.
                </span>
              </article>

              <article>
                <strong>iPhone · Safari</strong>

                <span>
                  Compartir → Agregar a pantalla de
                  inicio.
                </span>
              </article>

              <article>
                <strong>Computadora</strong>

                <span>
                  Chrome o Edge → icono de
                  instalación en la barra.
                </span>
              </article>

              <article>
                <strong>Uso sin conexión</strong>

                <span>
                  Después de la primera carga, los
                  recursos internos quedan
                  almacenados por el service worker.
                </span>
              </article>
            </div>
          </div>
        ) : null}
      </section>

      <section className="settings-collapse settings-danger-collapse">
        <button
          type="button"
          className="settings-collapse__summary"
          aria-expanded={openSection === 'danger'}
          onClick={() => toggleSection('danger')}
        >
          <div className="settings-collapse__identity">
            <span className="settings-collapse__icon tone-red">
              <Trash2
                size={17}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>Zona de riesgo</strong>

              <span>
                Reiniciar todos los datos locales
              </span>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={
              openSection === 'danger'
                ? 'is-open'
                : undefined
            }
            aria-hidden="true"
          />
        </button>

        {openSection === 'danger' ? (
          <div className="settings-collapse__body">
            <div className="settings-danger-box">
              <div>
                <strong>
                  Reiniciar Control Personal
                </strong>

                <p>
                  Elimina los datos locales de esta
                  aplicación en este navegador.
                  Esta acción requiere confirmación
                  escrita.
                </p>
              </div>

              <Button
                variant="danger"
                onClick={() =>
                  setConfirmReset(true)
                }
              >
                Reiniciar datos
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {confirmReset ? (
        <ConfirmReset
          value={resetPhrase}
          onChange={setResetPhrase}
          onCancel={() => {
            setConfirmReset(false)
            setResetPhrase('')
          }}
          onConfirm={async () => {
            if (resetPhrase !== 'ELIMINAR') {
              return
            }

            await resetAll()

            setConfirmReset(false)
            setResetPhrase('')
          }}
        />
      ) : null}
    </section>
  )
}

function ConfirmReset({
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <>
      <ConfirmDialog
        open
        title="Confirmar reinicio"
        message="Antes de confirmar escribe ELIMINAR en el campo visible."
        confirmLabel="Reiniciar datos"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />

      <div
        className="modal-backdrop secondary-confirm"
        aria-live="polite"
      >
        <label className="confirm-phrase">
          Confirmación escrita

          <input
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            placeholder="ELIMINAR"
            autoFocus
          />
        </label>
      </div>
    </>
  )
}
