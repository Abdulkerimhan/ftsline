// src/pages/SuperadminFinance.jsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api/http.js";
import "./SuperadminFinance.css";

function s(v, def = "") { return String(v ?? def).trim(); }
function n(v, def = 0) { const x = Number(v); return Number.isFinite(x) ? x : def; }

function fmtMoney(amount, currency = "USDT") {
  const val = Number(amount || 0);
  if (!Number.isFinite(val)) return "—";
  return `${val.toLocaleString("tr-TR")} ${currency || "USDT"}`;
}

function shortId(x) {
  const str = String(x || "");
  if (str.length <= 12) return str;
  return str.slice(0, 6) + "…" + str.slice(-4);
}

function safeDate(x) {
  if (!x) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR");
}

// ✅ populate sonrası user objesi string de gelebilir (fallback)
function renderUserCell(u) {
  if (!u) return "—";
  if (typeof u === "string") return shortId(u);
  return u.username || u.fullName || u.email || shortId(u._id);
}

export default function SuperadminFinance() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, count: 0 });

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(100);

  const [items, setItems] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    user: "",
    amount: "",
    currency: "USDT",
    title: "",
    note: "",
    type: "adjust",
    status: "paid",
    refId: "",
    txHash: "",
  });

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (s(q)) sp.set("q", s(q));
    if (s(type)) sp.set("type", s(type));
    if (s(status)) sp.set("status", s(status));
    sp.set("page", String(page));
    sp.set("limit", String(limit));
    return sp.toString();
  }, [q, type, status, page, limit]);

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [sumRes, listRes] = await Promise.all([
        apiGet("/api/superadmin/finance/summary"),
        apiGet(`/api/superadmin/finance/ledger?${query}`),
      ]);

      setSummary(sumRes?.summary || { total: 0, paid: 0, pending: 0, count: 0 });

      setItems(Array.isArray(listRes?.items) ? listRes.items : []);
      setPages(n(listRes?.pages, 1) || 1);
      setTotal(n(listRes?.total, 0) || 0);
    } catch (e) {
      setErr(e?.message || "Finans verisi alınamadı");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function resetFilters() {
    setQ("");
    setType("");
    setStatus("");
    setPage(1);
  }

  async function onCreate() {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        user: s(form.user),
        amount: Number(form.amount),
        currency: s(form.currency, "USDT"),
        title: s(form.title),
        note: s(form.note),
        type: s(form.type, "adjust"),
        status: s(form.status, "paid"),
        refId: s(form.refId),
        txHash: s(form.txHash),
      };

      if (!payload.user) throw new Error("User ID zorunlu");
      if (!Number.isFinite(payload.amount) || payload.amount === 0) throw new Error("Amount 0 olamaz");
      if (!payload.title) throw new Error("Title zorunlu");

      await apiPost("/api/superadmin/finance/ledger", payload);

      setOpenCreate(false);
      setForm({
        user: "",
        amount: "",
        currency: "USDT",
        title: "",
        note: "",
        type: "adjust",
        status: "paid",
        refId: "",
        txHash: "",
      });

      await loadAll();
    } catch (e) {
      setErr(e?.message || "Kayıt eklenemedi");
    } finally {
      setSaving(false);
    }
  }

  // ✅ FULL JSON Export (filtreleriyle ama sayfa sınırı olmadan)
  async function exportJson() {
    try {
      // backend: all=true destekliyorsa tüm kayıtları alır
      const url = `/api/superadmin/finance/ledger?${query}&all=true`;
      const data = await apiGet(url);

      // bazı backend'ler {items: []} döner bazıları direkt data döner
      const payload = data?.items ? data.items : data;

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `ledger-export-${stamp}.json`;
      a.click();

      URL.revokeObjectURL(a.href);
    } catch (e) {
      setErr(e?.message || "Export başarısız");
    }
  }

  // ✅ CSV Export (Excel uyumlu)
  async function exportCSV() {
    try {
      const url = `/api/superadmin/finance/ledger?${query}&all=true`;
      const data = await apiGet(url);
      const list = Array.isArray(data?.items) ? data.items : [];

      const headers = ["Tarih","Title","Type","Status","Amount","Currency","User","UserEmail","RefId","TxHash","ID"];

      const rows = list.map((it) => {
        const u = it?.user;
        const userName = renderUserCell(u);
        const userEmail = (u && typeof u !== "string" && u.email) ? u.email : "";

        return [
          safeDate(it.createdAt),
          it.title || "",
          it.type || "",
          it.status || "",
          String(it.amount ?? ""),
          it.currency || "",
          userName,
          userEmail,
          it.refId || "",
          it.txHash || "",
          it._id || "",
        ];
      });

      const csv =
        [headers, ...rows]
          .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
          .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `ledger-export-${stamp}.csv`;
      a.click();

      URL.revokeObjectURL(a.href);
    } catch (e) {
      setErr(e?.message || "CSV export başarısız");
    }
  }

  const summaryCards = useMemo(() => {
    return [
      { label: "Toplam", value: fmtMoney(summary.total, "USDT"), hint: "Tüm status toplamı" },
      { label: "Ödenen", value: fmtMoney(summary.paid, "USDT"), hint: "paid / success" },
      { label: "Bekleyen", value: fmtMoney(summary.pending, "USDT"), hint: "pending" },
      { label: "Kayıt", value: String(summary.count ?? 0), hint: "Toplam işlem adedi" },
    ];
  }, [summary]);

  return (
    <div className="sfWrap">
      <div className="sfTop">
        <div>
          <h1 className="sfTitle">Finans / Ledger</h1>
          <p className="sfSub">Tüm hareketleri gör, filtrele, manuel kayıt ekle.</p>
        </div>

        <div className="sfActions">
          <button className="sfBtn" onClick={exportJson} type="button" disabled={loading}>
            JSON Export
          </button>
          <button className="sfBtn" onClick={exportCSV} type="button" disabled={loading}>
            CSV Export
          </button>
          <button className="sfBtn primary" onClick={() => setOpenCreate(true)} type="button">
            + Manuel Kayıt
          </button>
        </div>
      </div>

      {err ? <div className="sfError">{err}</div> : null}

      <div className="sfGrid">
        {summaryCards.map((c) => (
          <div className="sfCard" key={c.label}>
            <div className="sfCardLabel">{c.label}</div>
            <div className="sfCardValue">{c.value}</div>
            <div className="sfCardHint">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="sfPanel">
        <div className="sfPanelHead">
          <div className="sfPanelTitle">Ledger Kayıtları</div>

          <div className="sfFilters">
            <input
              className="sfInput"
              placeholder="Ara (title)..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />

            <select
              className="sfSelect"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Type (Hepsi)</option>
              <option value="adjust">adjust</option>
              <option value="commission">commission</option>
              <option value="order">order</option>
              <option value="payout">payout</option>
              <option value="deposit">deposit</option>
              <option value="refund">refund</option>
            </select>

            <select
              className="sfSelect"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Status (Hepsi)</option>
              <option value="paid">paid</option>
              <option value="success">success</option>
              <option value="pending">pending</option>
              <option value="failed">failed</option>
              <option value="canceled">canceled</option>
            </select>

            <button className="sfBtn ghost" onClick={resetFilters} type="button" disabled={loading}>
              Sıfırla
            </button>
          </div>
        </div>

        <div className="sfTableWrap">
          <table className="sfTable">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Başlık</th>
                <th>Type</th>
                <th>Status</th>
                <th>Tutar</th>
                <th>User</th>
                <th>Ref</th>
                <th>Tx</th>
                <th>ID</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="sfTdMuted">Yükleniyor…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="sfTdMuted">Kayıt yok.</td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it._id}>
                    <td className="sfMono">{safeDate(it.createdAt)}</td>

                    <td className="sfTitleCell">
                      <div className="sfMain">{it.title || "—"}</div>
                      {it.note ? <div className="sfSubCell">{it.note}</div> : null}
                    </td>

                    <td className="sfTag">{it.type || "—"}</td>

                    <td>
                      <span className={`sfStatus ${it.status || ""}`}>{it.status || "—"}</span>
                    </td>

                    <td className="sfMoney">{fmtMoney(it.amount, it.currency)}</td>

                    {/* ✅ USER: username/email göster */}
                    <td className="sfTitleCell">
                      {it?.user && typeof it.user !== "string" ? (
                        <>
                          <div className="sfMain">{renderUserCell(it.user)}</div>
                          <div className="sfSubCell">{it.user.email || shortId(it.user._id)}</div>
                        </>
                      ) : (
                        <div className="sfMain sfMono">{it?.user ? shortId(it.user) : "—"}</div>
                      )}
                    </td>

                    <td className="sfMono">{it.refId ? shortId(it.refId) : "—"}</td>
                    <td className="sfMono">{it.txHash ? shortId(it.txHash) : "—"}</td>
                    <td className="sfMono">{shortId(it._id)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="sfPager">
          <div className="sfPagerLeft">
            <span className="sfMuted">Toplam:</span> {total} kayıt
          </div>

          <div className="sfPagerRight">
            <button
              className="sfBtn ghost"
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ←
            </button>

            <div className="sfPageBox">
              <span className="sfMono">{page}</span> / <span className="sfMono">{pages}</span>
            </div>

            <button
              className="sfBtn ghost"
              type="button"
              disabled={loading || page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {openCreate ? (
        <div className="sfModalOverlay" onMouseDown={() => !saving && setOpenCreate(false)}>
          <div className="sfModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sfModalHead">
              <div>
                <div className="sfModalTitle">Manuel Ledger Kaydı</div>
                <div className="sfModalSub">User ID ile işlem ekle (pozitif/negatif olabilir).</div>
              </div>
              <button className="sfBtn ghost" type="button" onClick={() => !saving && setOpenCreate(false)}>
                Kapat
              </button>
            </div>

            <div className="sfForm">
              <label className="sfLabel">
                User ID
                <input
                  className="sfInput"
                  value={form.user}
                  onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                  placeholder="65f... ObjectId"
                />
              </label>

              <div className="sfRow">
                <label className="sfLabel">
                  Amount
                  <input
                    className="sfInput"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="100 / -50"
                  />
                </label>

                <label className="sfLabel">
                  Currency
                  <select
                    className="sfSelect"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  >
                    <option value="USDT">USDT</option>
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
              </div>

              <label className="sfLabel">
                Title
                <input
                  className="sfInput"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: Manuel düzeltme"
                />
              </label>

              <label className="sfLabel">
                Note (opsiyonel)
                <input
                  className="sfInput"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Açıklama"
                />
              </label>

              <div className="sfRow">
                <label className="sfLabel">
                  Type
                  <select
                    className="sfSelect"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="adjust">adjust</option>
                    <option value="commission">commission</option>
                    <option value="order">order</option>
                    <option value="payout">payout</option>
                    <option value="deposit">deposit</option>
                    <option value="refund">refund</option>
                  </select>
                </label>

                <label className="sfLabel">
                  Status
                  <select
                    className="sfSelect"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="paid">paid</option>
                    <option value="success">success</option>
                    <option value="pending">pending</option>
                    <option value="failed">failed</option>
                    <option value="canceled">canceled</option>
                  </select>
                </label>
              </div>

              <div className="sfRow">
                <label className="sfLabel">
                  Ref ID (opsiyonel)
                  <input
                    className="sfInput"
                    value={form.refId}
                    onChange={(e) => setForm((f) => ({ ...f, refId: e.target.value }))}
                    placeholder="orderId vb"
                  />
                </label>

                <label className="sfLabel">
                  Tx Hash (opsiyonel)
                  <input
                    className="sfInput"
                    value={form.txHash}
                    onChange={(e) => setForm((f) => ({ ...f, txHash: e.target.value }))}
                    placeholder="0x..."
                  />
                </label>
              </div>

              <div className="sfFormActions">
                <button className="sfBtn ghost" type="button" disabled={saving} onClick={() => setOpenCreate(false)}>
                  Vazgeç
                </button>
                <button className="sfBtn primary" type="button" disabled={saving} onClick={onCreate}>
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>

              <div className="sfTiny">İpucu: Amount negatif olursa “çıkış / kesinti” gibi davranır.</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ✅ Vite “default yok” takılırsa diye ekstra named export testi
export const __FINANCE_PAGE_OK__ = true;