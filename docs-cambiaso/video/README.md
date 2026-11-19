# Video de la app · Planazo

## Archivo listo

- [`planazo-demo.webm`](planazo-demo.webm) — recorrido automático (login → planes → fechas/gastos → Mis datos / eliminar)

Reproducir: abrilo con el navegador o VLC.

## Regenerar (Playwright)

Con la app en http://localhost:5173:

```bash
pnpm exec playwright test tests/demo-video.spec.ts --project=chromium
```

Copiá el `video.webm` de `test-results/` sobre `planazo-demo.webm`.
