import crypto from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { all, get, run } from "../db/connection.js";

const router = Router();
const scryptAsync = promisify(crypto.scrypt);

const SESSION_COOKIE = "second_life_customer";
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const SITE_URL =
  process.env.SITE_URL ||
  "https://www.2ndlifetoys.nl";

const RESEND_API_URL = "https://api.resend.com/emails";

const RESEND_FROM =
  process.env.RESEND_FROM ||
  "2nd Life Toys <noreply@2ndlifetoys.nl>";

const loginAttempts = new Map();

const normalizeEmail = (value = "") =>
  String(value || "").trim().toLowerCase();

const cleanText = (value = "", max = 120) =>
  String(value || "").trim().slice(0, max);

const isEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const nowIso = () => new Date().toISOString();

const tokenHash = (token = "") =>
  crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");

  const derived = await scryptAsync(
    password,
    salt,
    64
  );

  return `scrypt$${salt}$${Buffer.from(
    derived
  ).toString("hex")}`;
};

const verifyPassword = async (
  password,
  storedHash = ""
) => {
  const [scheme, salt, expectedHex] =
    String(storedHash || "").split("$");

  if (
    scheme !== "scrypt" ||
    !salt ||
    !expectedHex
  ) {
    return false;
  }

  const expected = Buffer.from(
    expectedHex,
    "hex"
  );

  const actual = Buffer.from(
    await scryptAsync(
      password,
      salt,
      expected.length
    )
  );

  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(
      expected,
      actual
    )
  );
};

const publicCustomer = (row = {}) => ({
  id: Number(row.id) || 0,
  firstName: row.first_name || "",
  lastName: row.last_name || "",
  email: row.email || "",
  phone: row.phone || "",
  street: row.street || "",
  houseNumber: row.house_number || "",
  postalCode: row.postal_code || "",
  city: row.city || "",
  country: row.country || "Nederland",
  createdAt: row.created_at || null,
  lastLoginAt: row.last_login_at || null,
});

const readCookie = (request, name) => {
  const source = String(
    request.headers.cookie || ""
  );

  const prefix = `${name}=`;

  const entry = source
    .split(";")
    .map((part) => part.trim())
    .find((part) =>
      part.startsWith(prefix)
    );

  return entry
    ? decodeURIComponent(
        entry.slice(prefix.length)
      )
    : "";
};

const readToken = (request) => {
  const authorization = String(
    request.headers.authorization || ""
  );

  if (/^Bearer\s+/i.test(authorization)) {
    return authorization
      .replace(/^Bearer\s+/i, "")
      .trim();
  }

  return readCookie(
    request,
    SESSION_COOKIE
  );
};

const readCustomerSession = async (
  request
) => {
  const token = readToken(request);

  if (!token) {
    return null;
  }

  const row = await get(
    `SELECT
       s.id AS session_id,
       s.expires_at,
       c.*
     FROM customer_sessions s
     INNER JOIN customers c
       ON c.id = s.customer_id
     WHERE s.token_hash = ?
       AND s.expires_at > ?`,
    [
      tokenHash(token),
      nowIso(),
    ]
  );

  if (!row) {
    return null;
  }

  await run(
    `UPDATE customer_sessions
     SET last_seen_at = ?
     WHERE id = ?`,
    [
      nowIso(),
      row.session_id,
    ]
  );

  return {
    token,
    customer: row,
  };
};

const requireCustomer = async (
  request,
  response,
  next
) => {
  try {
    const session =
      await readCustomerSession(request);

    if (!session) {
      return response
        .status(401)
        .json({
          error:
            "Log eerst in om verder te gaan.",
        });
    }

    request.customerSession = session;

    return next();
  } catch (error) {
    return next(error);
  }
};

const createSession = async (
  customerId,
  remember = false
) => {
  const token = crypto
    .randomBytes(32)
    .toString("base64url");

  const lifetimeMs = remember
    ? REMEMBER_DAYS *
      24 *
      60 *
      60 *
      1000
    : SESSION_HOURS *
      60 *
      60 *
      1000;

  const createdAt = nowIso();

  const expiresAt = new Date(
    Date.now() + lifetimeMs
  ).toISOString();

  await run(
    `INSERT INTO customer_sessions (
      customer_id,
      token_hash,
      created_at,
      last_seen_at,
      expires_at
    )
    VALUES (?, ?, ?, ?, ?)`,
    [
      customerId,
      tokenHash(token),
      createdAt,
      createdAt,
      expiresAt,
    ]
  );

  return {
    token,
    expiresAt,
    lifetimeMs,
  };
};

const setSessionCookie = (
  response,
  token,
  lifetimeMs
) => {
  response.cookie(
    SESSION_COOKIE,
    token,
    {
      httpOnly: true,
      sameSite:
        process.env.NODE_ENV ===
        "production"
          ? "none"
          : "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      maxAge: lifetimeMs,
      path: "/",
    }
  );
};

const clearSessionCookie = (
  response
) => {
  response.clearCookie(
    SESSION_COOKIE,
    {
      httpOnly: true,
      sameSite:
        process.env.NODE_ENV ===
        "production"
          ? "none"
          : "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
    }
  );
};

const attemptKey = (
  request,
  email
) =>
  `${
    request.ip ||
    request.socket?.remoteAddress ||
    "unknown"
  }:${email}`;

const isBlocked = (key) => {
  const entry =
    loginAttempts.get(key);

  if (!entry) {
    return false;
  }

  if (
    Date.now() -
      entry.startedAt >
    ATTEMPT_WINDOW_MS
  ) {
    loginAttempts.delete(key);
    return false;
  }

  return (
    entry.count >=
    MAX_LOGIN_ATTEMPTS
  );
};

const registerFailure = (key) => {
  const entry =
    loginAttempts.get(key);

  if (
    !entry ||
    Date.now() -
      entry.startedAt >
      ATTEMPT_WINDOW_MS
  ) {
    loginAttempts.set(key, {
      count: 1,
      startedAt: Date.now(),
    });

    return;
  }

  entry.count += 1;
};

const validateRegistration = ({
  firstName,
  lastName,
  email,
  password,
}) => {
  const errors = [];

  if (firstName.length < 2) {
    errors.push(
      "Vul je voornaam in."
    );
  }

  if (lastName.length < 2) {
    errors.push(
      "Vul je achternaam in."
    );
  }

  if (!isEmail(email)) {
    errors.push(
      "Vul een geldig e-mailadres in."
    );
  }

  if (password.length < 8) {
    errors.push(
      "Het wachtwoord moet minimaal 8 tekens bevatten."
    );
  }

  if (password.length > 128) {
    errors.push(
      "Het wachtwoord is te lang."
    );
  }

  return errors;
};

const sendPasswordResetEmail = async ({
  customer,
  resetUrl,
}) => {
  const apiKey =
    process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY ontbreekt."
    );
  }

  const firstName =
    customer.first_name || "";

  const response = await fetch(
    RESEND_API_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        from: RESEND_FROM,

        to: [customer.email],

        subject:
          "Wachtwoord herstellen | 2nd Life Toys",

        text:
          `Hallo ${firstName},\n\n` +
          `Via onderstaande link kun je een nieuw wachtwoord instellen:\n\n` +
          `${resetUrl}\n\n` +
          `Deze link is 1 uur geldig.\n\n` +
          `Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.\n\n` +
          `2nd Life Toys`,

        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:600px;margin:0 auto;">
            <h2 style="margin-bottom:20px;">
              Wachtwoord herstellen
            </h2>

            <p>
              Hallo ${firstName},
            </p>

            <p>
              Er is een verzoek gedaan om het wachtwoord van je 2nd Life Toys-account te wijzigen.
            </p>

            <p>
              Klik op onderstaande knop om een nieuw wachtwoord in te stellen.
            </p>

            <p style="margin:30px 0;">
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  background:#e8bd3c;
                  color:#111;
                  text-decoration:none;
                  font-weight:700;
                  padding:14px 22px;
                  border-radius:999px;
                "
              >
                Nieuw wachtwoord instellen
              </a>
            </p>

            <p>
              Deze herstel-link is 1 uur geldig.
            </p>

            <p>
              Heb je dit niet aangevraagd? Dan hoef je niets te doen en kun je deze e-mail negeren.
            </p>

            <p style="margin-top:30px;">
              Groet,<br>
              <strong>2nd Life Toys</strong>
            </p>
          </div>
        `,
      }),
    }
  );

  let result = {};

  try {
    result =
      await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    const message =
      result?.message ||
      result?.error ||
      `Resend API ${response.status}`;

    throw new Error(
      String(message)
    );
  }

  return result;
};

router.post(
  "/register",
  async (
    request,
    response,
    next
  ) => {
    try {
      const firstName =
        cleanText(
          request.body?.firstName,
          80
        );

      const lastName =
        cleanText(
          request.body?.lastName,
          100
        );

      const email =
        normalizeEmail(
          request.body?.email
        );

      const password =
        String(
          request.body?.password ||
            ""
        );

      const remember =
        Boolean(
          request.body?.remember
        );

      const termsAccepted =
        Boolean(
          request.body
            ?.termsAccepted
        );

      const errors =
        validateRegistration({
          firstName,
          lastName,
          email,
          password,
        });

      if (!termsAccepted) {
        errors.push(
          "Je moet akkoord gaan met de voorwaarden."
        );
      }

      if (errors.length) {
        return response
          .status(400)
          .json({
            error:
              "Controleer je gegevens.",
            details: errors,
          });
      }

      const existing =
        await get(
          `SELECT id
           FROM customers
           WHERE email = ?`,
          [email]
        );

      if (existing) {
        return response
          .status(409)
          .json({
            error:
              "Er bestaat al een account met dit e-mailadres.",
          });
      }

      const passwordHash =
        await hashPassword(
          password
        );

      const createdAt =
        nowIso();

      const inserted =
        await run(
          `INSERT INTO customers (
            first_name,
            last_name,
            email,
            password_hash,
            terms_accepted_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            firstName,
            lastName,
            email,
            passwordHash,
            createdAt,
            createdAt,
            createdAt,
          ]
        );

      const session =
        await createSession(
          inserted.lastID,
          remember
        );

      setSessionCookie(
        response,
        session.token,
        session.lifetimeMs
      );

      const customer =
        await get(
          `SELECT *
           FROM customers
           WHERE id = ?`,
          [inserted.lastID]
        );

      return response
        .status(201)
        .json({
          authenticated: true,
          token: session.token,
          expiresAt:
            session.expiresAt,
          user:
            publicCustomer(
              customer
            ),
        });
    } catch (error) {
      if (
        String(
          error?.message || ""
        ).includes(
          "UNIQUE constraint failed: customers.email"
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "Er bestaat al een account met dit e-mailadres.",
          });
      }

      return next(error);
    }
  }
);

router.post(
  "/forgot-password",
  async (
    request,
    response,
    next
  ) => {
    const genericResponse = {
      ok: true,
      message:
        "Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met een herstel-link.",
    };

    try {
      const email =
        normalizeEmail(
          request.body?.email
        );

      if (!isEmail(email)) {
        return response.json(
          genericResponse
        );
      }

      const customer =
        await get(
          `SELECT
            id,
            first_name,
            email
           FROM customers
           WHERE email = ?`,
          [email]
        );

      if (!customer) {
        return response.json(
          genericResponse
        );
      }

      const token = crypto
        .randomBytes(32)
        .toString(
          "base64url"
        );

      const hashedToken =
        tokenHash(token);

      const createdAt =
        nowIso();

      const expiresAt =
        new Date(
          Date.now() +
            RESET_TOKEN_TTL_MS
        ).toISOString();

      await run(
        `DELETE FROM customer_password_resets
         WHERE customer_id = ?`,
        [customer.id]
      );

      await run(
        `INSERT INTO customer_password_resets (
          customer_id,
          token_hash,
          created_at,
          expires_at,
          used_at
        )
        VALUES (?, ?, ?, ?, NULL)`,
        [
          customer.id,
          hashedToken,
          createdAt,
          expiresAt,
        ]
      );

      const resetUrl =
        `${SITE_URL}/account.html` +
        `?resetToken=${encodeURIComponent(
          token
        )}#reset`;

      try {
        await sendPasswordResetEmail({
          customer,
          resetUrl,
        });
      } catch (mailError) {
        console.error(
          "Resend password reset error:",
          mailError?.message ||
            mailError
        );

        return response
          .status(503)
          .json({
            error:
              "De herstelmail kon momenteel niet worden verstuurd. Probeer het later opnieuw.",
          });
      }

      return response.json(
        genericResponse
      );
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/login",
  async (
    request,
    response,
    next
  ) => {
    try {
      const email =
        normalizeEmail(
          request.body?.email
        );

      const password =
        String(
          request.body?.password ||
            ""
        );

      const remember =
        Boolean(
          request.body?.remember
        );

      const key =
        attemptKey(
          request,
          email
        );

      if (isBlocked(key)) {
        return response
          .status(429)
          .json({
            error:
              "Te veel mislukte inlogpogingen. Probeer het over 15 minuten opnieuw.",
          });
      }

      const customer =
        await get(
          `SELECT *
           FROM customers
           WHERE email = ?`,
          [email]
        );

      const valid =
        customer
          ? await verifyPassword(
              password,
              customer.password_hash
            )
          : false;

      if (
        !customer ||
        !valid
      ) {
        registerFailure(key);

        return response
          .status(401)
          .json({
            error:
              "E-mailadres of wachtwoord is onjuist.",
          });
      }

      loginAttempts.delete(key);

      const loggedInAt =
        nowIso();

      await run(
        `UPDATE customers
         SET last_login_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          loggedInAt,
          loggedInAt,
          customer.id,
        ]
      );

      const session =
        await createSession(
          customer.id,
          remember
        );

      setSessionCookie(
        response,
        session.token,
        session.lifetimeMs
      );

      const refreshed =
        await get(
          `SELECT *
           FROM customers
           WHERE id = ?`,
          [customer.id]
        );

      return response.json({
        authenticated: true,
        token: session.token,
        expiresAt:
          session.expiresAt,
        user:
          publicCustomer(
            refreshed
          ),
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/reset-password",
  async (
    request,
    response,
    next
  ) => {
    try {
      const token =
        String(
          request.body?.token ||
            ""
        ).trim();

      const newPassword =
        String(
          request.body
            ?.newPassword ||
            ""
        );

      if (!token) {
        return response
          .status(400)
          .json({
            error:
              "Ongeldige herstel-link.",
          });
      }

      if (
        newPassword.length <
          8 ||
        newPassword.length >
          128
      ) {
        return response
          .status(400)
          .json({
            error:
              "Het nieuwe wachtwoord moet tussen 8 en 128 tekens lang zijn.",
          });
      }

      const reset =
        await get(
          `SELECT *
           FROM customer_password_resets
           WHERE token_hash = ?
             AND used_at IS NULL
             AND expires_at > ?`,
          [
            tokenHash(token),
            nowIso(),
          ]
        );

      if (!reset) {
        return response
          .status(400)
          .json({
            error:
              "Deze herstel-link is ongeldig of verlopen.",
          });
      }

      const newHash =
        await hashPassword(
          newPassword
        );

      const updatedAt =
        nowIso();

      await run(
        `UPDATE customers
         SET password_hash = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          newHash,
          updatedAt,
          reset.customer_id,
        ]
      );

      await run(
        `UPDATE customer_password_resets
         SET used_at = ?
         WHERE id = ?`,
        [
          updatedAt,
          reset.id,
        ]
      );

      await run(
        `DELETE FROM customer_sessions
         WHERE customer_id = ?`,
        [
          reset.customer_id,
        ]
      );

      return response.json({
        ok: true,
        message:
          "Je wachtwoord is gewijzigd. Je kunt nu inloggen.",
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/me",
  requireCustomer,
  (
    request,
    response
  ) => {
    response.json({
      authenticated: true,
      user: publicCustomer(
        request
          .customerSession
          .customer
      ),
    });
  }
);

router.patch(
  "/profile",
  requireCustomer,
  async (
    request,
    response,
    next
  ) => {
    try {
      const customer =
        request
          .customerSession
          .customer;

      const firstName =
        cleanText(
          request.body
            ?.firstName ??
            customer.first_name,
          80
        );

      const lastName =
        cleanText(
          request.body
            ?.lastName ??
            customer.last_name,
          100
        );

      const phone =
        cleanText(
          request.body?.phone ??
            customer.phone,
          40
        );

      const street =
        cleanText(
          request.body?.street ??
            customer.street,
          120
        );

      const houseNumber =
        cleanText(
          request.body
            ?.houseNumber ??
            customer.house_number,
          30
        );

      const postalCode =
        cleanText(
          request.body
            ?.postalCode ??
            customer.postal_code,
          20
        ).toUpperCase();

      const city =
        cleanText(
          request.body?.city ??
            customer.city,
          100
        );

      const country =
        cleanText(
          request.body
            ?.country ??
            customer.country,
          80
        ) || "Nederland";

      if (
        firstName.length < 2 ||
        lastName.length < 2
      ) {
        return response
          .status(400)
          .json({
            error:
              "Voornaam en achternaam zijn verplicht.",
          });
      }

      await run(
        `UPDATE customers SET
          first_name = ?,
          last_name = ?,
          phone = ?,
          street = ?,
          house_number = ?,
          postal_code = ?,
          city = ?,
          country = ?,
          updated_at = ?
         WHERE id = ?`,
        [
          firstName,
          lastName,
          phone,
          street,
          houseNumber,
          postalCode,
          city,
          country,
          nowIso(),
          customer.id,
        ]
      );

      const updated =
        await get(
          `SELECT *
           FROM customers
           WHERE id = ?`,
          [customer.id]
        );

      return response.json({
        user:
          publicCustomer(
            updated
          ),
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/change-password",
  requireCustomer,
  async (
    request,
    response,
    next
  ) => {
    try {
      const customer =
        request
          .customerSession
          .customer;

      const currentPassword =
        String(
          request.body
            ?.currentPassword ||
            ""
        );

      const newPassword =
        String(
          request.body
            ?.newPassword ||
            ""
        );

      if (
        !(
          await verifyPassword(
            currentPassword,
            customer.password_hash
          )
        )
      ) {
        return response
          .status(401)
          .json({
            error:
              "Het huidige wachtwoord is onjuist.",
          });
      }

      if (
        newPassword.length <
          8 ||
        newPassword.length >
          128
      ) {
        return response
          .status(400)
          .json({
            error:
              "Het nieuwe wachtwoord moet tussen 8 en 128 tekens lang zijn.",
          });
      }

      const newHash =
        await hashPassword(
          newPassword
        );

      await run(
        `UPDATE customers
         SET password_hash = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          newHash,
          nowIso(),
          customer.id,
        ]
      );

      await run(
        `DELETE FROM customer_sessions
         WHERE customer_id = ?
           AND id <> ?`,
        [
          customer.id,
          customer.session_id,
        ]
      );

      return response.json({
        ok: true,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/orders",
  requireCustomer,
  async (
    request,
    response,
    next
  ) => {
    try {
      const email =
        normalizeEmail(
          request
            .customerSession
            .customer.email
        );

      const rows =
        await all(
          `SELECT *
           FROM orders
           ORDER BY
             datetime(created_at) DESC,
             id DESC
           LIMIT 500`
        );

      const matching =
        rows.filter((row) => {
          try {
            const customer =
              JSON.parse(
                row.customer_json ||
                  "{}"
              );

            return (
              normalizeEmail(
                customer?.email
              ) === email
            );
          } catch {
            return false;
          }
        });

      const orders = [];

      for (
        const order of matching
      ) {
        const items =
          await all(
            `SELECT
              product_id,
              quantity,
              unit_price,
              product_name,
              product_image
             FROM order_items
             WHERE order_id = ?
             ORDER BY id ASC`,
            [order.id]
          );

        orders.push({
          number: order.number,
          status:
            order.status ||
            "Nieuw",
          paymentStatus:
            order.payment_status ||
            "",
          createdAt:
            order.created_at,
          subtotal:
            Number(
              order.subtotal
            ) || 0,
          total:
            Number(
              order.total
            ) || 0,

          items: items.map(
            (item) => ({
              id:
                Number(
                  item.product_id
                ) || 0,

              name:
                item.product_name ||
                "",

              quantity:
                Number(
                  item.quantity
                ) || 0,

              price:
                Number(
                  item.unit_price
                ) || 0,

              image:
                item.product_image ||
                "",
            })
          ),
        });
      }

      return response.json({
        orders,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/logout",
  async (
    request,
    response,
    next
  ) => {
    try {
      const token =
        readToken(request);

      if (token) {
        await run(
          `DELETE FROM customer_sessions
           WHERE token_hash = ?`,
          [tokenHash(token)]
        );
      }

      clearSessionCookie(
        response
      );

      return response.json({
        authenticated: false,
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;