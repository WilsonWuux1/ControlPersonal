import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/Button'

export function NotFound() {
  return (
    <EmptyState
      title="Pantalla no encontrada"
      description="La ruta no existe o fue movida."
      action={
        <Link to="/">
          <Button>Volver a Hoy</Button>
        </Link>
      }
    />
  )
}
