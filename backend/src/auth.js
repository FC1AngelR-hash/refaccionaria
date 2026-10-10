import { supabaseAdmin } from "./db.js";

const emailsAdmin = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Devuelve el perfil del usuario (lo crea si falta) y asegura el rol admin para ADMIN_EMAILS. */
export async function obtenerPerfil(user) {
  let { data: perfil } = await supabaseAdmin
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) {
    const { data } = await supabaseAdmin
      .from("perfiles")
      .upsert({
        id: user.id,
        email: user.email,
        nombre: user.user_metadata?.nombre || (user.email || "usuario").split("@")[0],
      })
      .select()
      .single();
    perfil = data;
  }

  if (perfil && perfil.rol !== "admin" && emailsAdmin().includes((user.email || "").toLowerCase())) {
    const { data } = await supabaseAdmin
      .from("perfiles")
      .update({ rol: "admin" })
      .eq("id", user.id)
      .select()
      .single();
    if (data) perfil = data;
  }
  return perfil;
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Token requerido" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: "Sesión inválida o expirada" });

    req.user = data.user;
    req.perfil = await obtenerPerfil(data.user);
    req.rol = req.perfil?.rol === "admin" ? "admin" : "cliente";
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (req.rol !== "admin") {
    return res.status(403).json({ error: "Solo un administrador puede hacer esto" });
  }
  next();
}
