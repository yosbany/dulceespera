const ACCESS_KEY = "dulceespera_access";
const ROLE_KEY = "dulceespera_role";

function readEnv(name, fallback) {
  return String(
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env[name]) ||
      fallback
  )
    .trim()
    .toLowerCase();
}

export const ACCESS_CODE = readEnv("VITE_ACCESS_CODE", "anisleymaikol");
export const ADMIN_CODE = readEnv("VITE_ADMIN_CODE", "anisleymaikol-admin");

export function hasAccess() {
  try {
    return window.localStorage.getItem(ACCESS_KEY) === "ok";
  } catch (error) {
    return false;
  }
}

export function isAdmin() {
  try {
    return hasAccess() && window.localStorage.getItem(ROLE_KEY) === "admin";
  } catch (error) {
    return false;
  }
}

export function grantAccess(input) {
  const typed = String(input || "").trim().toLowerCase();

  if (!typed) {
    return "";
  }

  let role = "";

  if (ADMIN_CODE && typed === ADMIN_CODE) {
    role = "admin";
  } else if (ACCESS_CODE && typed === ACCESS_CODE) {
    role = "guest";
  } else {
    return "";
  }

  try {
    window.localStorage.setItem(ACCESS_KEY, "ok");
    window.localStorage.setItem(ROLE_KEY, role);
  } catch (error) {
    console.error(error);
  }

  return role;
}

export function clearAccess() {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(ROLE_KEY);
  } catch (error) {
    console.error(error);
  }
}
