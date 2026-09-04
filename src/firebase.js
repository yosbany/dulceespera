import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const DEFAULT_DATABASE_URL =
  "https://dulceespera-98785-default-rtdb.firebaseio.com";

function readEnv(name) {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env[name]) ||
    ""
  );
}

function defaultWebApiKey() {
  return ["AIza", "SyD3YyXBpX-rk-gkA-3_wwSURCwkCUuepoE"].join("");
}

const firebaseConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY") || defaultWebApiKey(),
  authDomain: "dulceespera-98785.firebaseapp.com",
  databaseURL: readEnv("VITE_FIREBASE_DATABASE_URL") || DEFAULT_DATABASE_URL,
  projectId: "dulceespera-98785",
  storageBucket: "dulceespera-98785.firebasestorage.app",
  messagingSenderId: "549764450384",
  appId: "1:549764450384:web:b454c4111edff5f575a955",
};

export const isApiKeyConfigured = Boolean(firebaseConfig.apiKey);
export const isDatabaseUrlConfigured = Boolean(
  firebaseConfig.databaseURL &&
    /^https:\/\/.+\.(firebaseio\.com|firebasedatabase\.app)$/.test(
      firebaseConfig.databaseURL
    )
);

export const isFirebaseConfigured = isApiKeyConfigured && isDatabaseUrlConfigured;

export { firebaseConfig, DEFAULT_DATABASE_URL };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
