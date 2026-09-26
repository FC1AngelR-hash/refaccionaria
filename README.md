# Refaccionaria

## Local
1. En Supabase SQL Editor ejecuta `supabase/schema.sql`.
2. Copia `backend/.env.example` a `backend/.env` y pega URL + anon + service_role.
3. En Auth de Supabase puedes desactivar confirmación de email para pruebas.
4. `cd backend && npm i && npm start`
5. Copia `frontend/.env.example` a `frontend/.env`
6. `cd frontend && npm i && npm run dev`

## Render
1. Sube el repo a GitHub.
2. En Render: New + Blueprint y selecciona este repo (`render.yaml`).
3. Completa variables:
   - API: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL` (URL del static).
   - Web: `VITE_API_URL` (URL del servicio API, sin slash final).
4. Redeploy del frontend después de tener la URL real de la API.
