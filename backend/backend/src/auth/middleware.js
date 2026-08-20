import { verifySessionToken } from "./config.js";

export const ADMIN_COOKIE = "lootifer_admin_session";

export const parseCookies = (request) => Object.fromEntries(
  String(request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      if (index < 0) return [part, ""];
      return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
    })
);

export const readAdminSession = async (request) => {
  const token = parseCookies(request)[ADMIN_COOKIE] || "";
  return verifySessionToken(token);
};

export const requireAdmin = async (request, response, next) => {
  try {
    const session = await readAdminSession(request);
    if (!session) {
      return response.status(401).json({ error: "Beheerderssessie vereist." });
    }
    request.admin = session;
    return next();
  } catch (error) {
    return next(error);
  }
};
