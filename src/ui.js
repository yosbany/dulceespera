import { CATEGORIES, getCategoryIcon } from "./gifts.js";
import { readRememberedGuestName } from "./reservations.js";

const TOAST_MS = 4200;

export function showScreen(name) {
  const boot = document.getElementById("boot-screen");
  const error = document.getElementById("error-screen");
  const setup = document.getElementById("setup-screen");
  const main = document.getElementById("main");

  boot.hidden = name !== "boot";
  error.hidden = name !== "error";
  setup.hidden = name !== "setup";
  main.hidden = name !== "main";
}

export function renderError(message) {
  document.getElementById("error-message").textContent = message;
  showScreen("error");
}

export function renderStats({ availableTypes, chosenUnits }) {
  document.getElementById("stat-available").textContent = String(availableTypes);
  document.getElementById("stat-chosen").textContent = String(chosenUnits);
}

export function renderFilters(activeCategory, onSelect) {
  const root = document.getElementById("filters");
  root.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `filter-chip filter-all${activeCategory === "all" ? " is-active" : ""}`;
  allButton.setAttribute("aria-pressed", activeCategory === "all" ? "true" : "false");
  allButton.textContent = "✨ Todos";
  allButton.addEventListener("click", () => onSelect("all"));
  root.appendChild(allButton);

  CATEGORIES.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${activeCategory === category ? " is-active" : ""}`;
    button.setAttribute("aria-pressed", activeCategory === category ? "true" : "false");
    button.textContent = `${getCategoryIcon(category)} ${category}`;
    button.addEventListener("click", () => onSelect(category));
    root.appendChild(button);
  });
}

export function renderMyGifts(groups, giftsById, onSelect, busy) {
  const section = document.getElementById("my-gifts");
  const list = document.getElementById("my-gifts-list");
  const items = Object.values(groups);

  if (!items.length) {
    section.hidden = true;
    list.innerHTML = "";
    return;
  }

  section.hidden = false;
  list.innerHTML = "";

  items
    .sort((left, right) => {
      const leftOrder = giftsById[left.giftId]?.order || 999;
      const rightOrder = giftsById[right.giftId]?.order || 999;
      return leftOrder - rightOrder;
    })
    .forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "my-gift";
      button.disabled = busy;
      button.setAttribute(
        "aria-label",
        `${item.giftName}. ${item.quantity} ${item.quantity === 1 ? "unidad reservada" : "unidades reservadas"}. Tocá para quitar tu reserva.`
      );

      button.innerHTML = `
        <span class="my-gift-check" aria-hidden="true">✓</span>
        <span class="my-gift-copy">
          <strong>${escapeHtml(item.giftName)}</strong>
          <small>${item.quantity} ${item.quantity === 1 ? "unidad reservada" : "unidades reservadas"}</small>
          <em>Tocá para quitar tu reserva</em>
        </span>
        <span class="my-gift-arrow" aria-hidden="true">›</span>
      `;

      button.addEventListener("click", () => onSelect(item));
      list.appendChild(button);
    });
}

export function renderGiftList(gifts, onReserve, busy) {
  const root = document.getElementById("gift-list");
  root.innerHTML = "";

  if (!gifts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No hay regalitos en esta categoría por ahora.";
    root.appendChild(empty);
    return;
  }

  gifts.forEach((gift) => {
    const article = document.createElement("article");
    article.className = "gift-card";
    article.dataset.giftId = gift.id;

    const chosen = gift.myReserved > 0;
    const completed = gift.remaining <= 0;
    const statusLabel = completed
      ? "Completado"
      : chosen
        ? "Elegido por vos"
        : "Disponible";
    const statusClass = completed
      ? "is-done"
      : chosen
        ? "is-mine"
        : "is-available";
    const actionLabel = completed
      ? "Completado"
      : chosen
        ? "🎁 Elegir otro"
        : "🎁 Elegir";

    const progressHtml =
      gift.total > 1
        ? `
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${gift.total}" aria-valuenow="${gift.reserved}" aria-label="Reservados ${gift.reserved} de ${gift.total}">
            <span class="progress-fill" style="width: ${gift.progress}%"></span>
          </div>
          <p class="gift-remaining">Quedan ${gift.remaining} de ${gift.total}</p>
        `
        : `<p class="gift-remaining">${completed ? "Ya fue elegido" : "Queda 1 disponible"}</p>`;

    article.innerHTML = `
      <div class="gift-top">
        <span class="gift-icon" aria-hidden="true">${getCategoryIcon(gift.category)}</span>
        <div>
          <h3>${escapeHtml(gift.name)}</h3>
          <p>${escapeHtml(gift.description)}</p>
        </div>
      </div>
      <p class="gift-status ${statusClass}">
        <span aria-hidden="true">${completed ? "●" : "✓"}</span>
        ${statusLabel}
      </p>
      ${progressHtml}
      <div class="gift-actions">
        <button type="button" class="primary-button gift-choose" ${completed || busy ? "disabled" : ""}>
          ${actionLabel}
        </button>
      </div>
    `;

    const chooseButton = article.querySelector(".gift-choose");
    chooseButton.addEventListener("click", () => onReserve(gift));
    root.appendChild(article);
  });
}

export function openReserveSheet(gift, onConfirm, onClose) {
  const remembered = readRememberedGuestName();
  const quantityOptions =
    gift.total === 1
      ? ""
      : `
        <label class="field" for="reserve-quantity">
          <span>¿Cuántas unidades querés reservar?</span>
          <select id="reserve-quantity">
            ${Array.from({ length: gift.remaining }, (_, index) => {
              const value = index + 1;
              const label = value === 1 ? "1 unidad" : `${value} unidades`;
              return `<option value="${value}">${label}</option>`;
            }).join("")}
          </select>
        </label>
      `;

  openSheet({
    title: "Elegir regalito",
    body: `
      <p class="sheet-gift">${escapeHtml(gift.name)}</p>
      <p class="sheet-copy">${escapeHtml(gift.description)}</p>
      <label class="field" for="guest-name">
        <span>¿Cómo te llamás?</span>
        <input id="guest-name" name="guestName" type="text" autocomplete="name" maxlength="80" value="${escapeAttribute(remembered)}" />
      </label>
      ${quantityOptions}
    `,
    actions: [
      { label: "Cancelar", kind: "ghost", onClick: onClose },
      {
        label: "Confirmar",
        kind: "primary",
        onClick: async (_close, setBusy) => {
          const name = document.getElementById("guest-name").value;
          const quantityInput = document.getElementById("reserve-quantity");
          const quantity = quantityInput ? Number(quantityInput.value) : 1;
          setBusy(true);
          try {
            await onConfirm({ name, quantity });
          } catch {
            setBusy(false);
          }
        },
      },
    ],
    onOpen: () => {
      const input = document.getElementById("guest-name");
      input?.focus();
      input?.select();
    },
  });
}

export function openReleaseSheet(item, onConfirm, onClose) {
  const copy =
    item.quantity === 1
      ? "Tenés 1 unidad reservada. Si la quitás, volverá a quedar disponible para otro invitado."
      : `Tenés ${item.quantity} unidades reservadas. Si las quitás, volverán a quedar disponibles para otros invitados.`;

  openSheet({
    title: "Quitar reserva",
    body: `
      <p class="sheet-gift">${escapeHtml(item.giftName)}</p>
      <p class="sheet-copy">${copy}</p>
    `,
    actions: [
      { label: "No, volver", kind: "ghost", onClick: onClose },
      {
        label: "Quitar reserva",
        kind: "danger",
        onClick: async (_close, setBusy) => {
          setBusy(true);
          try {
            await onConfirm();
          } catch {
            setBusy(false);
          }
        },
      },
    ],
  });
}

export function closeSheet() {
  const root = document.getElementById("sheet-root");
  const overlay = root.querySelector(".sheet-overlay");

  if (!overlay) {
    return;
  }

  overlay.classList.add("is-leaving");
  window.setTimeout(() => {
    root.innerHTML = "";
    document.body.classList.remove("sheet-open");
  }, 220);
}

export function showToast(message) {
  const root = document.getElementById("toast-root");
  root.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  root.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => {
      if (toast.parentNode === root) {
        root.innerHTML = "";
      }
    }, 220);
  }, TOAST_MS);
}

export function setBusyState(busy) {
  document.querySelectorAll(".gift-choose, .my-gift").forEach((button) => {
    if (busy) {
      button.disabled = true;
      return;
    }

    if (button.classList.contains("gift-choose") && button.textContent.includes("Completado")) {
      button.disabled = true;
      return;
    }

    button.disabled = false;
  });
}

function openSheet({ title, body, actions, onOpen }) {
  const root = document.getElementById("sheet-root");
  document.body.classList.add("sheet-open");

  root.innerHTML = `
    <div class="sheet-overlay" role="presentation">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="sheet-handle" aria-hidden="true"></div>
        <h2 id="sheet-title">${escapeHtml(title)}</h2>
        <div class="sheet-body">${body}</div>
        <div class="sheet-actions"></div>
      </div>
    </div>
  `;

  const overlay = root.querySelector(".sheet-overlay");
  const actionsRoot = root.querySelector(".sheet-actions");
  const actionButtons = [];

  const setBusy = (value) => {
    actionButtons.forEach((button) => {
      button.disabled = value;
    });
  };

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.kind === "primary"
      ? "primary-button"
      : action.kind === "danger"
        ? "danger-button"
        : "ghost-button";
    button.textContent = action.label;
    button.addEventListener("click", async () => {
      await action.onClick(closeSheet, setBusy);
    });
    actionsRoot.appendChild(button);
    actionButtons.push(button);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeSheet();
    }
  });

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      closeSheet();
      document.removeEventListener("keydown", onKeyDown);
    }
  };

  document.addEventListener("keydown", onKeyDown);
  onOpen?.();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
