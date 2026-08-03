import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from './Button'
import { useAppStore } from '../stores/appStore'
import { verifyPin } from '../services/cryptoService'

export function LockScreen() {
  const settings = useAppStore((state) => state.data?.settings)
  const unlock = useAppStore((state) => state.unlock)
  const addToast = useAppStore((state) => state.addToast)
  const [pin, setPin] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!settings?.lockSalt || !settings.lockVerifier) return
    if (await verifyPin(pin, settings.lockSalt, settings.lockVerifier)) {
      unlock()
      setPin('')
    } else {
      addToast({ title: 'PIN incorrecto', detail: 'Intenta de nuevo.', tone: 'danger' })
    }
  }

  return (
    <main className="lock-screen">
      <form onSubmit={submit} className="auth-panel">
        <Lock size={36} />
        <h1>Control Personal bloqueado</h1>
        <p>Proteccion local de privacidad. No existe recuperacion remota si olvidas el PIN.</p>
        <label>
          PIN
          <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoFocus />
        </label>
        <Button type="submit">Desbloquear</Button>
      </form>
    </main>
  )
}
