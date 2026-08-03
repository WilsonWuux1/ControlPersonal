# Despliegue

## Local

```bash
npm install
npm run lint
npm run test
npm run build
npm run preview
```

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` se ejecuta en push a `main`.

Pasos:

1. Instala dependencias con `npm ci`.
2. Calcula `VITE_BASE_PATH` desde el nombre del repositorio.
3. Ejecuta lint.
4. Ejecuta pruebas unitarias.
5. Instala Chromium para Playwright.
6. Ejecuta build.
7. Ejecuta pruebas e2e.
8. Publica `dist` en Pages.

No hace falta editar manualmente el nombre del repositorio. Para repositorios `usuario.github.io` el base path es `/`; para otros, `/<repo>/`.
