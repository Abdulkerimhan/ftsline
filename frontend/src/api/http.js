// src/api/http.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  try {
    const a = localStorage.getItem("accessToken");
    if (a) return a;

    const b = sessionStorage.getItem("accessToken");
    if (b) return b;

    return "";
  } catch {
    return "";
  }
}

function clearToken() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
  } catch {
    //
  }
}

async function request(method, path, body) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const token = getToken();

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  } else {
    payload = body;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: payload,
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data;
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiPut = (path, body) => request("PUT", path, body);
export const apiDel = (path) => request("DELETE", path);