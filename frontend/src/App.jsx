import { useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, logout } from "./api.js";

/* ---------------- Login / Registro ---------------- */
function Login({ onOk, aviso }) {
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", nombre: "" });
  const [error, setError] = useState(aviso || "");
  const [info, setInfo] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setCargando(true);
    try {
      const path = modo === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await api(path, { method: "POST", body: JSON.stringify(form) });
      if (!data.session?.access_token) {
        setInfo(data.message || "Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
        setModo("login");
        return;
      }
      setToken(data.session.access_token);
      onOk();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card auth">
      <h1>🔧 Refaccionaria</h1>
      <p className="muted">{modo === "login" ? "Inicia sesión" : "Crea tu cuenta de cliente"}</p>
      <form onSubmit={enviar}>
        {modo === "register" && (
          <input
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
        )}
        <input
          type="email"
          placeholder="Correo"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Contraseña (mín. 6 caracteres)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={6}
          required
        />
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? "Un momento…" : modo === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>
      <button
        className="link"
        onClick={() => {
          setError("");
          setModo(modo === "login" ? "register" : "login");
        }}
      >
        {modo === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
      </button>
    </div>
  );
}

/* ---------------- Utilidades ---------------- */
const dinero = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function Encabezado({ me }) {
  return (
    <header>
      <div>
        <h1>🔧 Refaccionaria</h1>
        <span className="muted">
          {me.perfil?.nombre || me.user.email} · <span className={`badge ${me.rol}`}>{me.rol}</span>
        </span>
      </div>
      <button onClick={logout}>Salir</button>
    </header>
  );
}

/* ---------------- Vista CLIENTE (catálogo) ---------------- */
function PanelCliente({ me }) {
  const [piezas, setPiezas] = useState([]);
  const [autos, setAutos] = useState([]);
  const [q, setQ] = useState("");
  const [autoId, setAutoId] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([api("/api/piezas"), api("/api/autos")])
      .then(([p, a]) => {
        setPiezas(p);
        setAutos(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return piezas.filter(
      (p) =>
        (!autoId || p.auto_id === autoId) &&
        (!t ||
          p.nombre.toLowerCase().includes(t) ||
          (p.sku || "").toLowerCase().includes(t))
    );
  }, [piezas, q, autoId]);

  return (
    <div className="wrap">
      <Encabezado me={me} />
      <h2>Catálogo de piezas</h2>
      <div className="row">
        <input
          placeholder="Buscar por nombre o SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={autoId} onChange={(e) => setAutoId(e.target.value)}>
          <option value="">Todos los autos</option>
          {autos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.marca} {a.modelo} {a.anio || ""}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {cargando && <p className="muted">Cargando…</p>}
      {!cargando && filtradas.length === 0 && <p className="muted">No hay piezas para mostrar.</p>}
      <div className="grid">
        {filtradas.map((p) => (
          <article className="card pieza" key={p.id}>
            <h3>{p.nombre}</h3>
            <p className="muted">SKU: {p.sku || "—"}</p>
            <p className="muted">
              Compatible: {p.autos ? `${p.autos.marca} ${p.autos.modelo}` : "Universal"}
            </p>
            <p className="precio">{dinero(p.precio)}</p>
            <span className={`badge ${p.stock > 0 ? "ok" : "agotado"}`}>
              {p.stock > 0 ? `Disponible (${p.stock})` : "Agotado"}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Vista ADMIN ---------------- */
function PanelAdmin({ me }) {
  const [tab, setTab] = useState("piezas");
  const [usuarios, setUsuarios] = useState([]);
  const [autos, setAutos] = useState([]);
  const [piezas, setPiezas] = useState([]);
  const [error, setError] = useState("");
  const [autoForm, setAutoForm] = useState({ marca: "", modelo: "", anio: "", placas: "" });
  const [piezaForm, setPiezaForm] = useState({ nombre: "", sku: "", precio: "", stock: "", auto_id: "" });

  async function cargar() {
    const [u, a, p] = await Promise.all([api("/api/usuarios"), api("/api/autos"), api("/api/piezas")]);
    setUsuarios(u);
    setAutos(a);
    setPiezas(p);
  }

  // Ejecuta una acción mostrando el error en pantalla en vez de fallar en silencio.
  async function accion(fn) {
    setError("");
    try {
      await fn();
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  const crearAuto = (e) => {
    e.preventDefault();
    accion(async () => {
      await api("/api/autos", { method: "POST", body: JSON.stringify(autoForm) });
      setAutoForm({ marca: "", modelo: "", anio: "", placas: "" });
    });
  };

  const crearPieza = (e) => {
    e.preventDefault();
    accion(async () => {
      await api("/api/piezas", { method: "POST", body: JSON.stringify(piezaForm) });
      setPiezaForm({ nombre: "", sku: "", precio: "", stock: "", auto_id: "" });
    });
  };

  const borrar = (ruta, texto) => {
    if (!window.confirm(`¿Borrar ${texto}?`)) return;
    accion(() => api(ruta, { method: "DELETE" }));
  };

  const cambiarRol = (id, rol) =>
    accion(() => api(`/api/usuarios/${id}/rol`, { method: "PATCH", body: JSON.stringify({ rol }) }));

  return (
    <div className="wrap">
      <Encabezado me={me} />
      <nav>
        {["piezas", "autos", "usuarios"].map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {error && <p className="error">{error}</p>}

      {tab === "usuarios" && (
        <div className="tabla">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.rol || "cliente"}
                      disabled={u.id === me.user.id}
                      onChange={(e) => cambiarRol(u.id, e.target.value)}
                    >
                      <option value="cliente">cliente</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "autos" && (
        <>
          <form className="row" onSubmit={crearAuto}>
            <input placeholder="Marca" value={autoForm.marca} onChange={(e) => setAutoForm({ ...autoForm, marca: e.target.value })} required />
            <input placeholder="Modelo" value={autoForm.modelo} onChange={(e) => setAutoForm({ ...autoForm, modelo: e.target.value })} required />
            <input placeholder="Año" inputMode="numeric" value={autoForm.anio} onChange={(e) => setAutoForm({ ...autoForm, anio: e.target.value })} />
            <input placeholder="Placas" value={autoForm.placas} onChange={(e) => setAutoForm({ ...autoForm, placas: e.target.value })} />
            <button>Agregar auto</button>
          </form>
          <div className="tabla">
            <table>
              <thead>
                <tr><th>Marca</th><th>Modelo</th><th>Año</th><th>Placas</th><th></th></tr>
              </thead>
              <tbody>
                {autos.map((a) => (
                  <tr key={a.id}>
                    <td>{a.marca}</td>
                    <td>{a.modelo}</td>
                    <td>{a.anio || "-"}</td>
                    <td>{a.placas || "-"}</td>
                    <td>
                      <button className="danger" onClick={() => borrar(`/api/autos/${a.id}`, `${a.marca} ${a.modelo}`)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "piezas" && (
        <>
          <form className="row" onSubmit={crearPieza}>
            <input placeholder="Nombre" value={piezaForm.nombre} onChange={(e) => setPiezaForm({ ...piezaForm, nombre: e.target.value })} required />
            <input placeholder="SKU" value={piezaForm.sku} onChange={(e) => setPiezaForm({ ...piezaForm, sku: e.target.value })} />
            <input placeholder="Precio" inputMode="decimal" value={piezaForm.precio} onChange={(e) => setPiezaForm({ ...piezaForm, precio: e.target.value })} />
            <input placeholder="Stock" inputMode="numeric" value={piezaForm.stock} onChange={(e) => setPiezaForm({ ...piezaForm, stock: e.target.value })} />
            <select value={piezaForm.auto_id} onChange={(e) => setPiezaForm({ ...piezaForm, auto_id: e.target.value })}>
              <option value="">Sin auto</option>
              {autos.map((a) => (
                <option key={a.id} value={a.id}>{a.marca} {a.modelo}</option>
              ))}
            </select>
            <button>Agregar pieza</button>
          </form>
          <div className="tabla">
            <table>
              <thead>
                <tr><th>Nombre</th><th>SKU</th><th>Precio</th><th>Stock</th><th>Auto</th><th></th></tr>
              </thead>
              <tbody>
                {piezas.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{p.sku || "-"}</td>
                    <td>{dinero(p.precio)}</td>
                    <td>{p.stock}</td>
                    <td>{p.autos ? `${p.autos.marca} ${p.autos.modelo}` : "-"}</td>
                    <td>
                      <button className="danger" onClick={() => borrar(`/api/piezas/${p.id}`, p.nombre)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Raíz ---------------- */
export default function App() {
  const [me, setMe] = useState(null);
  const [cargando, setCargando] = useState(!!getToken());
  const [aviso, setAviso] = useState("");

  function cargarMe() {
    setCargando(true);
    api("/api/me")
      .then(setMe)
      .catch((e) => {
        localStorage.removeItem("token");
        setMe(null);
        setAviso(e.message);
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (getToken()) cargarMe();
  }, []);

  if (cargando) return <p className="muted centro">Cargando…</p>;
  if (!me) return <Login aviso={aviso} onOk={cargarMe} />;
  return me.rol === "admin" ? <PanelAdmin me={me} /> : <PanelCliente me={me} />;
}
