import { clearAccess, grantAccess, hasAccess, isAdmin } from "./access.js";
import { createGift, removeGift, restoreGift } from "./admin.js";
import "./firebase.js";
import {
  countAvailableTypes,
  countChosenUnits,
  decorateGift,
  normalizeGifts,
} from "./gifts.js";
import {
  ensureAnonymousUser,
  seedIfEmpty,
  groupMyReservations,
  groupReservationsByGift,
  listenAllReservations,
  listenAuth,
  listenGiftSlots,
  listenGifts,
  listenMyReservations,
  releaseMyGift,
  reserveGift,
} from "./reservations.js";
import {
  closeSheet,
  openAdminGiftSheet,
  openReleaseSheet,
  openRemoveGiftSheet,
  openReserveSheet,
  renderAdminBar,
  renderError,
  renderFilters,
  renderGiftList,
  renderMyGifts,
  renderStats,
  setBusyState,
  showScreen,
  showToast,
} from "./ui.js";

const state = {
  uid: "",
  gifts: [],
  giftsById: {},
  allGiftIds: [],
  maxOrder: 0,
  slots: {},
  myReservations: {},
  guestsByGift: {},
  category: "all",
  busy: false,
  giftsReady: false,
  slotsReady: false,
  reservationsReady: false,
  guestsReady: false,
  unsubGifts: null,
  unsubSlots: null,
  unsubReservations: null,
  unsubGuests: null,
};

function friendlyReserveError(code, remaining) {
  switch (code) {
    case "NAME_SHORT":
      return "Ingresá tu nombre para reservar el regalito.";
    case "NAME_LONG":
      return "El nombre es demasiado largo.";
    case "QUANTITY":
      return "Elegí una cantidad válida.";
    case "FULL":
      return "Este regalito acaba de completarse 🩷🩵";
    case "REMAINING":
      return remaining
        ? `Solo quedan ${remaining} disponibles.`
        : "Ya no quedan suficientes unidades.";
    case "RACE":
      return "Este regalito se reservó al mismo tiempo. Probá de nuevo.";
    case "AUTH":
      return "No pudimos identificarte. Tocá Reintentar.";
    case "GIFT":
      return "Este regalito ya no está disponible.";
    default:
      return "No pudimos completar la reserva. Intentá otra vez.";
  }
}

function friendlyAdminError(code) {
  switch (code) {
    case "NAME":
      return "El nombre del regalito tiene que tener entre 2 y 80 letras.";
    case "DESCRIPTION":
      return "La descripción tiene que tener entre 2 y 160 letras.";
    case "CATEGORY":
      return "Elegí una categoría.";
    default:
      return "No pudimos guardar el cambio. Si acabás de publicar las reglas de Firebase, recargá e intentá de nuevo.";
  }
}

function currentGiftsView() {
  return state.gifts
    .map((gift) =>
      decorateGift(
        gift,
        state.slots[gift.id],
        state.myReservations[gift.id]?.quantity || 0
      )
    )
    .filter((gift) => state.category === "all" || gift.category === state.category);
}

function renderApp() {
  if (!state.giftsReady || !state.slotsReady || !state.reservationsReady || !state.guestsReady) {
    return;
  }

  const admin = isAdmin();

  if (!state.gifts.length && !admin) {
    renderError("Los regalitos todavía se están preparando. En un ratito ya van a estar listos.");
    return;
  }

  const decorated = state.gifts.map((gift) =>
    decorateGift(
      gift,
      state.slots[gift.id],
      state.myReservations[gift.id]?.quantity || 0
    )
  );

  renderAdminBar(admin);
  renderStats({
    availableTypes: countAvailableTypes(decorated.filter((gift) => gift.active)),
    chosenUnits: countChosenUnits(state.slots),
  });

  renderFilters(state.category, (category) => {
    state.category = category;
    renderApp();
  });

  renderMyGifts(state.myReservations, state.giftsById, openRelease, state.busy);
  renderGiftList(
    currentGiftsView(),
    openReserve,
    state.busy,
    admin
      ? {
          onRemove: openRemove,
          onRestore,
          guestsByGift: state.guestsByGift,
        }
      : null
  );
  showScreen("main");
}

function openReserve(gift) {
  if (state.busy || gift.active === false || gift.remaining <= 0) {
    return;
  }

  openReserveSheet(
    gift,
    async ({ name, quantity }) => {
      state.busy = true;
      setBusyState(true);

      try {
        const result = await reserveGift({
          gift,
          slots: state.slots[gift.id],
          quantity,
          guestName: name,
        });
        closeSheet();
        showToast(
          `🎁 ¡Gracias! Elegiste ${result.giftName}. Tu regalito quedó reservado para el bebé de Anisley y Maikol. 🩷🩵`
        );
      } catch (error) {
        console.error(error);
        showToast(friendlyReserveError(error.message, gift.remaining));
        throw error;
      } finally {
        state.busy = false;
        setBusyState(false);
        renderApp();
      }
    },
    closeSheet
  );
}

function openRelease(item) {
  if (state.busy) {
    return;
  }

  openReleaseSheet(
    item,
    async () => {
      state.busy = true;
      setBusyState(true);

      try {
        const result = await releaseMyGift({
          giftId: item.giftId,
          slots: state.slots[item.giftId],
          myReservations: state.myReservations,
        });
        closeSheet();
        showToast(`✓ ${result.giftName} vuelve a estar disponible. 🩷🩵`);
      } catch (error) {
        console.error(error);
        showToast("No pudimos quitar la reserva. Intentá de nuevo.");
        throw error;
      } finally {
        state.busy = false;
        setBusyState(false);
        renderApp();
      }
    },
    closeSheet
  );
}

function openAddGift() {
  if (state.busy || !isAdmin()) {
    return;
  }

  openAdminGiftSheet(async (payload) => {
    state.busy = true;
    setBusyState(true);

    try {
      const result = await createGift({
        ...payload,
        existingIds: state.allGiftIds,
        order: state.maxOrder + 1,
      });
      closeSheet();
      showToast(`✓ Agregamos ${result.giftName}.`);
    } catch (error) {
      console.error(error);
      showToast(friendlyAdminError(error.message));
      throw error;
    } finally {
      state.busy = false;
      setBusyState(false);
      renderApp();
    }
  }, closeSheet);
}

function openRemove(gift) {
  if (state.busy || !isAdmin()) {
    return;
  }

  const decorated = decorateGift(
    gift,
    state.slots[gift.id],
    state.myReservations[gift.id]?.quantity || 0
  );

  openRemoveGiftSheet(
    decorated,
    async () => {
      state.busy = true;
      setBusyState(true);

      try {
        const result = await removeGift({
          gift,
          slots: state.slots[gift.id],
        });
        closeSheet();
        showToast(
          result.hidden
            ? `✓ ${result.giftName} quedó oculto para los invitados.`
            : `✓ Quitamos ${result.giftName}.`
        );
      } catch (error) {
        console.error(error);
        showToast(friendlyAdminError(error.message));
        throw error;
      } finally {
        state.busy = false;
        setBusyState(false);
        renderApp();
      }
    },
    closeSheet
  );
}

async function onRestore(gift) {
  if (state.busy || !isAdmin()) {
    return;
  }

  state.busy = true;
  setBusyState(true);

  try {
    const result = await restoreGift(gift);
    showToast(`✓ ${result.giftName} volvió a la lista.`);
  } catch (error) {
    console.error(error);
    showToast(friendlyAdminError(error.message));
  } finally {
    state.busy = false;
    setBusyState(false);
    renderApp();
  }
}

function startDataListeners(uid) {
  if (state.unsubGifts) {
    state.unsubGifts();
  }

  if (state.unsubSlots) {
    state.unsubSlots();
  }

  if (state.unsubReservations) {
    state.unsubReservations();
  }

  if (state.unsubGuests) {
    state.unsubGuests();
    state.unsubGuests = null;
  }

  state.unsubGifts = listenGifts((snapshot, error) => {
    if (error) {
      renderError("No pudimos cargar los regalitos. Revisá tu conexión e intentá de nuevo.");
      return;
    }

    const raw = snapshot.val() || {};
    state.allGiftIds = Object.keys(raw);
    state.maxOrder = Math.max(
      0,
      ...Object.values(raw).map((gift) => Number(gift?.order) || 0)
    );
    state.gifts = normalizeGifts(raw, { includeInactive: isAdmin() });
    state.giftsById = Object.fromEntries(state.gifts.map((gift) => [gift.id, gift]));
    state.giftsReady = true;
    renderApp();
  });

  state.unsubSlots = listenGiftSlots((snapshot, error) => {
    if (error) {
      renderError("No pudimos actualizar la disponibilidad. Intentá de nuevo.");
      return;
    }

    state.slots = snapshot.val() || {};
    state.slotsReady = true;
    renderApp();
  });

  state.unsubReservations = listenMyReservations(uid, (snapshot, error) => {
    if (error) {
      renderError("No pudimos cargar tus regalos. Intentá de nuevo.");
      return;
    }

    state.myReservations = groupMyReservations(snapshot.val() || {});
    state.reservationsReady = true;
    renderApp();
  });

  if (!isAdmin()) {
    state.guestsByGift = {};
    state.guestsReady = true;
    renderApp();
    return;
  }

  state.guestsReady = false;
  state.unsubGuests = listenAllReservations((snapshot, error) => {
    if (error) {
      console.error(error);
      state.guestsByGift = {};
      state.guestsReady = true;
      renderApp();
      return;
    }

    state.guestsByGift = groupReservationsByGift(snapshot.val() || {});
    state.guestsReady = true;
    renderApp();
  });
}

async function boot() {
  showScreen("boot");

  try {
    await ensureAnonymousUser();
    try {
      await seedIfEmpty();
    } catch (seedError) {
      console.error(seedError);
    }
  } catch (error) {
    console.error(error);
    const code = String(error?.code || error?.message || "");
    if (
      code.includes("admin-restricted-operation") ||
      code.includes("AUTH_TIMEOUT") ||
      code.includes("unauthorized-domain")
    ) {
      renderError(
        "Firebase bloqueó el ingreso anónimo. En Authentication → Sign-in method habilitá Anonymous, y en Authentication → Settings → Authorized domains agregá dulceespera.nrdonline.site."
      );
      return;
    }
    renderError(
      "No pudimos entrar de forma anónima. Revisá que Anonymous Authentication esté habilitada."
    );
  }
}

function startApp() {
  listenAuth((user) => {
    if (!user) {
      return;
    }

    state.uid = user.uid;
    startDataListeners(user.uid);
  });

  boot();
}

function leaveList() {
  clearAccess();
  window.location.reload();
}

function bindChrome() {
  document.getElementById("retry-button").addEventListener("click", () => {
    state.giftsReady = false;
    state.slotsReady = false;
    state.reservationsReady = false;
    state.guestsReady = false;
    boot();
  });

  document.getElementById("add-gift-button").addEventListener("click", openAddGift);
  document.getElementById("leave-button").addEventListener("click", leaveList);

  document.getElementById("gate-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("access-code");
    const error = document.getElementById("gate-error");

    if (grantAccess(input.value)) {
      error.hidden = true;
      showScreen("boot");
      startApp();
      return;
    }

    error.hidden = false;
    input.focus();
    input.select();
  });
}

bindChrome();

if (hasAccess()) {
  startApp();
} else {
  showScreen("gate");
}
