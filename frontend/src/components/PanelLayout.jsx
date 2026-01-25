import React from "react";
import { Link, Outlet, useLocation, useOutletContext } from "react-router-dom";

export default function PanelLayout() {
  const { me } = useOutletContext();
  const loc = useLocation();

  const isSuper = me.role === "superadmin";
  const isAdmin = me.role === "admin" || isSuper;

  const Item = ({ to, label }) => (
    <div style={{ marginBottom: 8 }}>
      <Link
        to={to}
        style={{
          textDecoration: "none",
          padding: "8px 10px",
          display: "block",
          borderRadius: 8,
          border: loc.pathname.startsWith(to) ? "1px solid #333" : "1px solid #ddd",
        }}
      >
        {label}
      </Link>
    </div>
  );

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 260, padding: 16, borderRight: "1px solid #eee" }}>
        <div style={{ marginBottom: 12 }}>
          <b>{me.username}</b>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{me.role}</div>
        </div>

        {isSuper && (
          <>
            <div style={{ margin: "10px 0", fontWeight: 700 }}>Superadmin</div>
            <Item to="/superadmin/dashboard" label="Dashboard" />
            <Item to="/superadmin/users" label="Users" />

            {/* ✅ EKLENDİ */}
            <Item to="/superadmin/matrix-pending" label="Matrix Pending" />
            <Item to="/superadmin/payments-approve" label="Payments Approve" />

            <Item to="/superadmin/settings" label="Settings" />
            <Item to="/superadmin/logs" label="Audit Logs" />
          </>
        )}

        {isAdmin && (
          <>
            <div style={{ margin: "14px 0 10px", fontWeight: 700 }}>Admin</div>
            <Item to="/admin/dashboard" label="Dashboard" />
            <Item to="/admin/users" label="Users" />
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <button onClick={logout} style={{ padding: "8px 10px", width: "100%" }}>
            Çıkış Yap
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        <Outlet context={{ me }} />
      </div>
    </div>
  );
}
