import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const PLACEHOLDER_DATABASE_URL = "PEGAR_AQUI_DATABASE_URL_REAL";
const PLACEHOLDER_API_KEY = "PEGAR_AQUI_FIREBASE_API_KEY";

function readEnv(name) {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env[name]) ||
    ""
  );
}

const firebaseConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY") || PLACEHOLDER_API_KEY,
  authDomain: "dulceespera-98785.firebaseapp.com",
  projectId: "dulceespera-98785",
  storageBucket: "dulceespera-98785.firebasestorage.app",
  messagingSenderId: "549764450384",
  appId: "1:549764450384:web:b454c4111edff5f575a955",
  // Pegá el databaseURL real en .env.local como VITE_FIREBASE_DATABASE_URL.
  databaseURL: readEnv("VITE_FIREBASE_DATABASE_URL") || PLACEHOLDER_DATABASE_URL,
};

export const isApiKeyConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.apiKey !== PLACEHOLDER_API_KEY
);

export const isDatabaseUrlConfigured = Boolean(
  firebaseConfig.databaseURL &&
    firebaseConfig.databaseURL !== PLACEHOLDER_DATABASE_URL &&
    /^https:\/\/.+\.(firebaseio\.com|firebasedatabase\.app)$/.test(
      firebaseConfig.databaseURL
    )
);

export const isFirebaseConfigured = isApiKeyConfigured && isDatabaseUrlConfigured;

export { firebaseConfig, PLACEHOLDER_DATABASE_URL };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = isDatabaseUrlConfigured ? getDatabase(app) : null;
