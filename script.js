const app = document.querySelector(".tier-app");
const resetButton = document.querySelector('[data-action="reset"]');
const saveButton = document.querySelector('[data-action="save"]');
const addButton = document.querySelector('[data-action="add"]');
const filters = Array.from(document.querySelectorAll("[data-filter]"));
const zones = Array.from(document.querySelectorAll(".items, .pool-items"));
const tierRows = Array.from(document.querySelectorAll(".tier-row"));
const pool = document.querySelector(".pool");
const SNAPSHOT_WIDTH = 1120;
const SNAPSHOT_SCALE = 2;

const fruitNames = new Set([
  "りんご",
  "みかん",
  "ぶどう",
  "いちご",
  "もも",
  "さくらんぼ",
  "なし",
  "バナナ",
  "パイナップル",
  "マンゴー",
  "キウイ",
  "すいか",
  "メロン",
  "グレープフルーツ",
  "ゆず",
  "あんず",
  "柿",
  "レモン"
]);

let selectedChip = null;
let draggedChip = null;
let currentFilter = "all";

initializeChips();
attachZoneEvents();
attachAreaClickEvents();
resetBoard();

resetButton.addEventListener("click", resetBoard);
saveButton.addEventListener("click", saveAsImage);
addButton.addEventListener("click", addChip);

function resetBoard() {
  clearSelection();
  const poolItems = document.querySelector(".pool-items");
  document.querySelectorAll(".chip").forEach((chip) => {
    poolItems.appendChild(chip);
  });
  draggedChip = null;
  currentFilter = "all";
  filters.forEach((filter) => {
    filter.classList.toggle("active", filter.dataset.filter === "all");
  });
  zones.forEach((zone) => zone.classList.remove("is-drop-target"));
  applyFilter();
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filters.forEach((filter) => filter.classList.toggle("active", filter === button));
    clearSelection();
    applyFilter();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearSelection();
  }
});

function initializeChips() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.dataset.category = chip.dataset.category || detectCategory(chip.textContent);
    if (chip.dataset.ready === "true") {
      return;
    }

    chip.dataset.ready = "true";
    chip.draggable = true;
    chip.tabIndex = 0;
    chip.setAttribute("role", "button");
    chip.setAttribute("aria-label", `${chip.textContent.trim()}を移動`);

    chip.addEventListener("click", handleChipClick);
    chip.addEventListener("keydown", handleChipKeydown);
    chip.addEventListener("dragstart", handleDragStart);
    chip.addEventListener("dragend", handleDragEnd);
  });
}

function attachZoneEvents() {
  zones.forEach((zone) => {
    zone.addEventListener("click", handleZoneClick);
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", handleDrop);
  });
}

function attachAreaClickEvents() {
  tierRows.forEach((row) => {
    row.addEventListener("click", (event) => {
      if (!selectedChip || event.target.closest(".chip")) {
        return;
      }

      moveChip(selectedChip, row.querySelector(".items"));
      clearSelection();
    });
  });

  pool.addEventListener("click", (event) => {
    if (!selectedChip || event.target.closest(".chip, button")) {
      return;
    }

    moveChip(selectedChip, pool.querySelector(".pool-items"));
    clearSelection();
  });
}

function handleChipClick(event) {
  event.stopPropagation();
  const chip = event.currentTarget;

  if (selectedChip && selectedChip !== chip) {
    moveChip(selectedChip, chip.parentElement, chip);
    clearSelection();
    return;
  }

  if (selectedChip === chip) {
    clearSelection();
    return;
  }

  clearSelection();
  selectedChip = chip;
  chip.classList.add("is-selected");
}

function handleChipKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  handleChipClick(event);
}

function handleZoneClick(event) {
  if (!selectedChip || event.target.closest(".chip")) {
    return;
  }

  moveChip(selectedChip, event.currentTarget);
  clearSelection();
}

function handleDragStart(event) {
  draggedChip = event.currentTarget;
  clearSelection();
  draggedChip.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedChip.textContent.trim());
}

function handleDragEnd() {
  if (draggedChip) {
    draggedChip.classList.remove("is-dragging");
  }
  draggedChip = null;
  zones.forEach((zone) => zone.classList.remove("is-drop-target"));
}

function handleDragOver(event) {
  if (!draggedChip) {
    return;
  }

  event.preventDefault();
  event.currentTarget.classList.add("is-drop-target");
  event.dataTransfer.dropEffect = "move";
}

function handleDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove("is-drop-target");
  }
}

function handleDrop(event) {
  if (!draggedChip) {
    return;
  }

  event.preventDefault();
  const zone = event.currentTarget;
  const beforeChip = getChipAfterPointer(zone, event.clientX, event.clientY);
  moveChip(draggedChip, zone, beforeChip);
  zone.classList.remove("is-drop-target");
}

function moveChip(chip, zone, beforeChip = null) {
  if (beforeChip && beforeChip !== chip) {
    zone.insertBefore(chip, beforeChip);
  } else {
    zone.appendChild(chip);
  }
  applyFilter();
}

function getChipAfterPointer(zone, x, y) {
  const visibleChips = Array.from(zone.querySelectorAll(".chip:not(.is-dragging):not(.is-hidden)"));

  return visibleChips.find((chip) => {
    const rect = chip.getBoundingClientRect();
    const isSameLine = y >= rect.top && y <= rect.bottom;
    return isSameLine && x < rect.left + rect.width / 2;
  });
}

function addChip() {
  const rawName = window.prompt("追加する食材名を入力してください");
  const name = rawName?.trim();

  if (!name) {
    return;
  }

  const rawCategory = window.prompt("カテゴリを入力してください（野菜 / 果物 / きのこ）", "野菜");
  const category = normalizeCategory(rawCategory);
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.dataset.category = category;
  chip.textContent = `${categoryIcon(category)} ${name}`;

  document.querySelector(".pool-items").appendChild(chip);
  initializeChips();
  applyFilter();
}

function applyFilter() {
  document.querySelectorAll(".chip").forEach((chip) => {
    const isPlaced = !chip.closest(".pool-items");
    const shouldShow =
      currentFilter === "all" ||
      (currentFilter === "placed" && isPlaced) ||
      chip.dataset.category === currentFilter;

    chip.classList.toggle("is-hidden", !shouldShow);
  });
}

function clearSelection() {
  if (selectedChip) {
    selectedChip.classList.remove("is-selected");
  }
  selectedChip = null;
}

function detectCategory(text) {
  if (text.includes("🍄")) {
    return "mushroom";
  }

  const normalized = text.replace(/[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]/gu, "");
  for (const fruit of fruitNames) {
    if (normalized.includes(fruit)) {
      return "fruit";
    }
  }

  return "vegetable";
}

function normalizeCategory(value) {
  if (value?.includes("果")) {
    return "fruit";
  }
  if (value?.includes("きのこ") || value?.includes("茸") || value?.includes("菌")) {
    return "mushroom";
  }
  return "vegetable";
}

function categoryIcon(category) {
  if (category === "fruit") {
    return "🍎";
  }
  if (category === "mushroom") {
    return "🍄";
  }
  return "🥬";
}

function saveAsImage() {
  const originalSaveText = saveButton.textContent;
  const snapshot = createSnapshotApp();

  try {
    const canvas = renderAppToCanvas(snapshot.app);
    saveButton.disabled = true;
    saveButton.textContent = "保存中...";

    const pngBlob = dataUrlToBlob(canvas.toDataURL("image/png"));
    downloadBlob(pngBlob, `vegetable-tier-${dateStamp()}.png`);
  } catch (error) {
    console.error(error);
    window.alert("PNG画像の保存に失敗しました。ページを再読み込みしてもう一度お試しください。");
  } finally {
    snapshot.host.remove();
    saveButton.disabled = false;
    saveButton.textContent = originalSaveText;
  }
}

function createSnapshotApp() {
  const host = document.createElement("div");
  const clone = app.cloneNode(true);

  host.className = "snapshot-host";
  clone.classList.add("snapshot-target");
  clone.style.width = `${SNAPSHOT_WIDTH}px`;
  clone.querySelectorAll(".is-selected, .is-dragging, .is-drop-target").forEach((element) => {
    element.classList.remove("is-selected", "is-dragging", "is-drop-target");
  });

  host.appendChild(clone);
  document.body.appendChild(host);

  return {
    host,
    app: clone
  };
}

function renderAppToCanvas(sourceApp) {
  const rect = sourceApp.getBoundingClientRect();
  const scale = SNAPSHOT_SCALE;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.ceil(rect.width * scale);
  canvas.height = Math.ceil(rect.height * scale);
  context.scale(scale, scale);
  context.translate(-rect.left, -rect.top);
  context.fillStyle = "#ffffff";
  context.fillRect(rect.left, rect.top, rect.width, rect.height);

  drawAppBoxes(context, sourceApp);
  drawAppText(context, sourceApp);

  return canvas;
}

function drawAppBoxes(context, sourceApp) {
  [
    ".tier-app",
    ".tier-board",
    ".tier-row",
    ".tier-label",
    ".pool",
    ".tier-guide-card",
    ".tier-guide-title",
    ".tier-guide-table tr",
    ".guide-rank",
    ".button",
    ".filter",
    ".add",
    ".chip:not(.is-hidden)",
    ".dot",
    ".tier-guide-title span"
  ].forEach((selector) => {
    querySnapshotElements(sourceApp, selector).forEach((element) => {
      drawElementBox(context, element);
    });
  });
}

function drawAppText(context, sourceApp) {
  drawElementText(context, querySnapshotElement(sourceApp, "h1"), { align: "left" });

  querySnapshotElements(sourceApp, ".legend span").forEach((element) => {
    const dot = element.querySelector(".dot");
    const rect = element.getBoundingClientRect();
    const textStart = dot ? dot.getBoundingClientRect().right + 4 : rect.left;
    drawTextLine(context, element.textContent.trim(), element, textStart, rect.top + rect.height / 2, {
      align: "left"
    });
  });

  querySnapshotElements(sourceApp, ".button, .filter, .add, .chip:not(.is-hidden)").forEach((element) => {
    drawElementText(context, element, { align: "center" });
  });

  querySnapshotElements(
    sourceApp,
    ".tier-label strong, .tier-label span, .guide-rank strong, .guide-rank span"
  ).forEach((element) => {
    drawElementText(context, element, { align: "center" });
  });

  const guideTitle = querySnapshotElement(sourceApp, ".tier-guide-title");
  if (guideTitle) {
    const icon = guideTitle.querySelector("span");
    if (icon) {
      drawElementText(context, icon, { align: "center" });
    }

    const rect = guideTitle.getBoundingClientRect();
    const iconRect = icon?.getBoundingClientRect();
    const text = Array.from(guideTitle.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .join(" ");
    const x = iconRect ? iconRect.right + 8 : rect.left + 20;
    drawTextLine(context, text, guideTitle, x, rect.top + rect.height / 2, { align: "left" });
  }

  querySnapshotElements(sourceApp, ".tier-guide-table td").forEach((element) => {
    drawWrappedElementText(context, element);
  });

  const guideNote = querySnapshotElement(sourceApp, ".tier-guide-note");
  if (guideNote) {
    drawWrappedElementText(context, guideNote, { align: "center" });
  }
}

function querySnapshotElement(sourceApp, selector) {
  if (sourceApp.matches(selector)) {
    return sourceApp;
  }
  return sourceApp.querySelector(selector);
}

function querySnapshotElements(sourceApp, selector) {
  const elements = Array.from(sourceApp.querySelectorAll(selector));

  if (sourceApp.matches(selector)) {
    elements.unshift(sourceApp);
  }

  return elements;
}

function drawElementBox(context, element) {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const style = window.getComputedStyle(element);
  const radius = Math.min(parsePixel(style.borderTopLeftRadius), rect.width / 2, rect.height / 2);
  const backgroundColor = style.backgroundColor;
  const shadow = parseBoxShadow(style.boxShadow);

  if (!isTransparent(backgroundColor)) {
    context.save();
    if (shadow) {
      context.shadowColor = shadow.color;
      context.shadowBlur = shadow.blur;
      context.shadowOffsetX = shadow.offsetX;
      context.shadowOffsetY = shadow.offsetY;
    }
    context.fillStyle = backgroundColor;
    fillRoundRect(context, rect.left, rect.top, rect.width, rect.height, radius);
    context.restore();
  }

  drawElementBorder(context, rect, style, radius);
}

function drawElementBorder(context, rect, style, radius) {
  const borders = [
    {
      color: style.borderTopColor,
      style: style.borderTopStyle,
      width: parsePixel(style.borderTopWidth),
      side: "top"
    },
    {
      color: style.borderRightColor,
      style: style.borderRightStyle,
      width: parsePixel(style.borderRightWidth),
      side: "right"
    },
    {
      color: style.borderBottomColor,
      style: style.borderBottomStyle,
      width: parsePixel(style.borderBottomWidth),
      side: "bottom"
    },
    {
      color: style.borderLeftColor,
      style: style.borderLeftStyle,
      width: parsePixel(style.borderLeftWidth),
      side: "left"
    }
  ].filter((border) => border.width > 0 && border.style !== "none" && !isTransparent(border.color));

  if (borders.length === 0) {
    return;
  }

  const isUniform =
    borders.length === 4 &&
    borders.every((border) => border.width === borders[0].width && border.color === borders[0].color);

  if (isUniform) {
    const width = borders[0].width;
    context.save();
    context.strokeStyle = borders[0].color;
    context.lineWidth = width;
    strokeRoundRect(
      context,
      rect.left + width / 2,
      rect.top + width / 2,
      rect.width - width,
      rect.height - width,
      Math.max(0, radius - width / 2)
    );
    context.restore();
    return;
  }

  borders.forEach((border) => {
    context.save();
    context.fillStyle = border.color;
    if (border.side === "top") {
      context.fillRect(rect.left, rect.top, rect.width, border.width);
    } else if (border.side === "right") {
      context.fillRect(rect.right - border.width, rect.top, border.width, rect.height);
    } else if (border.side === "bottom") {
      context.fillRect(rect.left, rect.bottom - border.width, rect.width, border.width);
    } else {
      context.fillRect(rect.left, rect.top, border.width, rect.height);
    }
    context.restore();
  });
}

function drawElementText(context, element, options = {}) {
  if (!element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const align = options.align || "left";
  const x = align === "center" ? rect.left + rect.width / 2 : rect.left + (options.paddingX || 0);
  drawTextLine(context, element.textContent.trim(), element, x, rect.top + rect.height / 2, { align });
}

function drawWrappedElementText(context, element, options = {}) {
  if (!element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const style = window.getComputedStyle(element);
  applyTextStyle(context, style);

  const align = options.align || style.textAlign || "left";
  const paddingLeft = parsePixel(style.paddingLeft);
  const paddingRight = parsePixel(style.paddingRight);
  const paddingTop = parsePixel(style.paddingTop);
  const paddingBottom = parsePixel(style.paddingBottom);
  const contentWidth = Math.max(0, rect.width - paddingLeft - paddingRight);
  const contentHeight = Math.max(0, rect.height - paddingTop - paddingBottom);
  const lineHeight = parseLineHeight(style);
  const lines = wrapText(context, element.textContent.trim(), contentWidth);
  const blockHeight = lines.length * lineHeight;
  const startY = rect.top + paddingTop + Math.max(0, (contentHeight - blockHeight) / 2) + lineHeight / 2;
  const x =
    align === "center"
      ? rect.left + rect.width / 2
      : align === "right"
        ? rect.right - paddingRight
        : rect.left + paddingLeft;

  context.textAlign = align === "center" || align === "right" ? align : "left";
  lines.forEach((line, index) => {
    context.fillText(line, x, startY + index * lineHeight);
  });
}

function drawTextLine(context, text, element, x, y, options = {}) {
  if (!text) {
    return;
  }

  applyTextStyle(context, window.getComputedStyle(element));
  context.textAlign = options.align || "left";
  context.fillText(text, x, y);
}

function applyTextStyle(context, style) {
  context.fillStyle = style.color;
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = "middle";
}

function wrapText(context, text, maxWidth) {
  if (!text) {
    return [];
  }
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const lines = [];
  let line = "";

  Array.from(text).forEach((character) => {
    const testLine = `${line}${character}`;
    if (line && context.measureText(testLine).width > maxWidth) {
      lines.push(line);
      line = character;
      return;
    }
    line = testLine;
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function fillRoundRect(context, x, y, width, height, radius) {
  roundRectPath(context, x, y, width, height, radius);
  context.fill();
}

function strokeRoundRect(context, x, y, width, height, radius) {
  roundRectPath(context, x, y, width, height, radius);
  context.stroke();
}

function roundRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function parseBoxShadow(value) {
  if (!value || value === "none") {
    return null;
  }

  const match = value.match(/(rgba?\([^)]+\))\s+(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/);
  if (!match) {
    return null;
  }

  return {
    color: match[1],
    offsetX: Number(match[2]),
    offsetY: Number(match[3]),
    blur: Number(match[4])
  };
}

function parseLineHeight(style) {
  const value = parsePixel(style.lineHeight);
  if (value > 0) {
    return value;
  }
  return parsePixel(style.fontSize) * 1.2;
}

function parsePixel(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTransparent(color) {
  return !color || color === "transparent" || color === "rgba(0, 0, 0, 0)";
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*);base64/)?.[1] || "image/png";
  const binary = window.atob(data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}
