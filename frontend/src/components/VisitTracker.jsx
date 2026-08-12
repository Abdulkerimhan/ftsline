import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "/api";

function getVisitorId() {
  const key = "ftsline_visitor_id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, value);
  }
  return value;
}

export default function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/superadmin")) return;

    const timer = window.setTimeout(() => {
      fetch(`${API}/analytics/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: getVisitorId(),
          path: location.pathname,
          referrer: document.referrer || "Direkt",
        }),
        keepalive: true,
      }).catch(() => {});
    }, 400);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return null;
}
