import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LockScreen } from './components/LockScreen'
import { Onboarding } from './components/Onboarding'
import { ToastHost } from './components/ToastHost'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { FinancesPage } from './features/finances/FinancesPage'
import { HabitsPage } from './features/habits/HabitsPage'
import { MotivationPage } from './features/motivation/MotivationPage'
import { ProgressPage } from './features/progress/ProgressPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { StudyPage } from './features/study/StudyPage'
import { WellbeingPage } from './features/wellbeing/WellbeingPage'
import { WorkPage } from './features/work/WorkPage'
import { useInactivityLock } from './hooks/useInactivityLock'
import { useAppStore } from './stores/appStore'
import { NotFound } from './routes/NotFound'

function App() {
  const data = useAppStore((state) => state.data)
  const loading = useAppStore((state) => state.loading)
  const locked = useAppStore((state) => state.locked)
  const load = useAppStore((state) => state.load)
  useInactivityLock()

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const theme = data?.settings.theme ?? 'system'
    document.documentElement.dataset.theme = theme
  }, [data?.settings.theme])

  if (loading || !data) {
    return (
      <main className="loading-screen">
        <div className="skeleton-card" />
        <div className="skeleton-grid">
          <span />
          <span />
          <span />
        </div>
      </main>
    )
  }

  if (!data.settings.onboardingCompleted) return <Onboarding />
  if (locked) return <LockScreen />

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="habitos" element={<HabitsPage />} />
            <Route path="trabajo" element={<WorkPage />} />
            <Route path="estudio" element={<StudyPage />} />
            <Route path="bienestar" element={<WellbeingPage />} />
            <Route path="finanzas" element={<FinancesPage />} />
            <Route path="progreso" element={<ProgressPage />} />
            <Route path="motivacion" element={<MotivationPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
            <Route path="404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <ToastHost />
    </ErrorBoundary>
  )
}

export default App
