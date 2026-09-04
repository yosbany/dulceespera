import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INITIAL_GIFTS,
  buildEmptySlots,
  buildGiftsRecord,
  buildSlotsRecord,
} from "../src/seed-data.js";

const DEFAULT_DATABASE_URL =
  "https://dulceespera-98785-default-rtdb.firebaseio.com";
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readEnvLocal() {
  const envPath = resolve(rootDir, ".env.local");

  if (!existsSync(envPath)) {
    return {};
  }

  const values = {};

  readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const index = trimmed.indexOf("=");
      if (index === -1) {
        return;
      }

      values[trimmed.slice(0, index)] = trimmed.slice(index + 1).trim();
    });

  return values;
}

function resolveDatabaseUrl() {
  const envLocal = readEnvLocal();
  return (
    process.env.VITE_FIREBASE_DATABASE_URL ||
    process.env.FIREBASE_DATABASE_URL ||
    envLocal.VITE_FIREBASE_DATABASE_URL ||
    envLocal.FIREBASE_DATABASE_URL ||
    DEFAULT_DATABASE_URL
  );
}

function resolveServiceAccount() {
  const envLocal = readEnvLocal();
  const fromEnv =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    envLocal.GOOGLE_APPLICATION_CREDENTIALS ||
    envLocal.FIREBASE_SERVICE_ACCOUNT;

  const candidates = [
    fromEnv,
    resolve(rootDir, "serviceAccount.json"),
  ].filter(Boolean);

  return candidates.find((path) => existsSync(path)) || "";
}

function printHelp() {
  console.log(`
Seed de regalos — Dulce Espera

Uso:
  npm run seed
  npm run seed -- --force

El seed NUNCA corre desde el navegador público.

Sin --force:
  - Si /gifts ya tiene datos, no hace nada.

Con --force:
  - Actualiza la definición de /gifts.
  - Crea slots faltantes para regalos nuevos o cupos ampliados.
  - NO resetea reservas ya tomadas.

Este script necesita credenciales de Admin SOLO en tu máquina.
No las subas al repositorio.

1. Firebase Console → Project settings → Service accounts
2. Generate new private key
3. Guardala como ./serviceAccount.json (está en .gitignore)

También necesitás el databaseURL real en .env.local:

VITE_FIREBASE_DATABASE_URL=https://xxxx.firebaseio.com
`);
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    printHelp();
    return;
  }

  const force = hasFlag("--force");
  const databaseURL = resolveDatabaseUrl();
  const serviceAccountPath = resolveServiceAccount();

  if (!databaseURL) {
    printHelp();
    throw new Error(
      "Falta databaseURL. Pegalo en .env.local como VITE_FIREBASE_DATABASE_URL."
    );
  }

  if (!serviceAccountPath) {
    printHelp();
    throw new Error(
      "Falta serviceAccount.json. Este archivo es solo local y no debe commitearse."
    );
  }

  const { default: admin } = await import("firebase-admin");
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });
  }

  const db = admin.database();
  const giftsSnap = await db.ref("gifts").get();

  if (giftsSnap.exists() && !force) {
    const count = Object.keys(giftsSnap.val() || {}).length;
    console.log(
      `Ya hay ${count} regalos en /gifts. No se sobrescribieron.\nSi querés actualizar definiciones y crear slots faltantes:\n  npm run seed -- --force`
    );
    return;
  }

  const giftsRecord = buildGiftsRecord(INITIAL_GIFTS);
  const existingSlotsSnap = await db.ref("giftSlots").get();
  const existingSlots = existingSlotsSnap.val() || {};
  const nextSlots = {};

  INITIAL_GIFTS.forEach((gift) => {
    const current = existingSlots[gift.id] || {};
    const empty = buildEmptySlots(gift.total);
    const merged = {};

    Object.keys(empty).forEach((slotId) => {
      merged[slotId] = current[slotId] || empty[slotId];
    });

    nextSlots[gift.id] = merged;
  });

  await db.ref("gifts").set(giftsRecord);

  if (!existingSlotsSnap.exists()) {
    await db.ref("giftSlots").set(buildSlotsRecord(INITIAL_GIFTS));
  } else {
    await db.ref("giftSlots").update(nextSlots);
  }

  console.log(
    force
      ? `Seed forzado: ${INITIAL_GIFTS.length} regalos actualizados. Slots existentes conservados.`
      : `Seed inicial listo: ${INITIAL_GIFTS.length} regalos y sus cupos.`
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
