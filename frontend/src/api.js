const API = import.meta.env.VITE_API_URL || "/api";

/* ================= HELPERS ================= */

function getAuthHeader() {
  const token = sessionStorage.getItem("accessToken");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

async function parseResponse(res) {
  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(result.message || "Bir hata oluştu");
  }

  return result;
}

/* ================= AUTH ================= */

export async function registerUser(data) {
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Register API hata:", error);
    return { message: error.message };
  }
}

export async function loginUser(data) {
  try {
    const payload = {
      identifier: data?.identifier || data?.login || "",
      password: data?.password || "",
    };

    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await parseResponse(res);

    // 🔥 TOKEN OTOMATİK KAYIT
    if (result?.token) {
      sessionStorage.setItem("accessToken", result.token);
      sessionStorage.setItem("user", JSON.stringify(result.user));
    }

    return result;
  } catch (error) {
    console.error("Login API hata:", error);
    return { message: error.message };
  }
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${API}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return parseResponse(res);
}

export async function resetPassword(data) {
  const res = await fetch(`${API}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseResponse(res);
}

/* ================= USER ================= */

export async function getMe() {
  try {
    const res = await fetch(`${API}/user/me`, {
      method: "GET",
      headers: {
        ...getAuthHeader(),
      },
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Get me API hata:", error);
    return null;
  }
}

export async function updateMyProfile(data) {
  const res = await fetch(`${API}/user/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  return parseResponse(res);
}

export async function getReferrals() {
  try {
    const res = await fetch(`${API}/user/referrals`, {
      method: "GET",
      headers: {
        ...getAuthHeader(),
      },
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Referrals API hata:", error);
    return [];
  }
}

export async function getMyEarnings() {
  const emptyResult = {
    summary: {},
    sourceSummary: [],
    movements: [],
    chart: [],
  };

  try {
    const res = await fetch(`${API}/earnings/me`, {
      method: "GET",
      headers: {
        ...getAuthHeader(),
      },
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Kazanc hareketleri alinamadi:", error);
    return emptyResult;
  }
}

export async function getMyWithdrawals() {
  const res = await fetch(`${API}/earnings/withdrawals/me`, {
    headers: { ...getAuthHeader() },
  });
  return parseResponse(res);
}

export async function createWithdrawalRequest(amount) {
  const res = await fetch(`${API}/earnings/withdrawals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ amount }),
  });
  return parseResponse(res);
}

export async function getMatrixTree() {
  try {
    const res = await fetch(`${API}/user/matrix`, {
      method: "GET",
      headers: {
        ...getAuthHeader(),
      },
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Matrix API hata:", error);
    return null;
  }
}

/* ================= PRODUCTS (PUBLIC) ================= */

export async function getProducts() {
  try {
    const res = await fetch(`${API}/products`, {
      method: "GET",
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Products API hata:", error);
    return [];
  }
}

export async function getProduct(id) {
  try {
    const res = await fetch(`${API}/products/${id}`, {
      method: "GET",
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Product API hata:", error);
    return null;
  }
}

/* ================= ADMIN PRODUCTS ================= */

// 🔥 Admin ürünleri çek
export async function getAdminProducts() {
  try {
    const res = await fetch(`${API}/admin/products`, {
      method: "GET",
      headers: {
        ...getAuthHeader(),
      },
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Admin products API hata:", error);
    return [];
  }
}

// 🔥 Ürün ekle (FormData)
export async function createProduct(formData) {
  try {
    const res = await fetch(`${API}/admin/products`, {
      method: "POST",
      headers: {
        ...getAuthHeader(), // ❗ Content-Type yok
      },
      body: formData,
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Create product API hata:", error);
    return { message: error.message };
  }
}

// 🔥 Ürün güncelle
export async function updateProduct(id, formData) {
  try {
    const res = await fetch(`${API}/admin/products/${id}`, {
      method: "PUT",
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Update product API hata:", error);
    return { message: error.message };
  }
}

// 🔥 Ürün sil
export async function deleteProduct(id) {
  try {
    const res = await fetch(`${API}/admin/products/${id}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeader(),
      },
    });

    return await parseResponse(res);
  } catch (error) {
    console.error("Delete product API hata:", error);
    return { message: error.message };
  }
}
