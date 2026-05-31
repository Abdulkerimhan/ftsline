import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import FAQ from "./pages/FAQ.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import Cart from "./pages/Cart.jsx";
import Payment from "./pages/Payment.jsx";
import SuperAdminPanel from "./pages/SuperAdminPanel.jsx";
import LiveTranslator from "./i18n/LiveTranslator.jsx";

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function RequireAuth({ children }) {
  const token = sessionStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const token = sessionStorage.getItem("accessToken");
  const user = getStoredUser();

  if (!token) return <Navigate to="/login" replace />;

  if (user?.role !== "admin" && user?.role !== "superadmin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RequireSuperAdmin({ children }) {
  const token = sessionStorage.getItem("accessToken");
  const user = getStoredUser();

  if (!token) return <Navigate to="/login" replace />;

  if (user?.role !== "superadmin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <LiveTranslator />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/cart" element={<Cart />} />
        <Route path="/payment" element={<Payment />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPanel />
            </RequireAdmin>
          }
        />

        <Route
          path="/superadmin"
          element={
            <RequireSuperAdmin>
              <SuperAdminPanel />
            </RequireSuperAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}



