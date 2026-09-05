const STORAGE_KEY = "dulceespera_access";

export const ACCESS_CODE = String(
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_ACCESS_CODE) ||
    "anisleymaikol"
)
  .trim()
  .toLowerCase();

export function hasAccess() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "ok";
  } catch (error) {
    return false;
  }
}

export function grantAccess(input) {
  const typed = String(input || "").trim().toLowerCase();

  if (!typed || typed !== ACCESS_CODE) {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, "ok");
  } catch (error) {
    console.error(error);
  }

  return true;
}
