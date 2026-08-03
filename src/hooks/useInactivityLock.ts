import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

export const useInactivityLock = (): void => {
  const settings = useAppStore((state) => state.data?.settings)
  const lock = useAppStore((state) => state.lock)

  useEffect(() => {
    if (!settings?.lockEnabled) return undefined
    let timer = window.setTimeout(lock, settings.inactivityMinutes * 60_000)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(lock, settings.inactivityMinutes * 60_000)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    window.addEventListener('touchstart', reset)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
      window.removeEventListener('touchstart', reset)
    }
  }, [lock, settings?.inactivityMinutes, settings?.lockEnabled])
}
