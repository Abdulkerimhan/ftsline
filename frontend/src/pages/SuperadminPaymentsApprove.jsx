// frontend/src/pages/SuperadminPaymentsApprove.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/http";

export default function SuperadminPaymentsApprove() {
  const [matrixId, setMatrixId] = useState("MAIN");

  // global approve fields
  const [amount, setAmount] = useState("74.99");
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("manual approve");

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setErr("");
    try {
      const r = await api(
        `/api/superadmin/matrix/pending?matrixId=${encodeURIComponent(matrixId)}&page=1&limit=50`
      );
      setData(r);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (userId) => {
    setBusyId(userId);
    setErr("");
    try {
      const body = {
        userId,
        matrixId,
        amount: amount === "" ? null : Number(amount),
        txHash: txHash.trim(),
        note: note.trim(),
      };

      await api("/api/superadmin/payments/approve", {
        method: "POST",
        body,
      });

      await load();
      alert("✅ Ödeme onaylandı / user aktive edildi");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <h2>Payments Approve</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={matrixId} onChange={(e) => setMatrixId(e.target.value)} style={{ padding: 8 }} />
        <button onClick={load} style={{ padding: "8px 12px" }}>
          Yenile
        </button>
      </div>

      {/* approve fields */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700 }}>Approve Alanları</div>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Amount:
          <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: 6, width: 110 }} />
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          txHash:
          <input value={txHash} onChange={(e) => setTxHash(e.target.value)} style={{ padding: 6, width: 260 }} />
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Note:
          <input value={note} onChange={(e) => setNote(e.target.value)} style={{ padding: 6, width: 220 }} />
        </label>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          (Bu değerler tek tık approve ile backend’e gider, audit log meta’da görünür.)
        </div>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>Hata: {err}</div>}

      {!data ? (
        <div>Yükleniyor...</div>
      ) : data.items.length === 0 ? (
        <div>Pending yok.</div>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>JoinedAt</th>
              <th>Approve</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((n) => {
              const u = n.user || {};
              const userId = u?._id || n.userId;
              const busy = busyId === userId;

              return (
                <tr key={n._id} style={{ opacity: busy ? 0.6 : 1 }}>
                  <td>{u.username || "-"}</td>
                  <td>{u.email || "-"}</td>
                  <td>{n.joinedAt ? new Date(n.joinedAt).toLocaleString() : "-"}</td>
                  <td>
                    <button disabled={busy} onClick={() => approve(userId)}>
                      ✅ Tek Tık Approve
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
