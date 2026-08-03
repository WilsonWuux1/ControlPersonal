# Convenciones del proyecto

- Mantener TypeScript sin `any` explicito.
- No agregar backend, APIs externas, CDN, analitica ni dependencias que requieran internet en produccion.
- Guardar datos principales solo en IndexedDB por Dexie.
- Usar `HashRouter` para que GitHub Pages no falle al recargar rutas.
- Validar formularios nuevos con Zod y React Hook Form.
- Confirmar acciones destructivas con `ConfirmDialog`.
- Mantener UI mobile-first, sin scroll horizontal accidental.
- Antes de cerrar cambios, ejecutar `npm run lint`, `npm run test`, `npm run build` y, cuando aplique, `npm run test:e2e`.
