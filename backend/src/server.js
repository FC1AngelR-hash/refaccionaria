import "dotenv/config";
import express from "express";
import cors from "cors";
import { supabase, supabaseAdmin } from "./db.js";
import { requireAuth, requireAdmin, obtenerPerfil } from "./auth.js";

const app = express();
app.set("trust proxy", 1);

// CORS: FRONTEND_URL puede ser una o varias URLs separadas por coma (con o sin "/" final).
const origenes = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origenes.length === 0) return cb(null, true);
      if (origenes.includes(origin)) return cb(null, true);
      if (/^https?:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      cb(null, false);
    },
  })
);
app.use(express.json());

// Colapsa "//api/..." en "/api/..." (evita 404 si la URL base termina en "/").
app.use((req, _res, next) => {
  req.url = req.url.replace(/^\/{2,}/, "/");
  next();
});

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/", (_req, res) => res.json({ servicio: "refaccionaria-api", ok: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---------- Auth ----------
app.post(
  "/api/auth/register",
  h(async (req, res) => {
    const { email, password, nombre } = req.body || {};
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: "email, password y nombre son requeridos" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (error) return res.status(400).json({ error: error.message });

    let perfil = null;
    if (data.user) {
      // El rol NUNCA viene del cliente: se crea siempre como "cliente" (default en la BD).
      await supabaseAdmin.from("perfiles").upsert({ id: data.user.id, email, nombre });
      perfil = await obtenerPerfil(data.user);
    }
    res.status(201).json({
      user: data.user,
      session: data.session,
      perfil,
      message: data.session
        ? "Cuenta creada"
        : "Cuenta creada. Confirma el correo si Supabase lo pide y luego inicia sesión.",
    });
  })
);

app.post(
  "/api/auth/login",
  h(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const perfil = await obtenerPerfil(data.user);
    res.json({ user: data.user, session: data.session, perfil });
  })
);

app.get(
  "/api/me",
  requireAuth,
  h(async (req, res) => {
    res.json({
      user: { id: req.user.id, email: req.user.email },
      perfil: req.perfil,
      rol: req.rol,
    });
  })
);

// ---------- Usuarios (solo admin) ----------
app.get(
  "/api/usuarios",
  requireAuth,
  requireAdmin,
  h(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select("*")
      .order("creado_en", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  })
);

app.patch(
  "/api/usuarios/:id/rol",
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { rol } = req.body || {};
    if (!["admin", "cliente"].includes(rol)) {
      return res.status(400).json({ error: "rol debe ser 'admin' o 'cliente'" });
    }
    if (req.params.id === req.user.id && rol !== "admin") {
      return res.status(400).json({ error: "No puedes quitarte el rol de admin a ti mismo" });
    }
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .update({ rol })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  })
);

// ---------- Autos ----------
app.get(
  "/api/autos",
  requireAuth,
  h(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from("autos")
      .select("*")
      .order("creado_en", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  })
);

app.post(
  "/api/autos",
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { marca, modelo, anio, placas } = req.body || {};
    if (!marca || !modelo) return res.status(400).json({ error: "marca y modelo son requeridos" });
    const { data, error } = await supabaseAdmin
      .from("autos")
      .insert({
        marca,
        modelo,
        anio: anio ? Number(anio) || null : null,
        placas: placas || null,
        creado_por: req.user.id,
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  })
);

app.delete(
  "/api/autos/:id",
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { error } = await supabaseAdmin.from("autos").delete().eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  })
);

// ---------- Piezas ----------
app.get(
  "/api/piezas",
  requireAuth,
  h(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from("piezas")
      .select("*, autos(marca, modelo)")
      .order("creado_en", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  })
);

app.post(
  "/api/piezas",
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { nombre, sku, precio, stock, auto_id } = req.body || {};
    if (!nombre) return res.status(400).json({ error: "nombre es requerido" });
    const { data, error } = await supabaseAdmin
      .from("piezas")
      .insert({
        nombre,
        sku: sku || null,
        precio: Number(precio) || 0,
        stock: Number(stock) || 0,
        auto_id: auto_id || null,
        creado_por: req.user.id,
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  })
);

app.delete(
  "/api/piezas/:id",
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { error } = await supabaseAdmin.from("piezas").delete().eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  })
);

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`API en puerto ${port}`));
