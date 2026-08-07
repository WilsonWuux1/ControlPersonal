import { useState } from 'react'
import {
  Archive,
  ArrowUp,
  BookHeart,
  ExternalLink,
  FileText,
  Heart,
  Link2,
  MoreHorizontal,
  Plus,
  Quote,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { useAppStore } from '../../stores/appStore'
import type {
  AppData,
  MotivationLink,
} from '../../types/domain'

type MotivationSection =
  | 'principles'
  | 'library'
  | 'archived'
  | null

type AddMode = 'principle' | 'link' | 'note'

type PrincipleItem = AppData['principles'][number]

export function MotivationPage() {
  const data = useAppStore((state) => state.data)
  const addPrinciple = useAppStore(
    (state) => state.addPrinciple,
  )
  const updatePrinciple = useAppStore(
    (state) => state.updatePrinciple,
  )
  const addMotivationLink = useAppStore(
    (state) => state.addMotivationLink,
  )
  const updateMotivationLink = useAppStore(
    (state) => state.updateMotivationLink,
  )
  const deleteMotivationLink = useAppStore(
    (state) => state.deleteMotivationLink,
  )

  const [openSection, setOpenSection] =
    useState<MotivationSection>('principles')
  const [showAddModal, setShowAddModal] =
    useState(false)
  const [addMode, setAddMode] =
    useState<AddMode>('principle')

  const [principle, setPrinciple] = useState('')
  const [editingPrinciple, setEditingPrinciple] =
    useState<PrincipleItem | null>(null)

  const [linkTitle, setLinkTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')

  const [deletingLink, setDeletingLink] =
    useState<MotivationLink | null>(null)

  if (!data) return null

  const activePrinciples = data.principles
    .filter((item) => item.status === 'active')
    .toSorted((a, b) => a.order - b.order)

  const archivedPrinciples = data.principles
    .filter((item) => item.status === 'archived')
    .toSorted((a, b) => a.order - b.order)

  const favoritePrinciples = activePrinciples.filter(
    (item) => item.favorite,
  )

  const favoriteLinks = data.motivationLinks.filter(
    (item) => item.favorite,
  )

  const offlineNotes = data.motivationLinks.filter(
    (item) => item.localNote,
  )

  const toggleSection = (
    section: Exclude<MotivationSection, null>,
  ) => {
    setOpenSection((current) =>
      current === section ? null : section,
    )
  }

  const openCreateModal = (mode: AddMode) => {
    setEditingPrinciple(null)
    setPrinciple('')
    setAddMode(mode)
    setShowAddModal(true)
  }

  const openEditPrinciple = (
    item: PrincipleItem,
  ) => {
    setEditingPrinciple(item)
    setPrinciple(item.text)
    setAddMode('principle')
    setShowAddModal(true)
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    setEditingPrinciple(null)
    setPrinciple('')
    setLinkTitle('')
    setUrl('')
    setNote('')
  }

  const savePrinciple = async () => {
    const text = principle.trim()
    if (!text) return

    if (editingPrinciple) {
      await updatePrinciple({
        ...editingPrinciple,
        text,
      })
    } else {
      await addPrinciple({
        text,
        favorite: false,
        order: data.principles.length + 1,
        status: 'active',
      })
    }

    closeAddModal()
  }

  const saveExternalLink = async () => {
    const cleanUrl = url.trim()
    if (!cleanUrl) return

    await addMotivationLink({
      title:
        linkTitle.trim() ||
        'Enlace motivacional',
      url: cleanUrl,
      platform: 'Externo',
      category: 'Motivacion',
      favorite: false,
      localNote: false,
      personalNote:
        'Requiere conexión a internet.',
    })

    closeAddModal()
  }

  const saveOfflineNote = async () => {
    const cleanNote = note.trim()
    if (!cleanNote) return

    await addMotivationLink({
      title: 'Nota personal',
      category: 'Nota local',
      favorite: false,
      localNote: true,
      personalNote: cleanNote,
    })

    closeAddModal()
  }

  return (
    <section className="page motivation-mobile-page">
      <header className="motivation-page-header">
        <div>
          <p>Ideas, recordatorios y recursos</p>
           
        </div>

        <Button
          onClick={() =>
            openCreateModal('principle')
          }
          icon={<Plus size={17} aria-hidden="true" />}
        >
          Agregar
        </Button>
      </header>

      <div
        className="motivation-summary-grid"
        aria-label="Resumen de motivación"
      >
        <article className="motivation-summary-card tone-blue">
          <Quote size={17} aria-hidden="true" />
          <span>Principios</span>
          <strong>{activePrinciples.length}</strong>
        </article>

        <article className="motivation-summary-card tone-red">
          <Heart size={17} aria-hidden="true" />
          <span>Favoritos</span>
          <strong>
            {favoritePrinciples.length +
              favoriteLinks.length}
          </strong>
        </article>

        <article className="motivation-summary-card tone-green">
          <FileText size={17} aria-hidden="true" />
          <span>Notas offline</span>
          <strong>{offlineNotes.length}</strong>
        </article>
      </div>

      <section className="motivation-quick-create">
        <button
          type="button"
          onClick={() =>
            openCreateModal('principle')
          }
        >
          <Quote size={18} aria-hidden="true" />
          <span>Principio</span>
        </button>

        <button
          type="button"
          onClick={() => openCreateModal('link')}
        >
          <Link2 size={18} aria-hidden="true" />
          <span>Enlace</span>
        </button>

        <button
          type="button"
          onClick={() => openCreateModal('note')}
        >
          <FileText size={18} aria-hidden="true" />
          <span>Nota offline</span>
        </button>
      </section>

      <section className="motivation-collapse">
        <button
          type="button"
          className="motivation-collapse__summary"
          aria-expanded={
            openSection === 'principles'
          }
          onClick={() =>
            toggleSection('principles')
          }
        >
          <div>
            <strong>Principios personales</strong>
            <span>
              Frases que guían tus decisiones
            </span>
          </div>

          <div className="motivation-collapse__end">
            <span className="motivation-count">
              {activePrinciples.length}
            </span>

            <MoreHorizontal
              size={18}
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'principles' ? (
          <div className="motivation-collapse__body">
            <div className="motivation-principle-list">
              {activePrinciples.map((item) => (
                <article
                  className="motivation-principle-card"
                  key={item.id}
                >
                  <span className="motivation-principle-icon">
                    <Quote
                      size={17}
                      aria-hidden="true"
                    />
                  </span>

                  <p>{item.text}</p>

                  <div className="motivation-card-actions">
                    <button
                      type="button"
                      className={
                        item.favorite
                          ? 'is-favorite'
                          : undefined
                      }
                      aria-label={
                        item.favorite
                          ? `Quitar "${item.text}" de favoritos`
                          : `Marcar "${item.text}" como favorito`
                      }
                      title={
                        item.favorite
                          ? 'Quitar de favoritos'
                          : 'Marcar como favorito'
                      }
                      onClick={() =>
                        updatePrinciple({
                          ...item,
                          favorite:
                            !item.favorite,
                        })
                      }
                    >
                      <Heart
                        size={16}
                        fill={
                          item.favorite
                            ? 'currentColor'
                            : 'none'
                        }
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      aria-label={`Editar principio: ${item.text}`}
                      title="Editar"
                      onClick={() =>
                        openEditPrinciple(item)
                      }
                    >
                      <FileText
                        size={16}
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      aria-label={`Subir principio: ${item.text}`}
                      title="Subir"
                      disabled={item.order <= 1}
                      onClick={() =>
                        updatePrinciple({
                          ...item,
                          order: Math.max(
                            1,
                            item.order - 1,
                          ),
                        })
                      }
                    >
                      <ArrowUp
                        size={16}
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      aria-label={`Archivar principio: ${item.text}`}
                      title="Archivar"
                      onClick={() =>
                        updatePrinciple({
                          ...item,
                          status: 'archived',
                        })
                      }
                    >
                      <Archive
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </article>
              ))}

              {activePrinciples.length === 0 ? (
                <div className="motivation-empty">
                  <Quote
                    size={22}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      No hay principios activos
                    </strong>

                    <span>
                      Agrega una frase que quieras
                      recordar cada día.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="motivation-collapse">
        <button
          type="button"
          className="motivation-collapse__summary"
          aria-expanded={
            openSection === 'library'
          }
          onClick={() => toggleSection('library')}
        >
          <div>
            <strong>Biblioteca motivacional</strong>
            <span>
              Enlaces externos y notas locales
            </span>
          </div>

          <div className="motivation-collapse__end">
            <span className="motivation-count">
              {data.motivationLinks.length}
            </span>

            <BookHeart
              size={18}
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'library' ? (
          <div className="motivation-collapse__body">
            <div className="motivation-library-list">
              {data.motivationLinks.map((link) => (
                <article
                  className="motivation-library-card"
                  key={link.id}
                >
                  <div className="motivation-library-card__main">
                    <span
                      className={`motivation-library-icon ${
                        link.localNote
                          ? 'is-local'
                          : 'is-link'
                      }`}
                    >
                      {link.localNote ? (
                        <FileText
                          size={17}
                          aria-hidden="true"
                        />
                      ) : (
                        <ExternalLink
                          size={17}
                          aria-hidden="true"
                        />
                      )}
                    </span>

                    <div>
                      <strong>{link.title}</strong>

                      <span>
                        {link.localNote
                          ? link.personalNote ||
                            'Nota local'
                          : link.personalNote ||
                            'Requiere conexión a internet'}
                      </span>
                    </div>
                  </div>

                  <div className="motivation-library-card__footer">
                    <span
                      className={`motivation-type-badge ${
                        link.localNote
                          ? 'is-local'
                          : 'is-external'
                      }`}
                    >
                      {link.localNote
                        ? 'Offline'
                        : 'Externo'}
                    </span>

                    <div className="motivation-card-actions">
                      {link.url ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Abrir ${link.title}`}
                          title="Abrir enlace"
                        >
                          <ExternalLink
                            size={16}
                            aria-hidden="true"
                          />
                        </a>
                      ) : null}

                      <button
                        type="button"
                        className={
                          link.favorite
                            ? 'is-favorite'
                            : undefined
                        }
                        aria-label={
                          link.favorite
                            ? `Quitar ${link.title} de favoritos`
                            : `Marcar ${link.title} como favorito`
                        }
                        title={
                          link.favorite
                            ? 'Quitar de favoritos'
                            : 'Marcar como favorito'
                        }
                        onClick={() =>
                          updateMotivationLink({
                            ...link,
                            favorite:
                              !link.favorite,
                          })
                        }
                      >
                        <Heart
                          size={16}
                          fill={
                            link.favorite
                              ? 'currentColor'
                              : 'none'
                          }
                          aria-hidden="true"
                        />
                      </button>

                      <button
                        type="button"
                        className="is-danger"
                        aria-label={`Eliminar ${link.title}`}
                        title="Eliminar"
                        onClick={() =>
                          setDeletingLink(link)
                        }
                      >
                        <Trash2
                          size={16}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {data.motivationLinks.length === 0 ? (
                <div className="motivation-empty">
                  <BookHeart
                    size={22}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      Tu biblioteca está vacía
                    </strong>

                    <span>
                      Guarda una nota offline o un
                      enlace motivacional.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {archivedPrinciples.length > 0 ? (
        <section className="motivation-collapse">
          <button
            type="button"
            className="motivation-collapse__summary"
            aria-expanded={
              openSection === 'archived'
            }
            onClick={() =>
              toggleSection('archived')
            }
          >
            <div>
              <strong>Principios archivados</strong>
              <span>
                Puedes restaurarlos cuando vuelvan
                a aplicar
              </span>
            </div>

            <div className="motivation-collapse__end">
              <span className="motivation-count">
                {archivedPrinciples.length}
              </span>

              <Archive
                size={18}
                aria-hidden="true"
              />
            </div>
          </button>

          {openSection === 'archived' ? (
            <div className="motivation-collapse__body">
              <div className="motivation-archived-list">
                {archivedPrinciples.map((item) => (
                  <article
                    className="motivation-archived-row"
                    key={item.id}
                  >
                    <p>{item.text}</p>

                    <Button
                      variant="secondary"
                      aria-label={`Restaurar principio: ${item.text}`}
                      onClick={() =>
                        updatePrinciple({
                          ...item,
                          status: 'active',
                        })
                      }
                      icon={
                        <RotateCcw
                          size={15}
                          aria-hidden="true"
                        />
                      }
                    >
                      Restaurar
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <Modal
        title={
          editingPrinciple
            ? 'Editar principio'
            : 'Agregar motivación'
        }
        open={showAddModal}
        onClose={closeAddModal}
      >
        <div className="motivation-form">
          {!editingPrinciple ? (
            <div
              className="motivation-form-tabs"
              role="tablist"
              aria-label="Tipo de motivación"
            >
              <button
                type="button"
                className={
                  addMode === 'principle'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  addMode === 'principle'
                }
                onClick={() =>
                  setAddMode('principle')
                }
              >
                Principio
              </button>

              <button
                type="button"
                className={
                  addMode === 'link'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={addMode === 'link'}
                onClick={() => setAddMode('link')}
              >
                Enlace
              </button>

              <button
                type="button"
                className={
                  addMode === 'note'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={addMode === 'note'}
                onClick={() => setAddMode('note')}
              >
                Nota offline
              </button>
            </div>
          ) : null}

          {addMode === 'principle' ? (
            <label>
              {editingPrinciple
                ? 'Texto del principio'
                : 'Nuevo principio'}

              <textarea
                rows={4}
                value={principle}
                onChange={(event) =>
                  setPrinciple(event.target.value)
                }
                placeholder="Escribe una idea que quieras recordar..."
              />
            </label>
          ) : null}

          {addMode === 'link' ? (
            <>
              <label>
                Título

                <input
                  value={linkTitle}
                  onChange={(event) =>
                    setLinkTitle(event.target.value)
                  }
                  placeholder="Ej. Video para recuperar el ánimo"
                />
              </label>

              <label>
                Enlace externo

                <input
                  type="url"
                  value={url}
                  onChange={(event) =>
                    setUrl(event.target.value)
                  }
                  placeholder="https://..."
                />
              </label>

              <p className="motivation-form-note">
                Los enlaces externos requieren
                conexión a internet.
              </p>
            </>
          ) : null}

          {addMode === 'note' ? (
            <label>
              Nota local offline

              <textarea
                rows={5}
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="Escribe algo que puedas leer incluso sin internet..."
              />
            </label>
          ) : null}

          <div className="motivation-form-actions">
            <Button
              onClick={() => {
                if (addMode === 'principle') {
                  void savePrinciple()
                }

                if (addMode === 'link') {
                  void saveExternalLink()
                }

                if (addMode === 'note') {
                  void saveOfflineNote()
                }
              }}
              disabled={
                addMode === 'principle'
                  ? !principle.trim()
                  : addMode === 'link'
                    ? !url.trim()
                    : !note.trim()
              }
            >
              {editingPrinciple
                ? 'Guardar cambios'
                : 'Guardar'}
            </Button>

            <Button
              variant="ghost"
              onClick={closeAddModal}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingLink)}
        title="Eliminar motivación"
        message={`Se eliminará "${
          deletingLink?.title ?? ''
        }" de tu biblioteca motivacional.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingLink(null)}
        onConfirm={() => {
          if (deletingLink) {
            void deleteMotivationLink(
              deletingLink.id,
            )
          }

          setDeletingLink(null)
        }}
      />
    </section>
  )
}