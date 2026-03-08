import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiPost, apiGet } from "../api/http.js";

const AuthContext = createContext(null);

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function persistAuth(accessToken, user) {
  try {
    localStorage.setItem("accessToken", accessToken || "");
    localStorage.setItem("user", JSON.stringify(user || null));
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
  } catch {
    //
  }
}

function clearAuth() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
  } catch {
    //
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("accessToken") || "";
    } catch {
      return "";
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? safeJsonParse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function boot() {
      if (!token) {
        if (alive) setLoading(false);
        return;
      }

      try {
        const me = await apiGet("/api/auth/me");
        if (!alive) return;

        const u = me?.user || me?.data?.user || null;

        if (u) {
          persistAuth(token, u);
          setUser(u);
        } else {
          clearAuth();
          setToken("");
          setUser(null);
        }
      } catch {
        clearAuth();
        if (!alive) return;
        setToken("");
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    boot();

    return () => {
      alive = false;
    };
  }, [token]);

  async function login(identifier, password) {
    const res = await apiPost("/api/auth/login", { identifier, password });

    const accessToken = res?.accessToken || res?.token || "";
    const u = res?.user || null;

    if (!accessToken || !u) {
      return { ok: false, message: res?.message || "Token/User dönmedi" };
    }

    persistAuth(accessToken, u);
    setToken(accessToken);
    setUser(u);

    return { ok: true, user: u };
  }

  function logout() {
    clearAuth();
    setToken("");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isLoggedIn: !!user,
      isAdmin: user?.role === "admin",
      isSuperadmin: user?.role === "superadmin",
      login,
      logout,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}