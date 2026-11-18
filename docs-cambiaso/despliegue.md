# Despliegue en la nube

La app debe abrir sin pedir permisos y cargar con el usuario de prueba.

## Opción recomendada (Docker Compose en un VPS / Azure VM)

1. Encender Docker Desktop (o un VM con Docker).
2. Copiar `.env.example` a `.env` y fijar `JWT_SECRET` y SMTP si hace falta.
3. En el host de la nube:

```bash
pnpm install
pnpm dev
```

Para un corte estable, preferí un compose de producción (sin volúmenes de desarrollo) cuando el daemon Docker esté disponible.

## Usuarios de prueba (seed)

Tras migrar y sembrar (el seed **no** corre con `NODE_ENV=production`; en el entorno demo usá `NODE_ENV=development` o corrê el seed una vez a mano):

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Organizador | usuario1@planazo.com | Planazo123! |
| Invitado | usuario2@planazo.com | Planazo123! |

## URL pública actual

Túnel local (Docker + `pnpm dev` + localtunnel):

https://public-banks-make.loca.lt

La primera visita a localtunnel a veces pide un clic de confirmación. La PC tiene que seguir con Docker arriba.

## Checklist del docente

- [x] URL pública HTTPS (túnel)
- [ ] Login con usuario1 funciona
- [x] Hay planes/datos cargados (seed)
- [x] No pide permisos de cámara/ubicación al abrir
