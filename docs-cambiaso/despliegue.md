# Despliegue en la nube

La app debe abrir sin pedir permisos y cargar con el usuario de prueba.

## URL pública actual (Render)

https://planazo-yhcd.onrender.com

- Health: https://planazo-yhcd.onrender.com/api/health → `{"status":"ok"}`
- Un solo servicio sirve API + SPA (cookies same-origin).
- Blueprint: `render.yaml` · imagen: `Dockerfile`
- El contenedor corre `prisma migrate deploy`, seed una vez con `NODE_ENV=development` y luego arranca en production.

En el plan free, el primer request tras idle puede tardar ~30–60 s.

## Usuarios de prueba (seed)

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Organizador | usuario1@planazo.com | Planazo123! |
| Invitado | usuario2@planazo.com | Planazo123! |

## Checklist del docente

- [x] URL pública HTTPS (Render)
- [x] `/api/health` responde ok
- [ ] Login con usuario1 funciona (verificar en el navegador)
- [x] Hay planes/datos cargados (seed en el arranque del contenedor)
- [x] No pide permisos de cámara/ubicación al abrir
