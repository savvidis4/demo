"use strict";

const departments = {
  galley: { name: "Galley", mark: "G" },
  engine: { name: "Engine stores", mark: "E" },
  medical: { name: "Medical stores", mark: "+" },
};

const items = [
  { id: "G01", department: "galley", name: "Long-grain rice", location: "Dry store", unit: "kg" },
  { id: "G02", department: "galley", name: "Frozen chicken", location: "Freezer", unit: "kg" },
  { id: "G03", department: "galley", name: "Olive oil", location: "Dry store", unit: "L" },
  { id: "G04", department: "galley", name: "Canned tomatoes", location: "Shelf B2", unit: "pcs" },
  { id: "E01", department: "engine", name: "Oil filter", location: "Shelf A1", unit: "pcs" },
  { id: "E02", department: "engine", name: "Drive belt", location: "Drawer 03", unit: "pcs" },
  { id: "E03", department: "engine", name: "Multipurpose grease", location: "Cabinet 02", unit: "kg" },
  { id: "E04", department: "engine", name: "Seal kit", location: "Shelf C2", unit: "sets" },
  { id: "M01", department: "medical", name: "Sterile gauze", location: "Shelf 01", unit: "packs" },
  { id: "M02", department: "medical", name: "Elastic bandage", location: "Shelf 02", unit: "pcs" },
  { id: "M03", department: "medical", name: "Saline solution", location: "Cabinet 01", unit: "pcs" },
  { id: "M04", department: "medical", name: "Nitrile gloves", location: "Shelf 03", unit: "boxes" },
];

const storageKey = "inventsea-demo-counts-v1";
const quantityFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 });
const screen = document.querySelector("#screen");
const announcement = document.querySelector("#announcement");
let records = loadRecords();
let view = "list";
let department = "all";
let query = "";
let activeId = items[0].id;
let countReturn = "list";

function loadRecords() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    return Object.fromEntries(items.flatMap(({ id }) => {
      const record = stored?.[id];
      if (!record || typeof record.note !== "string") return [];
      if (record.quantity !== null && (!Number.isFinite(record.quantity) || record.quantity < 0)) return [];
      return [[id, { quantity: record.quantity, note: record.note.slice(0, 300) }]];
    }));
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function isCounted(item) {
  return records[item.id]?.quantity != null;
}

function displayQuantity(item) {
  return isCounted(item) ? `${quantityFormat.format(records[item.id].quantity)} ${item.unit}` : "Not counted";
}

function normalize(text) {
  return text.toLocaleLowerCase("en").normalize("NFD").replace(/\p{M}/gu, "");
}

function filteredItems() {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const searchable = normalize(`${item.name} ${item.id} ${item.location} ${departments[item.department].name}`);
    return (department === "all" || item.department === department) && words.every((word) => searchable.includes(word));
  });
}

function itemRow(item, showNote = false) {
  const group = departments[item.department];
  const note = records[item.id]?.note;
  return `<li>
    <button type="button" class="item-button" data-action="item" data-id="${item.id}">
      <span class="item-marker" data-department="${item.department}" aria-hidden="true">${group.mark}</span>
      <span><span class="item-name">${item.name}</span>
        <span class="item-meta">${item.id} · ${item.location} · ${item.unit}</span>
        ${showNote && note ? `<span class="review-note">${escapeHtml(note)}</span>` : ""}
      </span>
      <span class="item-status ${isCounted(item) ? "recorded" : ""}">${displayQuantity(item)}</span>
    </button>
  </li>`;
}

function renderProgress() {
  const counted = items.filter(isCounted).length;
  document.querySelector("#progress-number").textContent = `${counted} / ${items.length}`;
  const progress = document.querySelector("#progress");
  progress.max = items.length;
  progress.value = counted;
  document.querySelector("#department-progress").innerHTML = Object.entries(departments).map(([key, group]) => {
    const groupItems = items.filter((item) => item.department === key);
    return `<div class="department-progress"><span>${group.name}</span><strong>${groupItems.filter(isCounted).length} / ${groupItems.length}</strong></div>`;
  }).join("");
}

function renderListRows() {
  const visible = filteredItems();
  const results = document.querySelector("#results");
  results.innerHTML = visible.length
    ? `<ul class="item-list">${visible.map((item) => itemRow(item)).join("")}</ul>`
    : '<p class="empty">No items found. Try a different search or store.</p>';
}

function renderList() {
  screen.innerHTML = `<header class="panel-head">
    <h2 id="screen-title" tabindex="-1">Inventory list</h2>
    <p>Select an item to record its quantity.</p>
  </header>
  <div class="list-tools">
    <label class="sr-only" for="search">Search items</label>
    <input class="search" id="search" type="search" placeholder="Search by item, code or location" value="${escapeHtml(query)}">
    <div class="filters" role="group" aria-label="Filter by store">
      ${[["all", "All stores"], ...Object.entries(departments).map(([key, group]) => [key, group.name])]
        .map(([key, label]) => `<button type="button" class="filter" data-action="filter" data-department="${key}" aria-pressed="${key === department}">${label}</button>`).join("")}
    </div>
  </div>
  <div id="results"></div>`;
  renderListRows();
}

function renderCount() {
  const item = items.find((entry) => entry.id === activeId);
  const record = records[item.id];
  const value = record?.quantity ?? "";
  screen.innerHTML = `<header class="panel-head">
    <h2 id="screen-title" tabindex="-1">${item.name}</h2>
    <p>${departments[item.department].name} · ${item.location} · ${item.id}</p>
  </header>
  <form class="count-form" id="count-form" novalidate>
    <div class="field-group">
      <label class="field-label" for="quantity">Quantity (${item.unit})</label>
      <input class="field" id="quantity" name="quantity" type="text" inputmode="${["kg", "L"].includes(item.unit) ? "decimal" : "numeric"}"
        autocomplete="off" value="${value}" maxlength="16" aria-describedby="quantity-help quantity-error">
      <p class="help" id="quantity-help">Enter 0 if none are on hand. Leave blank if the item was not counted.</p>
      <p class="error" id="quantity-error" role="alert" hidden></p>
    </div>
    <div class="field-group">
      <label class="field-label" for="note">Note <span class="help">(optional)</span></label>
      <textarea class="field" id="note" name="note" rows="2" maxlength="300" placeholder="e.g. Check the location">${escapeHtml(record?.note ?? "")}</textarea>
    </div>
    <div class="panel-actions">
      <button type="button" class="secondary" data-action="${countReturn}">${countReturn === "review" ? "Back to review" : "Back to items"}</button>
      <button type="submit" class="primary">${countReturn === "review" ? "Save changes" : "Save and continue"}</button>
    </div>
  </form>`;
}

function renderReview() {
  const counted = items.filter(isCounted).length;
  screen.innerHTML = `<header class="panel-head">
    <h2 id="screen-title" tabindex="-1">Review inventory</h2>
    <p>Select any item to edit its count.</p>
  </header>
  <div class="review-toolbar">
    <div class="review-summary">
      <span class="review-tag">${counted} counted</span>
      <span class="review-tag pending">${items.length - counted} not counted</span>
    </div>
    <button type="button" class="primary" data-action="preview">Preview report</button>
  </div>
  ${Object.entries(departments).map(([key, group]) => `<section class="review-group">
    <h3>${group.name}</h3><ul class="item-list">${items.filter((item) => item.department === key).map((item) => itemRow(item, true)).join("")}</ul>
  </section>`).join("")}`;
}

function reportMarkup(compactPreview = false) {
  const counted = items.filter(isCounted).length;
  return `<article class="report-body">
    <p>InventSea · Demo data</p>
    <h2>Inventory report — M/V Asterion</h2>
    <p>${counted} of ${items.length} items counted${counted < items.length ? " · Incomplete inventory" : ""}</p>
    ${Object.entries(departments).map(([key, group]) => `<section>
      <h3>${group.name}</h3>
      <table class="report-table">
        <thead><tr><th scope="col">Item / location</th><th scope="col">Quantity</th><th scope="col">Note</th></tr></thead>
        <tbody>${items.filter((item) => item.department === key).map((item) => {
          const note = records[item.id]?.note;
          return `<tr>
            <td><strong>${item.name}</strong><br>${item.id} · ${item.location}
              ${compactPreview && note ? `<span class="report-inline-note">${escapeHtml(note)}</span>` : ""}
            </td>
            <td>${displayQuantity(item)}</td><td>${escapeHtml(note || "—")}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </section>`).join("")}
  </article>`;
}

function renderPreview() {
  screen.innerHTML = `<header class="panel-head"><h2 id="screen-title" tabindex="-1">Preview report</h2></header>
    <div class="panel-actions report-actions">
      <button type="button" class="secondary" data-action="review">Back to review</button>
      <button type="button" class="primary" data-action="print">Print</button>
    </div>
    <div class="report-preview">${reportMarkup(true)}</div>`;
}

function render(focus = false) {
  const step = view === "preview" ? "review" : view;
  document.querySelectorAll(".step").forEach((button) => {
    if (button.dataset.action === step) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  renderProgress();
  if (view === "list") renderList();
  if (view === "count") renderCount();
  if (view === "review") renderReview();
  if (view === "preview") renderPreview();
  if (focus) {
    document.querySelector("#screen-title").focus({ preventScroll: true });
    screen.scrollIntoView({ block: "start" });
  }
}

function hasUnsavedCount() {
  if (view !== "count") return false;
  const record = records[activeId];
  return document.querySelector("#quantity").value.trim() !== String(record?.quantity ?? "")
    || document.querySelector("#note").value.trim() !== (record?.note ?? "");
}

function openView(next, id = activeId) {
  if (next === view && id === activeId) return;
  if (hasUnsavedCount() && !window.confirm("Discard unsaved changes?")) return;
  if (next === "count") countReturn = view === "review" ? "review" : "list";
  view = next;
  activeId = id;
  render(true);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  switch (button.dataset.action) {
    case "list":
    case "review":
    case "preview":
      openView(button.dataset.action);
      break;
    case "count": {
      const next = filteredItems().find((item) => !isCounted(item)) ?? items.find((item) => !isCounted(item));
      if (view !== "count") openView("count", next?.id ?? activeId);
      break;
    }
    case "item":
      openView("count", button.dataset.id);
      break;
    case "filter":
      department = button.dataset.department;
      document.querySelectorAll(".filter").forEach((filter) => {
        filter.setAttribute("aria-pressed", String(filter === button));
      });
      renderListRows();
      break;
    case "print":
      document.querySelector("#print-report").innerHTML = reportMarkup();
      window.print();
      break;
    case "reset":
      if (window.confirm("Reset all demo counts and notes?")) {
        records = {};
        const saved = persist();
        view = "list";
        activeId = items[0].id;
        department = "all";
        query = "";
        render(true);
        announcement.textContent = saved ? "Demo reset." : "Demo reset for this session.";
      }
      break;
  }
});

screen.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    query = event.target.value;
    renderListRows();
  }
  if (event.target.id === "quantity") {
    event.target.removeAttribute("aria-invalid");
    document.querySelector("#quantity-error").hidden = true;
  }
});

screen.addEventListener("submit", (event) => {
  if (event.target.id !== "count-form") return;
  event.preventDefault();
  const item = items.find((entry) => entry.id === activeId);
  const input = document.querySelector("#quantity");
  const value = input.value.trim();
  const decimals = ["kg", "L"].includes(item.unit);
  const pattern = decimals ? /^\d+(?:[.,]\d{1,3})?$/ : /^\d+$/;
  const quantity = value === "" ? null : Number(value.replace(",", "."));
  if (value && (!pattern.test(value) || !Number.isFinite(quantity) || quantity > 999999999)) {
    const error = document.querySelector("#quantity-error");
    error.textContent = decimals
      ? "Enter a quantity from 0 to 999,999,999 with up to three decimal places."
      : "Enter a whole number from 0 to 999,999,999.";
    error.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }

  records[item.id] = { quantity, note: document.querySelector("#note").value.trim() };
  const saved = persist();
  const ordered = filteredItems().some((entry) => entry.id === item.id) ? filteredItems() : items;
  const index = ordered.findIndex((entry) => entry.id === item.id);
  const next = ordered.slice(index + 1).find((entry) => !isCounted(entry));
  if (next && countReturn !== "review") activeId = next.id;
  else view = "review";
  render(true);
  announcement.textContent = saved ? `Saved: ${item.name}.` : "This count is available while the page stays open.";
});

render();
