import * as userService from "../services/userService.js";

export async function getProfile(req, res) {
  const data = await userService.getMyProfile(req.user.id);
  res.json({ ok: true, data });
}

export async function putProfile(req, res) {
  const data = await userService.updateMyProfile(req.user.id, req.body);
  res.json({ ok: true, message: "Profil güncellendi", data });
}