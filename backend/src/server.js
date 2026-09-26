import "dotenv/config";
import express from "express";
import cors from "cors";
import { supabase, supabaseAdmin } from "./db.js";
import { requireAuth } from "./auth.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", async (req, res) => {
  const { email, password, nombre } = req.body;
  if (!email || !password || !nombre) {
    return res.status(400).json({ error: "email, password y nombre son requeridos" });
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } },
  });
  if (error) return res.status(400).json({ error: error.message });
  if (data.user) {
    await supabaseAdmin.from("perfiles").upsert({
      id: data.user.id,
      email,
      nombre,
    });
  }
  res.status(201).json({
    user: data.user,
    session: data.session,
    message: data.session
      ? "Cuenta creada"
      : "Cuenta creada. Confirma el correo si Supabase lo pide.",
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

app.get("/api/me", requireAuth, async (req, res) => {
  const { data } = await supabaseAdmin
    .from("perfiles")
    .select("*")
    .eq("id", req.user.id)
    .single();
  res.json({ user: req.user, perfil: data });
});

app.get("/api/usuarios", requireAuth, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("perfiles")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/autos", requireAuth, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("autos")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/autos", requireAuth, async (req, res) => {
  const { marca, modelo, anio, placas } = req.body;
  if (!marca || !modelo) return res.status(400).json({ error: "marca y modelo son requeridos" });
  const { data, error } = await supabaseAdmin
    .from("autos")
    .insert({ marca, modelo, anio, placas, creado_por: req.user.id })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.delete("/api/autos/:id", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from("autos").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.get("/api/piezas", requireAuth, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("piezas")
    .select("*, autos(marca, modelo)")
    .order("creado_en", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/piezas", requireAuth, async (req, res) => {
  const { nombre, sku, precio, stock, auto_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "nombre es requerido" });
  const { data, error } = await supabaseAdmin
    .from("piezas")
    .insert({
      nombre,
      sku,
      precio: Number(precio) || 0,
      stock: Number(stock) || 0,
      auto_id: auto_id || null,
      creado_por: req.user.id,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.delete("/api/piezas/:id", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from("piezas").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API en puerto ${port}`));
