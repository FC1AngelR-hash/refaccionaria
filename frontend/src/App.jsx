import { useEffect, useState } from "react";
import { api, getToken } from "./api.js";

function Login({ onOk }) {
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", nombre: "" });
  const [error, setError] = useState("");

  async function enviar(e) {
    e.preventDefault();
    setError("");
    try {
      const path = modo === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await api(path, { method: "POST", body: JSON.stringify(form) });
      if (!data.session?.access_token) {
        setError(data.message || "Confirma tu correo en Supabase para iniciar sesión.");
        return;
      }
      localStorage.setItem("token", data.session.access_token);
      onOk();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card auth">
      <h1>Refaccionaria</h1>
      <p>Usuarios, piezas y autos</p>
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
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">{modo === "login" ? "Entrar" : "Registrar"}</button>
      </form>
      <button className="link" onClick={() => setModo(modo === "login" ? "register" : "login")}>
        {modo === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
      </button>
    </div>
  );
}

function Panel() {
  const [tab, setTab] = useState("piezas");
  const [usuarios, setUsuarios] = useState([]);
  const [autos, setAutos] = useState([]);
  const [piezas, setPiezas] = useState([]);
  const [error, setError] = useState("");
  const [autoForm, setAutoForm] = useState({ marca: "", modelo: "", anio: "", placas: "" });
  const [piezaForm, setPiezaForm] = useState({
    nombre: "",
    sku: "",
    precio: "",
    stock: "",
    auto_id: "",
  });

  async function cargar() {
    const [u, a, p] = await Promise.all([
      api("/api/usuarios"),
      api("/api/autos"),
      api("/api/piezas"),
    ]);
    setUsuarios(u);
    setAutos(a);
    setPiezas(p);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  async function crearAuto(e) {
    e.preventDefault();
    await api("/api/autos", { method: "POST", body: JSON.stringify(autoForm) });
    setAutoForm({ marca: "", modelo: "", anio: "", placas: "" });
    cargar();
  }

  async function crearPieza(e) {
    e.preventDefault();
    await api("/api/piezas", { method: "POST", body: JSON.stringify(piezaForm) });
    setPiezaForm({ nombre: "", sku: "", precio: "", stock: "", auto_id: "" });
    cargar();
  }

  return (
    <div className="wrap">
      <header>
        <h1>Refaccionaria</h1>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.reload();
          }}
        >
          Salir
        </button>
      </header>
      <nav>
        {["usuarios", "autos", "piezas"].map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {error && <p className="error">{error}</p>}

      {tab === "usuarios" && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "autos" && (
        <>
          <form className="row" onSubmit={crearAuto}>
            <input
              placeholder="Marca"
              value={autoForm.marca}
              onChange={(e) => setAutoForm({ ...autoForm, marca: e.target.value })}
              required
            />
            <input
              placeholder="Modelo"
              value={autoForm.modelo}
              onChange={(e) => setAutoForm({ ...autoForm, modelo: e.target.value })}
              required
            />
            <input
              placeholder="Año"
              value={autoForm.anio}
              onChange={(e) => setAutoForm({ ...autoForm, anio: e.target.value })}
            />
            <input
              placeholder="Placas"
              value={autoForm.placas}
              onChange={(e) => setAutoForm({ ...autoForm, placas: e.target.value })}
            />
            <button>Agregar auto</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th>Placas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {autos.map((a) => (
                <tr key={a.id}>
                  <td>{a.marca}</td>
                  <td>{a.modelo}</td>
                  <td>{a.anio || "-"}</td>
                  <td>{a.placas || "-"}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={async () => {
                        await api(`/api/autos/${a.id}`, { method: "DELETE" });
                        cargar();
                      }}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === "piezas" && (
        <>
          <form className="row" onSubmit={crearPieza}>
            <input
              placeholder="Nombre"
              value={piezaForm.nombre}
              onChange={(e) => setPiezaForm({ ...piezaForm, nombre: e.target.value })}
              required
            />
            <input
              placeholder="SKU"
              value={piezaForm.sku}
              onChange={(e) => setPiezaForm({ ...piezaForm, sku: e.target.value })}
            />
            <input
              placeholder="Precio"
              value={piezaForm.precio}
              onChange={(e) => setPiezaForm({ ...piezaForm, precio: e.target.value })}
            />
            <input
              placeholder="Stock"
              value={piezaForm.stock}
              onChange={(e) => setPiezaForm({ ...piezaForm, stock: e.target.value })}
            />
            <select
              value={piezaForm.auto_id}
              onChange={(e) => setPiezaForm({ ...piezaForm, auto_id: e.target.value })}
            >
              <option value="">Sin auto</option>
              {autos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.marca} {a.modelo}
                </option>
              ))}
            </select>
            <button>Agregar pieza</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>SKU</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Auto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {piezas.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.sku || "-"}</td>
                  <td>${p.precio}</td>
                  <td>{p.stock}</td>
                  <td>{p.autos ? `${p.autos.marca} ${p.autos.modelo}` : "-"}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={async () => {
                        await api(`/api/piezas/${p.id}`, { method: "DELETE" });
                        cargar();
                      }}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [ok, setOk] = useState(!!getToken());
  return ok ? <Panel /> : <Login onOk={() => setOk(true)} />;
}
