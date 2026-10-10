# Refaccionaria

Frontend React (Vite) + API Express + Supabase. Dos roles: **admin** (gestiona piezas, autos y usuarios) y **cliente** (consulta el catálogo).

## 1. Supabase
1. En el SQL Editor ejecuta `supabase/schema.sql` (es seguro volver a ejecutarlo; agrega la columna `rol`).
2. En Authentication > Providers > Email puedes desactivar "Confirm email" para pruebas.
3. Copia de Project Settings > API: `URL`, `anon key` y `service_role key`.

## 2. Local
```bash
cd backend && cp .env.example .env   # completa las llaves de Supabase
npm install && npm start
cd ../frontend && cp .env.example .env
npm install && npm run dev
```

## 3. Primer administrador
Regístrate en la app (queda como `cliente`) y haz una de estas dos cosas:
- Pon tu correo en `ADMIN_EMAILS` (variable de la API) y vuelve a iniciar sesión, o
- En Supabase SQL Editor: `update public.perfiles set rol = 'admin' where email = 'tu-correo@ejemplo.com';`

Después, desde la pestaña **usuarios** puedes promover a otros a admin.

## 4. GitHub + Render
```bash
git add -A && git commit -m "Corrige despliegue y agrega roles" && git push origin main
```
En Render: **New + > Blueprint**, elige el repo (usa `render.yaml`). Variables:
- **refaccionaria-api**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL` (URL del sitio estático, sin `/` final), `ADMIN_EMAILS`.
- **refaccionaria-web**: `VITE_API_URL` (URL de la API, sin `/` final).

`VITE_API_URL` se incrusta al compilar: si la cambias, haz **Manual Deploy > Clear build cache & deploy** en el sitio web.
Nunca subas los `.env` (ya están en `.gitignore`).
