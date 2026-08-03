import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPasswordHash, getAuthFilePath } from "../src/auth/config.js";

const rl = readline.createInterface({ input, output });

const askHidden = async (label) => {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    return rl.question(label);
  }

  rl.pause();
  output.write(label);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      rl.resume();
      output.write("\n");
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Setup afgebroken."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    };
    input.on("data", onData);
  });
};

try {
  const defaultUsername = String(process.env.LOOTIFER_ADMIN_USER || "admin").trim() || "admin";
  const username = (await rl.question(`Gebruikersnaam (${defaultUsername}): `)).trim() || defaultUsername;
  const password = await askHidden("Nieuw wachtwoord (minimaal 10 tekens): ");
  const confirmation = await askHidden("Herhaal wachtwoord: ");

  if (password.length < 10) throw new Error("Het wachtwoord moet minimaal 10 tekens bevatten.");
  if (password !== confirmation) throw new Error("De wachtwoorden komen niet overeen.");

  const { salt, hash } = await createPasswordHash(password);
  const filePath = getAuthFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({
    username,
    passwordSalt: salt,
    passwordHash: hash,
    sessionSecret: crypto.randomBytes(48).toString("hex"),
    createdAt: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });

  console.log(`Admin-login ingesteld voor '${username}'.`);
  console.log(`Configuratie opgeslagen in: ${filePath}`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  rl.close();
}
