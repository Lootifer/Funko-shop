import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/*
 * Admin-config permanent opslaan.
 *
 * Volgorde:
 * 1. LOOTIFER_AUTH_FILE als die expliciet is ingesteld.
 * 2. Anders naast de database uit LOOTIFER_DB_PATH.
 *    Op Railway staat die database op het permanente volume.
 * 3. Lokaal terugvallen op Data/admin-auth.json.
 */
const getAuthFilePathInternal = () => {
  const explicitAuthFile = String(
    process.env.LOOTIFER_AUTH_FILE || ""
  ).trim();

  if (explicitAuthFile) {
    return path.resolve(explicitAuthFile);
  }

  const databasePath = String(
    process.env.LOOTIFER_DB_PATH || ""
  ).trim();

  if (databasePath) {
    const resolvedDatabasePath = path.resolve(databasePath);

    return path.join(
      path.dirname(resolvedDatabasePath),
      "admin-auth.json"
    );
  }

  return path.resolve(
    process.cwd(),
    "Data",
    "admin-auth.json"
  );
};

const AUTH_FILE = getAuthFilePathInternal();

const SESSION_HOURS = Math.max(
  1,
  Number(process.env.LOOTIFER_SESSION_HOURS) || 8
);

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

export const createPasswordHash = async (
  password,
  salt = crypto.randomBytes(16).toString("hex")
) => {
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(
      String(password),
      salt,
      64,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey.toString("hex"));
      }
    );
  });

  return {
    salt,
    hash,
  };
};

const readFileConfig = async () => {
  try {
    const raw = await fs.readFile(
      AUTH_FILE,
      "utf8"
    );

    const parsed = JSON.parse(raw);

    if (
      !parsed?.username ||
      !parsed?.passwordHash ||
      !parsed?.passwordSalt ||
      !parsed?.sessionSecret
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const getAuthConfig = async () => {
  const envUsername = String(
    process.env.LOOTIFER_ADMIN_USER || ""
  ).trim();

  const envPassword = String(
    process.env.LOOTIFER_ADMIN_PASSWORD || ""
  );

  const envSecret = String(
    process.env.LOOTIFER_SESSION_SECRET || ""
  ).trim();

  /*
   * Environment-variabelen hebben altijd voorrang.
   */
  if (envUsername && envPassword) {
    return {
      username: envUsername,
      plainPassword: envPassword,
      sessionSecret:
        envSecret ||
        "lootifer-test-session-secret-change-me",
      source: "environment",
    };
  }

  const fileConfig = await readFileConfig();

  return fileConfig
    ? {
        ...fileConfig,
        source: "file",
      }
    : null;
};

export const verifyCredentials = async (
  username,
  password
) => {
  const config = await getAuthConfig();

  if (!config) {
    return {
      valid: false,
      configured: false,
      config: null,
    };
  }

  if (
    !safeEqual(
      String(username).trim(),
      config.username
    )
  ) {
    return {
      valid: false,
      configured: true,
      config,
    };
  }

  if (config.plainPassword) {
    return {
      valid: safeEqual(
        password,
        config.plainPassword
      ),
      configured: true,
      config,
    };
  }

  const candidate = await createPasswordHash(
    password,
    config.passwordSalt
  );

  return {
    valid: safeEqual(
      candidate.hash,
      config.passwordHash
    ),
    configured: true,
    config,
  };
};

const encode = (value) =>
  Buffer.from(
    JSON.stringify(value)
  ).toString("base64url");

const decode = (value) =>
  JSON.parse(
    Buffer.from(
      value,
      "base64url"
    ).toString("utf8")
  );

const sign = (value, secret) =>
  crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64url");

export const createSessionToken = (
  username,
  secret
) => {
  const now = Date.now();

  const payload = encode({
    username,
    issuedAt: now,
    expiresAt:
      now +
      SESSION_HOURS *
        60 *
        60 *
        1000,
    nonce: crypto
      .randomBytes(12)
      .toString("hex"),
  });

  return `${payload}.${sign(
    payload,
    secret
  )}`;
};

export const verifySessionToken = async (
  token
) => {
  const config = await getAuthConfig();

  if (!config || !token) {
    return null;
  }

  const [payload, signature] =
    String(token).split(".");

  if (
    !payload ||
    !signature ||
    !safeEqual(
      signature,
      sign(
        payload,
        config.sessionSecret
      )
    )
  ) {
    return null;
  }

  try {
    const parsed = decode(payload);

    if (
      !parsed?.username ||
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }

    if (
      !safeEqual(
        parsed.username,
        config.username
      )
    ) {
      return null;
    }

    return {
      username: parsed.username,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
};

export const getAuthFilePath = () =>
  AUTH_FILE;

export const getSessionMaxAgeMs = () =>
  SESSION_HOURS *
  60 *
  60 *
  1000;