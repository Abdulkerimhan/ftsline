import crypto from "crypto";

function getCloudinaryConfig() {
  const rawUrl = String(process.env.CLOUDINARY_URL || "").trim();
  if (!rawUrl) return null;

  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "cloudinary:") {
    throw new Error("CLOUDINARY_URL gecersiz");
  }

  return {
    cloudName: parsed.hostname,
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password),
  };
}

export async function uploadProductImages(files = []) {
  if (!files.length) return [];

  const config = getCloudinaryConfig();
  if (!config) throw new Error("CLOUDINARY_URL tanimlanmamis");

  return Promise.all(files.map(async (file) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "ftsline/products";
    const signatureSource = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureSource).digest("hex");

    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    form.append("api_key", config.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      { method: "POST", body: form }
    );
    const result = await response.json();

    if (!response.ok || !result.secure_url) {
      throw new Error(result?.error?.message || "Cloudinary yukleme basarisiz");
    }

    return result.secure_url;
  }));
}
