import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  get,
  onValue,
  ref,
  set,
  update,
} from "firebase/database";
import { auth, database } from "./firebase.js";
import { listFreeSlotIds, listOwnedSlotIds } from "./gifts.js";
import {
  INITIAL_GIFTS,
  buildGiftsRecord,
  buildSlotsRecord,
} from "./seed-data.js";

export const GUEST_NAME_KEY = "dulceespera_guest_name";

const MAX_RESERVE_RETRIES = 3;

export function listenAuth(callback) {
  if (!auth) {
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function ensureAnonymousUser() {
  if (!auth) {
    throw new Error("AUTH");
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await Promise.race([
    signInAnonymously(auth),
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("AUTH_TIMEOUT")), 12000);
    }),
  ]);
  return credential.user;
}

export async function seedIfEmpty() {
  const giftsSnap = await get(ref(database, "gifts"));
  if (giftsSnap.exists()) {
    return false;
  }

  try {
    await set(ref(database, "gifts"), buildGiftsRecord(INITIAL_GIFTS));
    await set(ref(database, "giftSlots"), buildSlotsRecord(INITIAL_GIFTS));
    return true;
  } catch (error) {
    console.error("No se pudo hacer el seed inicial.", error);
    throw error;
  }
}

export function getCurrentUid() {
  return auth.currentUser?.uid || "";
}

export function rememberGuestName(name) {
  try {
    window.localStorage.setItem(GUEST_NAME_KEY, name);
  } catch (error) {
    console.error("No se pudo guardar el nombre localmente.", error);
  }
}

export function readRememberedGuestName() {
  try {
    return window.localStorage.getItem(GUEST_NAME_KEY) || "";
  } catch (error) {
    console.error("No se pudo leer el nombre localmente.", error);
    return "";
  }
}

export function listenGifts(callback) {
  return onValue(ref(database, "gifts"), callback, (error) => {
    console.error("Error al escuchar gifts.", error);
    callback(null, error);
  });
}

export function listenGiftSlots(callback) {
  return onValue(ref(database, "giftSlots"), callback, (error) => {
    console.error("Error al escuchar giftSlots.", error);
    callback(null, error);
  });
}

export function listenMyReservations(uid, callback) {
  return onValue(ref(database, `userReservations/${uid}`), callback, (error) => {
    console.error("Error al escuchar reservas propias.", error);
    callback(null, error);
  });
}

function createReservationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `res_${crypto.randomUUID()}`;
  }

  return `res_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeGuestName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function groupMyReservations(reservationsValue = {}) {
  const grouped = {};

  Object.entries(reservationsValue || {}).forEach(([reservationId, reservation]) => {
    if (!reservation?.giftId) {
      return;
    }

    if (!grouped[reservation.giftId]) {
      grouped[reservation.giftId] = {
        giftId: reservation.giftId,
        giftName: reservation.giftName || "",
        quantity: 0,
        reservationIds: [],
      };
    }

    grouped[reservation.giftId].quantity += Number(reservation.quantity) || 0;
    grouped[reservation.giftId].reservationIds.push(reservationId);

    if (reservation.giftName) {
      grouped[reservation.giftId].giftName = reservation.giftName;
    }
  });

  return grouped;
}

export async function reserveGift({ gift, slots, quantity, guestName }) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("AUTH");
  }

  const name = sanitizeGuestName(guestName);

  if (name.length < 2) {
    throw new Error("NAME_SHORT");
  }

  if (name.length > 80) {
    throw new Error("NAME_LONG");
  }

  const requested = Number.parseInt(quantity, 10);

  if (!requested || requested < 1) {
    throw new Error("QUANTITY");
  }

  if (!gift?.id || !gift.active) {
    throw new Error("GIFT");
  }

  let lastError = null;
  let currentSlots = slots;

  for (let attempt = 1; attempt <= MAX_RESERVE_RETRIES; attempt += 1) {
    try {
      await attemptReserve({
        gift,
        slots: currentSlots,
        quantity: requested,
        guestName: name,
        uid,
      });
      rememberGuestName(name);
      return {
        giftName: gift.name,
        quantity: requested,
      };
    } catch (error) {
      lastError = error;

      if (error.message !== "RACE") {
        throw error;
      }

      const fresh = await get(ref(database, `giftSlots/${gift.id}`));
      currentSlots = fresh.val() || {};
    }
  }

  throw lastError || new Error("RACE");
}

async function attemptReserve({ gift, slots, quantity, guestName, uid }) {
  const freeSlotIds = listFreeSlotIds(slots);

  if (freeSlotIds.length < quantity) {
    throw new Error(freeSlotIds.length <= 0 ? "FULL" : "REMAINING");
  }

  const reservationId = createReservationId();
  const selectedSlots = freeSlotIds.slice(0, quantity);
  const updates = {};

  selectedSlots.forEach((slotId) => {
    updates[`giftSlots/${gift.id}/${slotId}`] = {
      claimedBy: uid,
      reservationId,
    };
  });

  updates[`userReservations/${uid}/${reservationId}`] = {
    giftId: gift.id,
    giftName: gift.name,
    quantity,
    guestName,
    createdAt: Date.now(),
  };

  try {
    await update(ref(database), updates);
  } catch (error) {
    console.error("Fallo al reservar.", error);

    if (isPermissionDenied(error)) {
      throw new Error("RACE");
    }

    throw new Error("NETWORK");
  }
}

export async function releaseMyGift({ giftId, slots, myReservations }) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("AUTH");
  }

  const mine = myReservations[giftId];

  if (!mine || !mine.reservationIds.length) {
    throw new Error("NOT_FOUND");
  }

  const ownedSlotIds =
    listOwnedSlotIds(slots, uid, mine.reservationIds).length
      ? listOwnedSlotIds(slots, uid, mine.reservationIds)
      : listOwnedSlotIds(slots, uid);
  const updates = {};

  ownedSlotIds.forEach((slotId) => {
    updates[`giftSlots/${giftId}/${slotId}`] = {
      claimedBy: "",
      reservationId: "",
    };
  });

  mine.reservationIds.forEach((reservationId) => {
    updates[`userReservations/${uid}/${reservationId}`] = null;
  });

  try {
    await update(ref(database), updates);
  } catch (error) {
    console.error("Fallo al quitar la reserva.", error);
    throw new Error("NETWORK");
  }

  return {
    giftName: mine.giftName,
    quantity: mine.quantity,
  };
}

function isPermissionDenied(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code.includes("permission-denied") ||
    message.toLowerCase().includes("permission_denied")
  );
}
