export const CATEGORIES = [
  "Pañales y cuidado",
  "Baño e higiene",
  "Ropita",
  "Alimentación",
  "Dormir",
  "Paseo y organización",
  "Juego y estimulación",
];

export const CATEGORY_ICONS = {
  "Pañales y cuidado": "🧴",
  "Baño e higiene": "🛁",
  Ropita: "👶",
  Alimentación: "🍼",
  Dormir: "🌙",
  "Paseo y organización": "🧸",
  "Juego y estimulación": "⭐",
};

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || "🎁";
}

export function countReservedSlots(slots) {
  if (!slots) {
    return 0;
  }

  return Object.values(slots).filter((slot) => slot && slot.claimedBy).length;
}

export function listFreeSlotIds(slots) {
  if (!slots) {
    return [];
  }

  return Object.keys(slots)
    .filter((slotId) => slots[slotId] && !slots[slotId].claimedBy)
    .sort();
}

export function listOwnedSlotIds(slots, uid, reservationIds = null) {
  if (!slots || !uid) {
    return [];
  }

  return Object.keys(slots).filter((slotId) => {
    const slot = slots[slotId];
    if (!slot || slot.claimedBy !== uid) {
      return false;
    }

    if (!reservationIds) {
      return true;
    }

    return reservationIds.includes(slot.reservationId);
  });
}

export function normalizeGifts(giftsValue = {}, { includeInactive = false } = {}) {
  return Object.entries(giftsValue)
    .map(([id, gift]) => ({
      id,
      category: gift.category || "",
      name: gift.name || "",
      description: gift.description || "",
      total: Math.max(1, Number(gift.total) || 1),
      active: gift.active !== false,
      order: Number(gift.order) || 999,
    }))
    .filter((gift) => includeInactive || gift.active)
    .sort((left, right) => left.order - right.order);
}

export function decorateGift(gift, slots, myQuantity) {
  const hasSlots = Boolean(slots && Object.keys(slots).length);
  const reserved = countReservedSlots(slots);
  const remaining = hasSlots ? Math.max(0, gift.total - reserved) : 0;

  return {
    ...gift,
    reserved,
    remaining,
    myReserved: myQuantity || 0,
    available: remaining > 0,
    repeatable: gift.total > 1,
    progress: gift.total > 0 ? Math.min(100, (reserved / gift.total) * 100) : 0,
  };
}

export function countAvailableTypes(gifts) {
  return gifts.filter((gift) => gift.remaining > 0).length;
}

export function countChosenUnits(allSlots) {
  if (!allSlots) {
    return 0;
  }

  return Object.values(allSlots).reduce(
    (sum, slots) => sum + countReservedSlots(slots),
    0
  );
}
