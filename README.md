# Control Personal

Aplicacion personal, local-first y offline para gestionar habitos, trabajo, bienestar, finanzas, progreso, motivacion y respaldos. No usa backend, Firebase, Supabase, analitica ni APIs externas. Los datos principales se guardan en IndexedDB mediante Dexie y cada dispositivo mantiene su propia informacion.

## Arquitectura

- `src/app`, `src/layouts`, `src/routes`: shell, navegacion con `HashRouter`, layout desktop/mobile y pagina 404.
- `src/features`: modulos de Hoy, Habitos, Trabajo, Bienestar, Finanzas, Progreso, Motivacion y Configuracion.
- `src/db`: Dexie, tablas, seed inicial, repositorios y reemplazo de datos.
- `src/services`: calculos financieros, puntuacion de habitos, tiempo, cifrado local y respaldos.
- `src/stores`: Zustand para datos cargados, acciones y toasts.
- `src/components`: botones, modales, confirmaciones, onboarding, bloqueo local y registros rapidos.
- `e2e`: pruebas Playwright principales.

## Tecnologias

React, Vite, TypeScript, React Router HashRouter, Dexie.js, Zustand, React Hook Form, Zod, Recharts, TanStack Table, date-fns, Lucide React, vite-plugin-pwa, Vitest, React Testing Library y Playwright.

## Instalacion y ejecucion

```bash
npm install
npm run dev
npm run lint
npm run test
npm run test:e2e
npm run build
npm run preview
```

En Windows PowerShell con scripts bloqueados, usa `npm.cmd run <script>`.

## PWA y uso offline

La app genera manifest y service worker con `vite-plugin-pwa`. Despues de la primera carga, los recursos internos quedan cacheados y la navegacion funciona offline. La seccion Configuracion incluye instrucciones para instalar en Chrome Android, Safari iPhone y Chrome/Edge de escritorio.

## Respaldos y transferencia entre dispositivos

No existe sincronizacion automatica. Para pasar informacion entre telefono y computadora:

1. En el dispositivo origen, ve a Configuracion y exporta un respaldo JSON o cifrado.
2. Mueve el archivo manualmente al otro dispositivo.
3. En el dispositivo destino, importa el respaldo y elige reemplazar o combinar.

El respaldo incluye version de esquema, fecha, dispositivo, configuracion, registros y conteos por entidad. Si borras datos del navegador, IndexedDB puede eliminarse; conserva respaldos recientes.

## GitHub Pages

El proyecto esta preparado para Pages con `HashRouter` y `VITE_BASE_PATH`. El workflow `.github/workflows/deploy-pages.yml` calcula automaticamente el base path:

- Repositorio `usuario.github.io`: usa `/`.
- Cualquier otro repositorio: usa `/<nombre-del-repositorio>/`.

Para publicar:

1. Sube el proyecto a GitHub.
2. Activa Pages con GitHub Actions en Settings > Pages.
3. Haz push a `main`.
4. El workflow ejecuta lint, pruebas unitarias, build, pruebas Playwright y despliega `dist`.

## Cambiar nombre y logo

- Nombre visible: busca `Control Personal` en `src`, `vite.config.ts` y `index.html`.
- Iconos: reemplaza `public/app-icon.svg` y `public/favicon.svg`.
- Colores base: ajusta variables en `src/styles/app.css`.

## Limitaciones reales

- Los datos son locales por navegador y dispositivo.
- Los enlaces motivacionales externos requieren internet.
- El PIN protege privacidad local, pero no reemplaza seguridad de servidor.
- No se cifra toda IndexedDB; solo los respaldos cifrados usan Web Crypto AES-GCM.
