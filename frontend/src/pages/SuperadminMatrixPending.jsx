// frontend/src/pages/SuperadminMatrixPending.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/http";

export default function SuperadminMatrixPending() {
  const [matrixId, setMatrixId] = useState("MAIN");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busyKey, setBusyKey] = useState(""); // action sırasında disable

  const load = async (p = page) => {
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("matrixId", matrixId);
      qs.set("page", String(p));
      qs.set("limit", String(limit));

      const r = await api(`/api/superadmin/matrix/pending?${qs.toString()}`);
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

  const approve = async (userId) => {
    const key = `approve:${userId}`;
    setBusyKey(key);
    setErr("");
    try {
      await api("/api/superadmin/payments/approve", {
        method: "POST",
        body: { userId, matrixId },
      });
      await load(page);
      alert("✅ Approve tamam");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyKey("");
    }
  };

  const removePending = async (userId) => {
    const reason = prompt("Silme sebebi (boş bırakma istersen):", "REMOVED_BY_SUPERADMIN") || "REMOVED_BY_SUPERADMIN";
    const key = `remove:${userId}`;
    setBusyKey(key);
    setErr("");
    try {
      await api("/api/superadmin/matrix/remove-pending", {
        method: "POST",
        body: { userId, matrixId, reason },
      });
      await load(page);
      alert("✅ Pending silindi");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyKey("");
    }
  };

  const prev = () => data && page > 1 && load(page - 1);
  const next = () => data && page < data.pages && load(page + 1);

  return (
    <div>
      <h2>Matrix Pending</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={matrixId} onChange={(e) => setMatrixId(e.target.value)} style={{ padding: 8 }} />
        <button onClick={() => load(1)} style={{ padding: "8px 12px" }}>
          Yenile
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>Hata: {err}</div>}

      {!data ? (
        <div>Yükleniyor...</div>
      ) : (
        <>
          <div style={{ marginBottom: 10, opacity: 0.8 }}>
            Toplam: <b>{data.total}</b> — Sayfa: <b>{data.page}</b> / <b>{data.pages}</b>
          </div>

          <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>JoinedAt</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {data.items.map((n) => {
                const u = n.user || {};
                const userId = u?._id || n.userId; // güvenlik
                const isBusy = busyKey.includes(userId);

                return (
                  <tr key={n._id} style={{ opacity: isBusy ? 0.6 : 1 }}>
                    <td>{u.username || "-"}</td>
                    <td>{u.email || "-"}</td>
                    <td>{n.joinedAt ? new Date(n.joinedAt).toLocaleString() : "-"}</td>
                    <td>{n.pendingExpiresAt ? new Date(n.pendingExpiresAt).toLocaleString() : "-"}</td>

                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button disabled={isBusy} onClick={() => approve(userId)}>
                        ✅ Approve
                      </button>
                      <button disabled={isBusy} onClick={() => removePending(userId)}>
                        🗑 Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={prev} disabled={page <= 1}>
              ← Önceki
            </button>
            <button onClick={next} disabled={page >= data.pages}>
              Sonraki →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
