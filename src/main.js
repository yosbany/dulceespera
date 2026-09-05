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
  listenAuth,
  listenGiftSlots,
  listenGifts,
  listenMyReservations,
  releaseMyGift,
  reserveGift,
} from "./reservations.js";
import {
  closeSheet,
  openReleaseSheet,
  openReserveSheet,
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
  slots: {},
  myReservations: {},
  category: "all",
  busy: false,
  giftsReady: false,
  slotsReady: false,
  reservationsReady: false,
  unsubGifts: null,
  unsubSlots: null,
  unsubReservations: null,
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
  if (!state.giftsReady || !state.slotsReady || !state.reservationsReady) {
    return;
  }

  if (!state.gifts.length) {
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

  renderStats({
    availableTypes: countAvailableTypes(decorated),
    chosenUnits: countChosenUnits(state.slots),
  });

  renderFilters(state.category, (category) => {
    state.category = category;
    renderApp();
  });

  renderMyGifts(state.myReservations, state.giftsById, openRelease, state.busy);
  renderGiftList(currentGiftsView(), openReserve, state.busy);
  showScreen("main");
}

function openReserve(gift) {
  if (state.busy || gift.remaining <= 0) {
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
        showToast("No pudimos quitar la reserva. Intentá otra vez.");
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

  state.unsubGifts = listenGifts((snapshot, error) => {
    if (error) {
      renderError("No pudimos cargar los regalitos. Revisá tu conexión e intentá de nuevo.");
      return;
    }

    state.gifts = normalizeGifts(snapshot.val() || {});
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

function bindChrome() {
  document.getElementById("retry-button").addEventListener("click", () => {
    state.giftsReady = false;
    state.slotsReady = false;
    state.reservationsReady = false;
    boot();
  });
}

listenAuth((user) => {
  if (!user) {
    return;
  }

  state.uid = user.uid;
  startDataListeners(user.uid);
});

bindChrome();
boot();
