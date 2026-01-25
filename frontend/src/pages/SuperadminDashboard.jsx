// frontend/src/pages/SuperadminDashboard.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/http";

function Card({ title, value }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function SuperadminDashboard() {
  const [matrixId, setMatrixId] = useState("MAIN");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const r = await api(`/api/superadmin/dashboard?matrixId=${encodeURIComponent(matrixId)}`);
      setData(r);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (err) return <div style={{ color: "crimson" }}>Hata: {err}</div>;
  if (!data) return <div>Yükleniyor...</div>;

  const s = data.stats;

  return (
    <div>
      <h2>Superadmin Dashboard</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={matrixId} onChange={(e) => setMatrixId(e.target.value)} style={{ padding: 8 }} />
        <button onClick={load} style={{ padding: "8px 12px" }}>
          Yenile
        </button>
        <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
          Server: {new Date(data.serverTime).toLocaleString()}
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="Toplam Kullanıcı" value={s.users.total} />
        <Card title="Aktif Kullanıcı" value={s.users.active} />
        <Card title="Pasif Kullanıcı" value={s.users.inactive} />
        <Card title="Admin" value={s.users.admins} />
        <Card title="Superadmin" value={s.users.superadmins} />

        <Card title="Matrix Pending" value={s.matrix.pending} />
        <Card title="Matrix Active" value={s.matrix.active} />
        <Card title="Matrix Removed" value={s.matrix.removed} />
      </div>

      {/* Last Logs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Son Audit Loglar</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.lastLogs.map((l) => (
                <tr key={l._id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.action}</td>
                  <td>
                    {l.actorUsername} ({l.actorRole})
                  </td>
                  <td>{l.statusCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Settings */}
        <div>
          <h3 style={{ marginTop: 0 }}>Son Ayarlar</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.topSettings.map((st) => (
                <tr key={st._id}>
                  <td>{st.key}</td>
                  <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {typeof st.value === "object" ? JSON.stringify(st.value) : String(st.value)}
                  </td>
                  <td>{st.updatedAt ? new Date(st.updatedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            MatrixId: <b>{data.matrixId}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
