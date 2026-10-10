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

## 4. GitHub + Render (un solo Web Service)
```bash
git add -A && git commit -m "Un solo servicio en Render" && git push origin main
```
En Render, en el Web Service:
- **Root Directory:** vacío
- **Build Command:** `npm --prefix frontend install && npm --prefix frontend run build && npm --prefix backend install`
- **Start Command:** `npm --prefix backend start`
- **Variables:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`.
  (`FRONTEND_URL` y `VITE_API_URL` ya no hacen falta: página y API comparten dirección.)

Nunca subas los `.env` (ya están en `.gitignore`).
