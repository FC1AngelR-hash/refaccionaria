// Por defecto, en producción usa la misma dirección del sitio (la API sirve la página).
// Sin "/" final para no generar rutas como "//api/..." (causa de 404).
const API = (
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "")
).replace(/\/+$/, "");

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  localStorage.setItem("token", t);
}

export function logout() {
  localStorage.removeItem("token");
  window.location.reload();
}

export async function api(path, options = {}) {
  const token = getToken();
  const ruta = path.startsWith("/") ? path : `/${path}`;
  let res;
  try {
    res = await fetch(`${API}${ruta}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Si es el primer acceso, Render puede tardar cerca de un minuto en despertar; intenta de nuevo."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !ruta.startsWith("/api/auth/")) {
    localStorage.removeItem("token");
    const e = new Error("Tu sesión expiró. Inicia sesión de nuevo.");
    e.sesionExpirada = true;
    throw e;
  }
  if (!res.ok) throw new Error(data.error || `Error de API (${res.status})`);
  return data;
}
