import { Router } from "express";
import {
  createSessionToken,
  getAuthConfig,
  getSessionMaxAgeMs,
  verifyCredentials,
} from "../auth/config.js";
import { ADMIN_COOKIE, readAdminSession } from "../auth/middleware.js";

const router = Router();
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

const getAttemptKey = (request) => request.ip || request.socket?.remoteAddress || "unknown";
const isBlocked = (key) => {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.startedAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
};
const registerFailure = (key) => {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.startedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: Date.now() });
  } else {
    entry.count += 1;
  }
};

router.get("/status", async (request, response, next) => {
  try {
    const config = await getAuthConfig();
    const session = await readAdminSession(request);
    response.json({
      configured: Boolean(config),
      authenticated: Boolean(session),
      user: session ? { username: session.username, expiresAt: session.expiresAt } : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const key = getAttemptKey(request);
    if (isBlocked(key)) {
      return response.status(429).json({ error: "Te veel mislukte pogingen. Probeer het over 15 minuten opnieuw." });
    }

    const username = String(request.body?.username || "").trim();
    const password = String(request.body?.password || "");
    const result = await verifyCredentials(username, password);

    if (!result.configured) {
      return response.status(503).json({ error: "Admin-login is nog niet ingesteld. Voer eerst npm run setup-admin uit." });
    }

    if (!result.valid) {
      registerFailure(key);
      return response.status(401).json({ error: "Onjuiste gebruikersnaam of wachtwoord." });
    }

    attempts.delete(key);
    const token = createSessionToken(result.config.username, result.config.sessionSecret);
    response.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getSessionMaxAgeMs(),
      path: "/",
    });

    return response.json({ authenticated: true, user: { username: result.config.username } });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (request, response) => {
  response.clearCookie(ADMIN_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  response.json({ authenticated: false });
});

export default router;
