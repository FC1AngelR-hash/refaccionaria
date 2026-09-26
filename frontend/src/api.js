const API = import.meta.env.VITE_API_URL || "https://refaccionaria-fp6g.onrender.com/";

export function getToken() {
  return localStorage.getItem("token");
}

export async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de API");
  return data;
}
