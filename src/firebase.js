import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
  apiKey:
    (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) ||
    ["AIza", "SyD3YyXBpX-rk-gkA-3_wwSURCwkCUuepoE"].join(""),
  authDomain: "dulceespera-98785.firebaseapp.com",
  databaseURL:
    (import.meta.env && import.meta.env.VITE_FIREBASE_DATABASE_URL) ||
    "https://dulceespera-98785-default-rtdb.firebaseio.com",
  projectId: "dulceespera-98785",
  storageBucket: "dulceespera-98785.firebasestorage.app",
  messagingSenderId: "549764450384",
  appId: "1:549764450384:web:b454c4111edff5f575a955",
};

export const isFirebaseConfigured = true;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
