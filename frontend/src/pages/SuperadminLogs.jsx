// frontend/src/pages/SuperadminLogs.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/http";

export default function SuperadminLogs() {
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [statusCode, setStatusCode] = useState("");

  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");     // YYYY-MM-DD

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = async (p = page) => {
    setErr("");
    try {
      const qs = new URLSearchParams();
      if (action) qs.set("action", action);
      if (userId) qs.set("userId", userId);
      if (statusCode) qs.set("statusCode", statusCode);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      qs.set("page", String(p));
      qs.set("limit", String(limit));

      const r = await api(`/api/superadmin/logs?${qs.toString()}`);
      setData(r);
      setPage(r.page);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => load(1);
  const prev = () => data && page > 1 && load(page - 1);
  const next = () => data && page < data.pages && load(page + 1);

  return (
    <div>
      <h2>Audit Logs</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input placeholder="action" value={action} onChange={(e) => setAction(e.target.value)} />
        <input placeholder="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input placeholder="statusCode" value={statusCode} onChange={(e) => setStatusCode(e.target.value)} />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span>From:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span>To:</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>

        <button onClick={apply}>Filtrele</button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>Hata: {err}</div>}

      {!data ? (
        <div>Yükleniyor...</div>
      ) : (
        <>
          <div style={{ marginBottom: 10, opacity: 0.8 }}>
            Toplam: <b>{data.total}</b> — Sayfa: <b>{data.page}</b> / <b>{data.pages}</b>
          </div>

          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Status</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l._id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.action}</td>
                  <td>{l.actorUsername} ({l.actorRole})</td>
                  <td>{l.statusCode}</td>
                  <td>{l.path}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={prev} disabled={page <= 1}>← Önceki</button>
            <button onClick={next} disabled={page >= data.pages}>Sonraki →</button>
          </div>
        </>
      )}
    </div>
  );
}
