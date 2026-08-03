import { useState } from 'react'
import { ExternalLink, Heart, Plus, Quote, Trash2 } from 'lucide-react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppStore } from '../../stores/appStore'
import type { MotivationLink } from '../../types/domain'

export function MotivationPage() {
  const data = useAppStore((state) => state.data)
  const addPrinciple = useAppStore((state) => state.addPrinciple)
  const updatePrinciple = useAppStore((state) => state.updatePrinciple)
  const addMotivationLink = useAppStore((state) => state.addMotivationLink)
  const updateMotivationLink = useAppStore((state) => state.updateMotivationLink)
  const deleteMotivationLink = useAppStore((state) => state.deleteMotivationLink)
  const [principle, setPrinciple] = useState('')
  const [note, setNote] = useState('')
  const [url, setUrl] = useState('')
  const [deletingLink, setDeletingLink] = useState<MotivationLink | null>(null)
  if (!data) return null

  return (
    <section className="page stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Principios personales</h2>
            <Quote size={20} />
          </div>
          <div className="inline-form">
            <input value={principle} onChange={(event) => setPrinciple(event.target.value)} placeholder="Nuevo principio" />
            <Button
              onClick={async () => {
                if (!principle.trim()) return
                await addPrinciple({ text: principle.trim(), favorite: false, order: data.principles.length + 1, status: 'active' })
                setPrinciple('')
              }}
              icon={<Plus size={18} />}
            >
              Crear
            </Button>
          </div>
          <div className="list">
            {data.principles
              .filter((item) => item.status === 'active')
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <article className="principle-row" key={item.id}>
                  <textarea value={item.text} onChange={(event) => updatePrinciple({ ...item, text: event.target.value })} />
                  <div className="actions">
                    <Button variant={item.favorite ? 'primary' : 'ghost'} onClick={() => updatePrinciple({ ...item, favorite: !item.favorite })} icon={<Heart size={16} />}>
                      Favorito
                    </Button>
                    <Button variant="ghost" onClick={() => updatePrinciple({ ...item, order: Math.max(0, item.order - 1) })}>
                      Subir
                    </Button>
                    <Button variant="ghost" onClick={() => updatePrinciple({ ...item, status: 'archived' })}>
                      Archivar
                    </Button>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Biblioteca motivacional</h2>
            <span>Los enlaces externos requieren internet.</span>
          </div>
          <div className="form-stack">
            <label>
              Enlace externo
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
            </label>
            <Button
              onClick={async () => {
                if (!url.trim()) return
                await addMotivationLink({ title: 'Enlace motivacional', url: url.trim(), platform: 'Externo', category: 'Motivacion', favorite: false, localNote: false, personalNote: 'Requiere conexion a internet.' })
                setUrl('')
              }}
            >
              Guardar enlace
            </Button>
            <label>
              Nota local offline
              <textarea value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!note.trim()) return
                await addMotivationLink({ title: 'Nota personal', category: 'Nota local', favorite: false, localNote: true, personalNote: note.trim() })
                setNote('')
              }}
            >
              Guardar nota offline
            </Button>
          </div>
          <div className="mobile-card-list">
            {data.motivationLinks.map((link) => (
              <article className="mobile-card" key={link.id}>
                <strong>{link.title}</strong>
                <span>{link.localNote ? link.personalNote : 'Requiere conexion a internet'}</span>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noreferrer">
                    Abrir <ExternalLink size={14} />
                  </a>
                ) : null}
                <div className="actions">
                  <Button variant={link.favorite ? 'primary' : 'ghost'} onClick={() => updateMotivationLink({ ...link, favorite: !link.favorite })} icon={<Heart size={16} />}>
                    Favorito
                  </Button>
                  <Button variant="ghost" onClick={() => setDeletingLink(link)} icon={<Trash2 size={16} />}>
                    Eliminar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(deletingLink)}
        title="Eliminar motivacion"
        message={`Se eliminara "${deletingLink?.title ?? ''}" de tu biblioteca motivacional.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingLink(null)}
        onConfirm={() => {
          if (deletingLink) void deleteMotivationLink(deletingLink.id)
          setDeletingLink(null)
        }}
      />
    </section>
  )
}
