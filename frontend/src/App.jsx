import { Routes, Route, Navigate } from "react-router-dom";

// public pages
import Landing from "./pages/Landing.jsx";
import Products from "./pages/Products.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import About from "./pages/About.jsx";
import Faq from "./pages/Faq.jsx";
import Contact from "./pages/Contact.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";

// user dashboard
import Dashboard from "./pages/Dashboard.jsx";

// admin dashboard
import AdminDashboard from "./pages/AdminDashboard.jsx";

// superadmin dashboard
import SuperadminDashboard from "./pages/SuperadminDashboard.jsx";
import SuperadminFinance from "./pages/SuperadminFinance.jsx";

// auth
import { useAuth } from "./context/AuthContext.jsx";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}

function RequireRole({ children, role, allowSuperadmin = true }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (allowSuperadmin && user.role === "superadmin") return children;

  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Landing />} />
      <Route path="/products" element={<Products />} />
      <Route path="/about" element={<About />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/cart/*" element={<Cart />} />

      {/* auth */}
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />

      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />

      {/* referral */}
      <Route path="/r/:username" element={<Register />} />

      {/* user */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/checkout"
        element={
          <RequireAuth>
            <Checkout />
          </RequireAuth>
        }
      />

      {/* admin */}
      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminDashboard />
          </RequireRole>
        }
      />

      {/* superadmin */}
      <Route
        path="/superadmin"
        element={
          <RequireRole role="superadmin">
            <SuperadminDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/superadmin/finance"
        element={
          <RequireRole role="superadmin">
            <SuperadminFinance />
          </RequireRole>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}