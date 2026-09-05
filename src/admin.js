import { ref, update } from "firebase/database";
import { database } from "./firebase.js";
import { countReservedSlots } from "./gifts.js";
import { buildEmptySlots } from "./seed-data.js";

export function nextGiftId(existingIds = []) {
  const numbers = existingIds
    .map((id) => Number(String(id).replace(/^gift-/, "")))
    .filter((value) => Number.isFinite(value));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `gift-${String(next).padStart(3, "0")}`;
}

export async function createGift({ category, name, description, total, existingIds, order }) {
  const giftName = String(name || "").trim();
  const giftDescription = String(description || "").trim();
  const giftCategory = String(category || "").trim();
  const giftTotal = Math.max(1, Number.parseInt(total, 10) || 1);

  if (giftName.length < 2 || giftName.length > 80) {
    throw new Error("NAME");
  }

  if (giftDescription.length < 2 || giftDescription.length > 160) {
    throw new Error("DESCRIPTION");
  }

  if (!giftCategory) {
    throw new Error("CATEGORY");
  }

  const giftId = nextGiftId(existingIds);

  await update(ref(database), {
    [`gifts/${giftId}`]: {
      category: giftCategory,
      name: giftName,
      description: giftDescription,
      total: giftTotal,
      active: true,
      order: Number(order) || 999,
    },
    [`giftSlots/${giftId}`]: buildEmptySlots(giftTotal),
  });

  return { giftId, giftName };
}

export async function removeGift({ gift, slots }) {
  if (!gift?.id) {
    throw new Error("GIFT");
  }

  const reserved = countReservedSlots(slots);

  if (reserved > 0) {
    await update(ref(database), {
      [`gifts/${gift.id}/active`]: false,
    });
    return { giftName: gift.name, hidden: true };
  }

  await update(ref(database), {
    [`gifts/${gift.id}`]: null,
    [`giftSlots/${gift.id}`]: null,
  });

  return { giftName: gift.name, hidden: false };
}

export async function restoreGift(gift) {
  if (!gift?.id) {
    throw new Error("GIFT");
  }

  await update(ref(database), {
    [`gifts/${gift.id}/active`]: true,
  });

  return { giftName: gift.name };
}
