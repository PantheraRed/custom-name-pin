const canvas = document.getElementById("canvas");
let   ctx    = canvas.getContext("2d");

const brawlerSelect = document.getElementById("brawler");
const copyButton    = document.getElementById("copy");

// ── Layer definitions ─────────────────────────────────────────────────────────

const IMAGE_LAYERS = ["face", "board", "hand_left", "hand_right"];
let   layerOrder   = ["face", "board", "text", "hand_left", "hand_right"]; // bottom → top
const ALL_LAYERS   = ["face", "board", "text", "hand_left", "hand_right"]; // fixed master list (for Ctrl+A etc.)

const LAYER_LABELS = {
    face: "Face", board: "Board", text: "Text",
    hand_left: "Hand Left", hand_right: "Hand Right"
};

// ── DOM refs ──────────────────────────────────────────────────────────────────

const layerInputs = {};
for (const name of IMAGE_LAYERS) {
    layerInputs[name] = {
        x:           document.getElementById(`${name}-x`),
        y:           document.getElementById(`${name}-y`),
        sx:          document.getElementById(`${name}-sx`),
        sy:          document.getElementById(`${name}-sy`),
        rotation:    document.getElementById(`${name}-rotation`),
        rotationVal: document.getElementById(`${name}-rotation-val`),
        lock:        document.getElementById(`${name}-lock`),
        opacity:     document.getElementById(`${name}-opacity`)
    };
}

const textInput       = document.getElementById("text-content");
const textX           = document.getElementById("text-x");
const textY           = document.getElementById("text-y");
const textColor       = document.getElementById("text-color");
const textFont        = document.getElementById("text-font");
const textSize        = document.getElementById("text-size");
const textRotation    = document.getElementById("text-rotation");
const textRotationVal = document.getElementById("text-rotation-val");
const boardColorInput = document.getElementById("board-color");

// ── Background state ──────────────────────────────────────────────────────────
const bgTypeSelect   = document.getElementById("bg-type");
const bgSolidColor   = document.getElementById("bg-solid-color");
const bgSolidSection = document.getElementById("bg-solid-section");
const bgGradSection  = document.getElementById("bg-grad-section");
const bgGradType     = document.getElementById("bg-grad-type");
const bgAngle        = document.getElementById("bg-angle");
const bgAngleVal     = document.getElementById("bg-angle-val");
const bgAngleRow     = document.getElementById("bg-angle-row");
const bgHandlesArea  = document.getElementById("bg-handles");
const bgGradBar      = document.getElementById("bg-grad-bar");
const bgStopControls = document.getElementById("bg-stop-controls");

let background = {
    type: "solid",
    color: "#ffffff",
    colorOpacity: 1,
    gradType: "linear",
    angle: 0,
    stops: [
        { color: "#ffffff", opacity: 1, position: 0   },
        { color: "#000000", opacity: 1, position: 100 }
    ]
};
let bgSelectedStop = 0;

// ── Gradient helpers ─────────────────────────────────────────────────────────
function hexToRgba(hex, opacity) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`;
}

function bgDrawBar() {
    const sorted = [...background.stops].sort((a, b) => a.position - b.position);
    const stops  = sorted.map(s => `${hexToRgba(s.color, s.opacity ?? 1)} ${s.position}%`).join(", ");
    const checker = [
        "linear-gradient(45deg, #ccc 25%, transparent 25%)",
        "linear-gradient(-45deg, #ccc 25%, transparent 25%)",
        "linear-gradient(45deg, transparent 75%, #ccc 75%)",
        "linear-gradient(-45deg, transparent 75%, #ccc 75%)"
    ].join(", ");
    bgGradBar.style.backgroundImage    = `linear-gradient(to right, ${stops}), ${checker}`;
    bgGradBar.style.backgroundSize     = `100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px`;
    bgGradBar.style.backgroundPosition = `0 0, 0 0, 0 4px, 4px -4px, -4px 0px`;
    bgGradBar.style.backgroundColor    = "#fff";
}

// ── Handle rendering ──────────────────────────────────────────────────────────
function bgRenderHandles() {
    bgHandlesArea.innerHTML = "";
    background.stops.forEach((stop, i) => {
        const handle = document.createElement("div");
        handle.className = "grad-handle" + (i === bgSelectedStop ? " selected" : "");
        handle.style.left = stop.position + "%";

        const swatch = document.createElement("div");
        swatch.className = "grad-handle-swatch";
        swatch.style.background = hexToRgba(stop.color, stop.opacity ?? 1);

        const tip = document.createElement("div");
        tip.className = "grad-handle-tip";

        handle.appendChild(swatch);
        handle.appendChild(tip);

        handle.addEventListener("pointerdown", e => {
            e.stopPropagation();
            bgSelectedStop = i;
            bgRenderHandles();
            bgRenderStopControls();

            const barRect = bgGradBar.getBoundingClientRect();
            const onMove = ev => {
                let pct = (ev.clientX - barRect.left) / barRect.width * 100;
                pct = Math.max(0, Math.min(100, Math.round(pct)));
                background.stops[i].position = pct;
                bgRenderHandles();
                bgDrawBar();
                bgRenderStopControls();
            };
            const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
        });

        bgHandlesArea.appendChild(handle);
    });
}

// ── Selected stop controls (color picker + position + delete) ─────────────────
function bgRenderStopControls() {
    bgStopControls.innerHTML = "";
    const stop = background.stops[bgSelectedStop];
    if (!stop) return;

    const colorInput = document.createElement("input");
    colorInput.type  = "color";
    colorInput.value = stop.color;
    colorInput.addEventListener("input", () => {
        background.stops[bgSelectedStop].color = colorInput.value;
        bgRenderHandles();
        bgDrawBar();
    });

    const opacityInput = document.createElement("input");
    opacityInput.type  = "range";
    opacityInput.min   = "0";
    opacityInput.max   = "1";
    opacityInput.step  = "0.01";
    opacityInput.value = stop.opacity ?? 1;
    opacityInput.title = "Opacity";
    opacityInput.className = "bg-opacity-slider";
    opacityInput.addEventListener("input", () => {
        background.stops[bgSelectedStop].opacity = parseFloat(opacityInput.value);
        bgRenderHandles();
        bgDrawBar();
    });

    const posLabel = document.createElement("label");
    posLabel.textContent = "Pos:";

    const posInput = document.createElement("input");
    posInput.type  = "number";
    posInput.min   = "0";
    posInput.max   = "100";
    posInput.value = Math.round(stop.position);
    posInput.addEventListener("change", () => {
        background.stops[bgSelectedStop].position = Math.max(0, Math.min(100, parseInt(posInput.value) || 0));
        bgRenderHandles();
        bgDrawBar();
    });

    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Add";
    addBtn.addEventListener("click", () => {
        background.stops.push({ color: "#888888", opacity: 1, position: 50 });
        bgSelectedStop = background.stops.length - 1;
        bgRenderHandles();
        bgDrawBar();
        bgRenderStopControls();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "✕ Del";
    delBtn.disabled = background.stops.length <= 2;
    delBtn.addEventListener("click", () => {
        if (background.stops.length > 2) {
            background.stops.splice(bgSelectedStop, 1);
            bgSelectedStop = Math.min(bgSelectedStop, background.stops.length - 1);
            bgRenderHandles();
            bgDrawBar();
            bgRenderStopControls();
        }
    });

    bgStopControls.appendChild(colorInput);
    bgStopControls.appendChild(opacityInput);
    bgStopControls.appendChild(posLabel);
    bgStopControls.appendChild(posInput);
    bgStopControls.appendChild(addBtn);
    bgStopControls.appendChild(delBtn);
}

// Click on bar to add a stop at that position
bgGradBar.addEventListener("click", e => {
    if (e.target !== bgGradBar) return;
    const rect = bgGradBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, Math.round((e.clientX - rect.left) / rect.width * 100)));
    // Interpolate color at that position from existing stops
    const sorted = [...background.stops].sort((a,b) => a.position - b.position);
    let color = sorted[0].color;
    for (let i = 0; i < sorted.length - 1; i++) {
        if (pct >= sorted[i].position && pct <= sorted[i+1].position) {
            const t = (pct - sorted[i].position) / (sorted[i+1].position - sorted[i].position);
            const hex = c => parseInt(c.slice(1), 16);
            const lerp = (a, b, t) => Math.round(a + (b-a)*t);
            const c1 = hex(sorted[i].color), c2 = hex(sorted[i+1].color);
            const r = lerp((c1>>16)&255, (c2>>16)&255, t);
            const g = lerp((c1>>8)&255,  (c2>>8)&255,  t);
            const b = lerp(c1&255,        c2&255,        t);
            color = "#" + [r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
            break;
        }
    }
    // Interpolate opacity too
    let opacity = sorted[0].opacity ?? 1;
    for (let i = 0; i < sorted.length - 1; i++) {
        if (pct >= sorted[i].position && pct <= sorted[i+1].position) {
            const t2 = (pct - sorted[i].position) / (sorted[i+1].position - sorted[i].position);
            opacity = (sorted[i].opacity ?? 1) + ((sorted[i+1].opacity ?? 1) - (sorted[i].opacity ?? 1)) * t2;
            opacity = Math.round(opacity * 100) / 100;
            break;
        }
    }
    background.stops.push({ color, opacity, position: pct });
    bgSelectedStop = background.stops.length - 1;
    bgRenderHandles();
    bgDrawBar();
    bgRenderStopControls();
});

function bgUpdateUI() {
    bgSolidSection.style.display = background.type === "solid"    ? "" : "none";
    bgGradSection.style.display  = background.type === "gradient" ? "" : "none";
    // "solid" is the default; no transparent mode
    bgAngleRow.style.display     = (background.type === "gradient" && background.gradType === "linear") ? "" : "none";
    if (background.type === "gradient") {
        setTimeout(() => { bgDrawBar(); bgRenderHandles(); bgRenderStopControls(); }, 0);
    }
}

bgTypeSelect.addEventListener("change", () => { background.type = bgTypeSelect.value; bgUpdateUI(); });
bgSolidColor.addEventListener("input",  () => { background.color = bgSolidColor.value; });
document.getElementById("bg-solid-opacity").addEventListener("input", e => { background.colorOpacity = parseFloat(e.target.value); });
bgGradType.addEventListener("change",   () => { background.gradType = bgGradType.value; bgUpdateUI(); });
bgAngle.addEventListener("input",       () => { background.angle = parseInt(bgAngle.value); bgAngleVal.textContent = bgAngle.value + "°"; });

// ── Font dropdown ─────────────────────────────────────────────────────────────

(function buildFontDropdown() {
    const opt       = document.createElement("option");
    opt.value       = "Nougat";
    opt.textContent = "Nougat";
    textFont.appendChild(opt);
})();

// ── Static images ─────────────────────────────────────────────────────────────

const boardImage        = new Image();
const boardOutlineImage = new Image();
boardImage.src        = "./assets/board.png";
boardOutlineImage.src = "./assets/board_outline.png";

// ── Config & state ────────────────────────────────────────────────────────────

function defaultLayerConfig() {
    return { x: 0, y: 0, rotation: 0, sx: 1, sy: 1, opacity: 1 };
}

let config = {
    face:       defaultLayerConfig(),
    board:      defaultLayerConfig(),
    hand_left:  defaultLayerConfig(),
    hand_right: defaultLayerConfig(),
    text:       { x: 500, y: 500 }
};

let textStyle = {
    content:  "",
    opacity:  1,
    color:    "#000000",
    font:     "Nougat",
    size:     72,
    rotation: 0
};

const images = { face: null, hand_left: null, hand_right: null };
const hitCanvases  = {};
const contourPaths = {};

// ── Board tint ────────────────────────────────────────────────────────────────

let boardColor = "#ffffff";
const boardTintCanvas = document.createElement("canvas");
const boardTintCtx    = boardTintCanvas.getContext("2d");

function updateBoardTint() {
    boardTintCanvas.width  = boardImage.width;
    boardTintCanvas.height = boardImage.height;
    boardTintCtx.clearRect(0, 0, boardTintCanvas.width, boardTintCanvas.height);
    boardTintCtx.drawImage(boardImage, 0, 0);
    boardTintCtx.globalCompositeOperation = "source-in";
    boardTintCtx.fillStyle = boardColor;
    boardTintCtx.fillRect(0, 0, boardTintCanvas.width, boardTintCanvas.height);
    boardTintCtx.globalCompositeOperation = "source-over";
}

// ── Undo / Redo ───────────────────────────────────────────────────────────────

const undoStack = [], redoStack = [];
const MAX_HISTORY = 100;

function snapshotConfig() {
    return {
        face:       { ...config.face },
        board:      { ...config.board },
        hand_left:  { ...config.hand_left },
        hand_right: { ...config.hand_right },
        text:       { ...config.text },
        textRot:     textStyle.rotation,
        textSize:    textStyle.size,
        textOpacity: textStyle.opacity,
        layerOrder:  [...layerOrder]
    };
}

function applySnapshot(s) {
    config.face       = { ...s.face };
    config.board      = { ...s.board };
    config.hand_left  = { ...s.hand_left };
    config.hand_right = { ...s.hand_right };
    config.text       = { ...s.text };
    textStyle.rotation = s.textRot;
    textStyle.size     = s.textSize;
    textStyle.opacity  = s.textOpacity ?? 1;
    if (s.layerOrder) layerOrder = [...s.layerOrder];
    textRotation.value = s.textRot;
    textRotationVal.textContent = `${s.textRot}°`;
    textSize.value     = s.textSize;
    document.getElementById("text-opacity").value = textStyle.opacity;
    updateInputs();
}

function pushUndo(snap) {
    undoStack.push(snap);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
}

function applyUndo() { if (!undoStack.length) return; redoStack.push(snapshotConfig()); applySnapshot(undoStack.pop()); }
function applyRedo() { if (!redoStack.length) return; undoStack.push(snapshotConfig()); applySnapshot(redoStack.pop()); }

// ── Selection ─────────────────────────────────────────────────────────────────
// selectedLayers: Set of layer names. Single = 1 item. Group = 2+. Empty = none.

let selectedLayers    = new Set();
let lastSelectedLayer = null;   // for keyboard cycling/arrow keys

function setSelectedLayer(name) {
    selectedLayers = name ? new Set([name]) : new Set();
    if (name) lastSelectedLayer = name;
}

function setSelectedGroup(names) {
    selectedLayers = new Set(names);
    if (names.length) lastSelectedLayer = names[names.length - 1];
}

function isSingleSelection() { return selectedLayers.size === 1; }
function getSingleLayer()    { return isSingleSelection() ? [...selectedLayers][0] : null; }
function hasSelection()      { return selectedLayers.size > 0; }

// ── Interaction state ─────────────────────────────────────────────────────────

const HANDLE_RADIUS = 14;
const EDGE_RADIUS   = 12;
const PAD           = 6;
const TEXT_PAD      = 6;

let isDragging        = false, dragSnapshotTaken = false;
let dragOffsetX       = 0, dragOffsetY = 0;
let dragStartConfigs  = null;   // snapshot of all selected layer positions at drag start

let isRotating          = false, rotateSnapshotTaken = false;
let rotateStartAngle    = 0, rotateStartRotation = 0;
let rotatingLayer       = null;
let groupRotateStart    = null; // { centre, layerStarts: { name: { rotation, x, y } } }

let isResizing          = false, resizeSnapshotTaken = false;
let nudgeSnapshotTaken  = false;
let resizeEdge          = null;
let resizeStartMouse    = null, resizeStartConfig = null;
let resizingLayer       = null;
let groupResizeStart    = null;

// Marquee
let isMarquee      = false;
let marqueeStart   = null;
let marqueeEnd     = null;

// ── Canvas fit ────────────────────────────────────────────────────────────────

// Canvas scaling handled by scaleCanvas() defined after layout setup

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width  / rect.width),
        y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function getLayerGeom(name) {
    const cfg = config[name];
    const img = (name === "board") ? boardImage : images[name];
    if (!img) return null;
    const w  = img.width  * cfg.sx;
    const h  = img.height * cfg.sy;
    const cx = cfg.x + w / 2;
    const cy = cfg.y + h / 2;
    return { cx, cy, hw: w/2, hh: h/2, angle: (cfg.rotation * Math.PI) / 180, w, h };
}

function localToCanvas(cx, cy, angle, lx, ly) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { x: cx + lx*cos - ly*sin, y: cy + lx*sin + ly*cos };
}

function canvasToLocal(cx, cy, angle, mx, my) {
    const dx = mx-cx, dy = my-cy;
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    return { lx: dx*cos - dy*sin, ly: dx*sin + dy*cos };
}

function getLayerCorners(name) {
    const g = getLayerGeom(name);
    if (!g) return null;
    const { cx, cy, hw, hh, angle } = g, p = PAD;
    return [
        localToCanvas(cx, cy, angle, -(hw+p), -(hh+p)),
        localToCanvas(cx, cy, angle,  (hw+p), -(hh+p)),
        localToCanvas(cx, cy, angle,  (hw+p),  (hh+p)),
        localToCanvas(cx, cy, angle, -(hw+p),  (hh+p))
    ];
}

function getLayerEdgeMidpoints(name) {
    const g = getLayerGeom(name);
    if (!g) return null;
    const { cx, cy, hw, hh, angle } = g, p = PAD;
    return [
        localToCanvas(cx, cy, angle,  0,      -(hh+p)),
        localToCanvas(cx, cy, angle,  (hw+p),  0),
        localToCanvas(cx, cy, angle,  0,       (hh+p)),
        localToCanvas(cx, cy, angle, -(hw+p),  0)
    ];
}

function getTextGeom() {
    const { w, h } = getTextMetrics();
    return {
        cx: config.text.x, cy: config.text.y,
        hw: w/2, hh: h/2,
        angle: (textStyle.rotation * Math.PI) / 180,
        w, h
    };
}

function getTextCorners() {
    if (!textStyle.content) return null;
    const { cx, cy, hw, hh, angle } = getTextGeom(), p = TEXT_PAD;
    return [
        localToCanvas(cx, cy, angle, -(hw+p), -(hh+p)),
        localToCanvas(cx, cy, angle,  (hw+p), -(hh+p)),
        localToCanvas(cx, cy, angle,  (hw+p),  (hh+p)),
        localToCanvas(cx, cy, angle, -(hw+p),  (hh+p))
    ];
}

function getTextEdgeMidpoints() {
    if (!textStyle.content) return null;
    const { cx, cy, hw, hh, angle } = getTextGeom(), p = TEXT_PAD;
    return [
        localToCanvas(cx, cy, angle,  0,      -(hh+p)),
        localToCanvas(cx, cy, angle,  (hw+p),  0),
        localToCanvas(cx, cy, angle,  0,       (hh+p)),
        localToCanvas(cx, cy, angle, -(hw+p),  0)
    ];
}

// Axis-aligned bounding box of a layer (accounts for rotation)
function getLayerAABB(name) {
    const corners = (name === "text") ? getTextCorners() : getLayerCorners(name);
    if (!corners) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
        if (c.x < minX) minX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.x > maxX) maxX = c.x;
        if (c.y > maxY) maxY = c.y;
    }
    return { minX, minY, maxX, maxY };
}

// Union AABB of all selected layers — used for group handle box
function getGroupAABB() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const name of selectedLayers) {
        const bb = getLayerAABB(name);
        if (!bb) continue;
        if (bb.minX < minX) minX = bb.minX;
        if (bb.minY < minY) minY = bb.minY;
        if (bb.maxX > maxX) maxX = bb.maxX;
        if (bb.maxY > maxY) maxY = bb.maxY;
    }
    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
}

function groupAABBCorners() {
    const bb = getGroupAABB();
    if (!bb) return null;
    return [
        { x: bb.minX, y: bb.minY },
        { x: bb.maxX, y: bb.minY },
        { x: bb.maxX, y: bb.maxY },
        { x: bb.minX, y: bb.maxY }
    ];
}

function groupAABBEdges() {
    const bb = getGroupAABB();
    if (!bb) return null;
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    return [
        { x: cx,       y: bb.minY },
        { x: bb.maxX,  y: cy },
        { x: cx,       y: bb.maxY },
        { x: bb.minX,  y: cy }
    ];
}

function groupCentre() {
    const bb = getGroupAABB();
    if (!bb) return null;
    return { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 };
}

// ── Hit testing ───────────────────────────────────────────────────────────────

function createHitCanvas(name, image) {
    const hc = document.createElement("canvas");
    hc.width = image.width; hc.height = image.height;
    hc.getContext("2d").drawImage(image, 0, 0);
    hitCanvases[name] = hc;
}

function pixelHitTest(name, image, mouseX, mouseY) {
    const cfg = config[name];
    const g   = getLayerGeom(name);
    if (!g) return false;
    const { lx, ly } = canvasToLocal(g.cx, g.cy, g.angle, mouseX, mouseY);
    const px = Math.floor(lx / cfg.sx + image.width  / 2);
    const py = Math.floor(ly / cfg.sy + image.height / 2);
    if (px < 0 || py < 0 || px >= image.width || py >= image.height) return false;
    return hitCanvases[name].getContext("2d").getImageData(px, py, 1, 1).data[3] > 10;
}

function textHitTest(mouseX, mouseY) {
    if (!textStyle.content) return false;
    const { cx, cy, hw, hh, angle } = getTextGeom();
    const { lx, ly } = canvasToLocal(cx, cy, angle, mouseX, mouseY);
    return lx >= -hw && lx <= hw && ly >= -hh && ly <= hh;
}

// Returns corner index 0-3 or -1
function rotationHandleHitTest(mouseX, mouseY) {
    if (!hasSelection()) return -1;
    // Rotation handles are now at edge midpoints (swapped from corners)
    const edges = selectedLayers.size > 1
        ? groupAABBEdges()
        : (getSingleLayer() === "text" ? getTextEdgeMidpoints() : getLayerEdgeMidpoints(getSingleLayer()));
    if (!edges) return -1;
    for (let i = 0; i < edges.length; i++) {
        const dx = mouseX - edges[i].x, dy = mouseY - edges[i].y;
        if (Math.sqrt(dx*dx + dy*dy) <= HANDLE_RADIUS) return i;
    }
    return -1;
}

// Returns edge name or -1 — resize handles now at corners
function resizeHandleHitTest(mouseX, mouseY) {
    if (!hasSelection()) return -1;
    const corners = selectedLayers.size > 1
        ? groupAABBCorners()
        : (getSingleLayer() === "text" ? getTextCorners() : getLayerCorners(getSingleLayer()));
    if (!corners) return -1;
    const names = ["top-left", "top-right", "bottom-right", "bottom-left"];
    for (let i = 0; i < corners.length; i++) {
        const dx = mouseX - corners[i].x, dy = mouseY - corners[i].y;
        if (Math.sqrt(dx*dx + dy*dy) <= EDGE_RADIUS) return names[i];
    }
    return -1;
}

// Marquee intersection: pixel-perfect — only selects layer if a opaque pixel falls inside the marquee rect
function layerIntersectsMarquee(name, mx1, my1, mx2, my2) {
    if (name === "text") {
        const bb = getLayerAABB(name);
        if (!bb) return false;
        const rMinX = Math.min(mx1,mx2), rMaxX = Math.max(mx1,mx2);
        const rMinY = Math.min(my1,my2), rMaxY = Math.max(my1,my2);
        return bb.maxX >= rMinX && bb.minX <= rMaxX && bb.maxY >= rMinY && bb.minY <= rMaxY;
    }

    const hc = hitCanvases[name];
    if (!hc) return false;
    const g = getLayerGeom(name);
    if (!g) return false;
    const cfg = config[name];
    const img = (name === "board") ? boardImage : images[name];
    if (!img) return false;

    // Transform the 4 marquee corners into image-pixel space
    const rX1 = Math.min(mx1,mx2), rX2 = Math.max(mx1,mx2);
    const rY1 = Math.min(my1,my2), rY2 = Math.max(my1,my2);

    let minPx = Infinity, minPy = Infinity, maxPx = -Infinity, maxPy = -Infinity;
    for (const [cx, cy] of [[rX1,rY1],[rX2,rY1],[rX2,rY2],[rX1,rY2]]) {
        const { lx, ly } = canvasToLocal(g.cx, g.cy, g.angle, cx, cy);
        const px = lx / cfg.sx + img.width  / 2;
        const py = ly / cfg.sy + img.height / 2;
        if (px < minPx) minPx = px;
        if (py < minPy) minPy = py;
        if (px > maxPx) maxPx = px;
        if (py > maxPy) maxPy = py;
    }

    // Clamp to image bounds
    const x0 = Math.max(0, Math.floor(minPx));
    const y0 = Math.max(0, Math.floor(minPy));
    const x1 = Math.min(img.width  - 1, Math.ceil(maxPx));
    const y1 = Math.min(img.height - 1, Math.ceil(maxPy));
    if (x0 > x1 || y0 > y1) return false;

    // Check if any pixel in the overlap region is opaque
    const data = hc.getContext("2d").getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) return true;
    }
    return false;
}

// ── Marching squares ──────────────────────────────────────────────────────────

function generateContour(image) {
    const w = image.width, h = image.height;
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const offCtx = off.getContext("2d");
    offCtx.drawImage(image, 0, 0);
    const data = offCtx.getImageData(0, 0, w, h).data;

    function isSolid(px, py) {
        if (px < 0 || py < 0 || px >= w || py >= h) return false;
        return data[(py*w+px)*4+3] > 10;
    }

    const segments = [];
    for (let y = -1; y < h; y++) {
        for (let x = -1; x < w; x++) {
            const tl = isSolid(x,y)?1:0, tr = isSolid(x+1,y)?1:0;
            const bl = isSolid(x,y+1)?1:0, br = isSolid(x+1,y+1)?1:0;
            const idx = (tl<<3)|(tr<<2)|(br<<1)|bl;
            const cx=x+1, cy=y+1;
            const T=[cx-.5,cy-1],B=[cx-.5,cy],L=[cx-1,cy-.5],R=[cx,cy-.5];
            switch(idx){
                case 1:segments.push([B,L]);break; case 2:segments.push([R,B]);break;
                case 3:segments.push([R,L]);break; case 4:segments.push([T,R]);break;
                case 5:segments.push([T,L]);segments.push([R,B]);break;
                case 6:segments.push([T,B]);break; case 7:segments.push([T,L]);break;
                case 8:segments.push([L,T]);break; case 9:segments.push([B,T]);break;
                case 10:segments.push([L,B]);segments.push([T,R]);break;
                case 11:segments.push([R,T]);break; case 12:segments.push([L,R]);break;
                case 13:segments.push([B,R]);break; case 14:segments.push([L,B]);break;
            }
        }
    }

    const ptKey = p=>`${p[0]},${p[1]}`;
    const adj = new Map();
    for (const seg of segments) {
        const a=ptKey(seg[0]),b=ptKey(seg[1]);
        if(!adj.has(a))adj.set(a,[]);
        if(!adj.has(b))adj.set(b,[]);
        adj.get(a).push({pt:seg[1],key:b});
        adj.get(b).push({pt:seg[0],key:a});
    }

    const visited=new Set(), chains=[];
    const eKey=(a,b)=>`${a}->${b}`;
    for (const seg of segments) {
        const sk=ptKey(seg[0]);
        if(visited.has(eKey(sk,ptKey(seg[1]))))continue;
        const chain=[seg[0]];
        let next={pt:seg[1],key:ptKey(seg[1])};
        visited.add(eKey(sk,next.key)); visited.add(eKey(next.key,sk));
        while(true){
            chain.push(next.pt);
            const nbrs=adj.get(next.key)||[];
            let found=false;
            for(const nb of nbrs){
                if(!visited.has(eKey(next.key,nb.key))){
                    visited.add(eKey(next.key,nb.key)); visited.add(eKey(nb.key,next.key));
                    next=nb; found=true; break;
                }
            }
            if(!found)break;
            if(next.key===ptKey(chain[0])){chain.push(chain[0]);break;}
        }
        if(chain.length>2)chains.push(chain);
    }

    const path=new Path2D();
    for(const chain of chains){
        path.moveTo(chain[0][0],chain[0][1]);
        for(let i=1;i<chain.length;i++)path.lineTo(chain[i][0],chain[i][1]);
        path.closePath();
    }
    return path;
}

// ── Marching ants rendering ───────────────────────────────────────────────────

let antOffset = 0;
const ANT_SPEED = 1.2;

function strokeAnts(path, lineWidth, dash) {
    ctx.strokeStyle    = "#ffffff";
    ctx.lineWidth      = lineWidth;
    ctx.setLineDash([dash, dash]);
    ctx.lineDashOffset = -(antOffset + dash);
    ctx.stroke(path);
    ctx.strokeStyle    = "#000000";
    ctx.lineDashOffset = -antOffset;
    ctx.stroke(path);
    ctx.setLineDash([]);
}

function drawMarchingAnts(name) {
    if (name === "text") {
        drawTextMarchingAnts();
        return;
    }
    const path = contourPaths[name];
    if (!path) return;
    const cfg = config[name];
    const img = (name === "board") ? boardImage : images[name];
    if (!img) return;

    const w  = img.width * cfg.sx, h = img.height * cfg.sy;
    const cx = cfg.x + w/2, cy = cfg.y + h/2;
    const avgScale = (Math.abs(cfg.sx) + Math.abs(cfg.sy)) / 2;
    const lw = 3 / avgScale, dash = 12 / avgScale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((cfg.rotation * Math.PI) / 180);
    ctx.scale(cfg.sx, cfg.sy);
    ctx.translate(-img.width/2, -img.height/2);
    strokeAnts(path, lw, dash);
    ctx.restore();
}

function drawTextMarchingAnts() {
    if (!textStyle.content) return;
    const { cx, cy, hw, hh, angle } = getTextGeom(), p = TEXT_PAD;
    const rectPath = new Path2D();
    rectPath.rect(-(hw+p), -(hh+p), (hw+p)*2, (hh+p)*2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    strokeAnts(rectPath, 3, 12);
    ctx.restore();
}

// Group selection box — blue dashed AABB
function drawGroupBox() {
    // During group rotation, use the frozen start AABB to avoid expansion
    const bb = (isRotating && groupRotateStart && groupRotateStart.startBB)
        ? groupRotateStart.startBB
        : getGroupAABB();
    if (!bb) return;
    ctx.save();
    ctx.strokeStyle    = "#0088ff";
    ctx.lineWidth      = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -antOffset * 0.5;
    ctx.strokeRect(bb.minX, bb.minY, bb.maxX - bb.minX, bb.maxY - bb.minY);
    ctx.setLineDash([]);
    ctx.restore();
}

// Marquee rubber-band
function drawMarqueeRect() {
    if (!isMarquee || !marqueeStart || !marqueeEnd) return;
    const x = Math.min(marqueeStart.x, marqueeEnd.x);
    const y = Math.min(marqueeStart.y, marqueeEnd.y);
    const w = Math.abs(marqueeEnd.x - marqueeStart.x);
    const h = Math.abs(marqueeEnd.y - marqueeStart.y);
    ctx.save();
    ctx.fillStyle   = "rgba(0, 136, 255, 0.08)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#0088ff";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.restore();
}

// ── Handle drawing ────────────────────────────────────────────────────────────

function drawRotationHandle(x, y, outAngle) {
    const r = HANDLE_RADIUS;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle   = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(outAngle);
    const ar=r*0.52, startA=0.35, endA=Math.PI*1.65;
    ctx.beginPath();
    ctx.arc(0, 0, ar, startA, endA);
    ctx.strokeStyle="#222"; ctx.lineWidth=2.2; ctx.lineCap="round";
    ctx.stroke();
    const ha=endA+Math.PI/2, hx=Math.cos(endA)*ar, hy=Math.sin(endA)*ar, hs=r*0.28;
    ctx.beginPath();
    ctx.moveTo(hx,hy);
    ctx.lineTo(hx+Math.cos(ha-.5)*hs, hy+Math.sin(ha-.5)*hs);
    ctx.lineTo(hx+Math.cos(ha+.5)*hs, hy+Math.sin(ha+.5)*hs);
    ctx.closePath(); ctx.fillStyle="#222"; ctx.fill();
    ctx.restore();
}

function drawResizeHandle(x, y) {
    const r = EDGE_RADIUS;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle="#0088ff"; ctx.fill();
    ctx.strokeStyle="#ffffff"; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x-r*.45,y); ctx.lineTo(x+r*.45,y);
    ctx.moveTo(x,y-r*.45); ctx.lineTo(x,y+r*.45);
    ctx.strokeStyle="#ffffff"; ctx.lineWidth=2; ctx.stroke();
}

function drawHandles() {
    if (!hasSelection()) return;

    if (selectedLayers.size > 1) {
        // Group: handles on AABB corners/edges, no rotation indicator angle needed
        const corners = groupAABBCorners();
        const edges   = groupAABBEdges();
        if (!corners || !edges) return;
        const outAngles = [Math.PI*1.25, Math.PI*1.75, Math.PI*0.25, Math.PI*0.75];
        for (let i = 0; i < 4; i++) drawResizeHandle(corners[i].x, corners[i].y);
        for (let i = 0; i < 4; i++) drawRotationHandle(edges[i].x, edges[i].y, outAngles[i]);
    } else {
        const name  = getSingleLayer();
        const corners = name === "text" ? getTextCorners()      : getLayerCorners(name);
        const edges   = name === "text" ? getTextEdgeMidpoints(): getLayerEdgeMidpoints(name);
        if (!corners || !edges) return;
        const angle = name === "text"
            ? (textStyle.rotation * Math.PI) / 180
            : (config[name].rotation * Math.PI) / 180;
        const outAngles = [
            angle+Math.PI*0.0,  angle+Math.PI*0.5,
            angle+Math.PI*1.0,  angle+Math.PI*1.5
        ];
        for (let i = 0; i < 4; i++) drawResizeHandle(corners[i].x, corners[i].y);
        for (let i = 0; i < 4; i++) drawRotationHandle(edges[i].x, edges[i].y, outAngles[i]);
    }
}

// ── Checkerboard ──────────────────────────────────────────────────────────────

function drawCheckerboard() {
    const size = 20;
    for (let y = 0; y < canvas.height; y += size)
        for (let x = 0; x < canvas.width; x += size) {
            ctx.fillStyle = ((x/size+y/size)%2===0) ? "#ddd" : "#fff";
            ctx.fillRect(x, y, size, size);
        }
}

// ── Render ────────────────────────────────────────────────────────────────────

function drawImageLayer(name) {
    const cfg = config[name];
    const img = images[name];
    if (!img) return;
    const w=img.width*cfg.sx, h=img.height*cfg.sy;
    const cx=cfg.x+w/2, cy=cfg.y+h/2;
    ctx.save();
    ctx.globalAlpha = cfg.opacity ?? 1;
    ctx.translate(cx,cy);
    ctx.rotate((cfg.rotation*Math.PI)/180);
    ctx.drawImage(img,-w/2,-h/2,w,h);
    ctx.restore();
}

function drawBoardLayer() {
    const cfg=config.board, img=boardImage;
    const w=img.width*cfg.sx, h=img.height*cfg.sy;
    const cx=cfg.x+w/2, cy=cfg.y+h/2;
    ctx.save();
    ctx.globalAlpha = cfg.opacity ?? 1;
    ctx.translate(cx,cy);
    ctx.rotate((cfg.rotation*Math.PI)/180);
    ctx.drawImage(boardTintCanvas,-w/2,-h/2,w,h);
    ctx.drawImage(boardOutlineImage,-w/2,-h/2,w,h);
    ctx.restore();
}

function getTextMetrics() {
    if (textStyle.font === "Nougat" && nougat.ready) {
        const w     = measureNougatText(textStyle.content, textStyle.size);
        const scale = textStyle.size / nougat.meta.unitsPerEm;
        const h     = (nougat.meta.ascender - nougat.meta.descender) * scale;
        return { w, h };
    }
    ctx.save();
    ctx.font = `${textStyle.size}px ${textStyle.font}`;
    const m  = ctx.measureText(textStyle.content);
    ctx.restore();
    return { w: m.width, h: textStyle.size * 1.2 };
}

function drawText() {
    if (!textStyle.content) return;
    const cx=config.text.x, cy=config.text.y;
    const angle=(textStyle.rotation*Math.PI)/180;
    ctx.save();
    ctx.globalAlpha = textStyle.opacity ?? 1;
    ctx.translate(cx,cy);
    ctx.rotate(angle);
    if (textStyle.font === "Nougat" && nougat.ready) {
        drawNougatText(ctx, textStyle.content, 0, 0, textStyle.size, textStyle.color);
    } else {
        ctx.font=`${textStyle.size}px ${textStyle.font}`;
        ctx.fillStyle=textStyle.color;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(textStyle.content, 0, 0);
    }
    ctx.restore();
}

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCheckerboard();
    if (background.type === "solid") {
        ctx.fillStyle = hexToRgba(background.color, background.colorOpacity ?? 1);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }
    if (background.type === "gradient") {
        let grad;
        if (background.gradType === "linear") {
            const rad = (background.angle - 90) * Math.PI / 180;
            const cx = canvas.width / 2, cy = canvas.height / 2;
            const half = Math.sqrt(canvas.width**2 + canvas.height**2) / 2;
            grad = ctx.createLinearGradient(
                cx + Math.cos(rad + Math.PI) * half, cy + Math.sin(rad + Math.PI) * half,
                cx + Math.cos(rad) * half,           cy + Math.sin(rad) * half
            );
        } else {
            grad = ctx.createRadialGradient(
                canvas.width/2, canvas.height/2, 0,
                canvas.width/2, canvas.height/2, Math.sqrt(canvas.width**2 + canvas.height**2) / 2
            );
        }
        const sorted = [...background.stops].sort((a, b) => a.position - b.position);
        sorted.forEach(s => grad.addColorStop(s.position / 100, hexToRgba(s.color, s.opacity ?? 1)));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawLayer(name) {
    if (name === "text")  { drawText(); return; }
    if (name === "board") { drawBoardLayer(); return; }
    drawImageLayer(name);
}

function render() {
    drawBackground();
    for (const name of layerOrder) drawLayer(name);

    // Draw marching ants for each selected layer
    for (const name of selectedLayers) drawMarchingAnts(name);

    // Group box when multiple selected
    if (selectedLayers.size > 1) drawGroupBox();

    drawHandles();
    drawMarqueeRect();
}

// ── Animation loop ────────────────────────────────────────────────────────────

function animationLoop() {
    antOffset = (antOffset + ANT_SPEED) % 24;
    render();
    syncLayersPanelIfNeeded();
    requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);

// ── Input sync ────────────────────────────────────────────────────────────────

function updateInputs() {
    for (const name of IMAGE_LAYERS) {
        const cfg=config[name], inp=layerInputs[name];
        inp.x.value=cfg.x; inp.y.value=cfg.y;
        inp.sx.value=cfg.sx.toFixed(2); inp.sy.value=cfg.sy.toFixed(2);
        inp.rotation.value=cfg.rotation;
        inp.rotationVal.textContent=`${cfg.rotation}°`;
        inp.opacity.value=cfg.opacity ?? 1;
    }
    textX.value=config.text.x; textY.value=config.text.y;
}

// ── Input bindings ────────────────────────────────────────────────────────────

for (const name of IMAGE_LAYERS) {
    const inp=layerInputs[name];
    const cfg=()=>config[name];
    inp.x.addEventListener("input",()=>{ cfg().x=Number(inp.x.value); });
    inp.y.addEventListener("input",()=>{ cfg().y=Number(inp.y.value); });
    inp.rotation.addEventListener("input",()=>{
        cfg().rotation=Number(inp.rotation.value);
        inp.rotationVal.textContent=`${cfg().rotation}°`;
    });
    inp.sx.addEventListener("input",()=>{
        cfg().sx=Number(inp.sx.value);
        if(inp.lock.checked){ cfg().sy=cfg().sx; inp.sy.value=cfg().sx.toFixed(2); }
    });
    inp.sy.addEventListener("input",()=>{
        cfg().sy=Number(inp.sy.value);
        if(inp.lock.checked){ cfg().sx=cfg().sy; inp.sx.value=cfg().sy.toFixed(2); }
    });
    inp.opacity.addEventListener("input",()=>{ cfg().opacity=Number(inp.opacity.value); });
}

textX.addEventListener("input",()=>{ config.text.x=Number(textX.value); });
textY.addEventListener("input",()=>{ config.text.y=Number(textY.value); });
document.getElementById("text-opacity").addEventListener("input", e => { textStyle.opacity=Number(e.target.value); });
boardColorInput.addEventListener("input",()=>{ boardColor=boardColorInput.value; updateBoardTint(); });
textInput.addEventListener("input",()=>{ textStyle.content=textInput.value; });
textColor.addEventListener("input",()=>{ textStyle.color=textColor.value; });
textFont.addEventListener("change",()=>{ textStyle.font=textFont.value; });
textSize.addEventListener("input",()=>{ textStyle.size=Math.max(1,Number(textSize.value)); });
textRotation.addEventListener("input",()=>{
    textStyle.rotation=Number(textRotation.value);
    textRotationVal.textContent=`${textStyle.rotation}°`;
});

document.getElementById("export-btn").addEventListener("click", () => {
    const fmt      = document.getElementById("export-format").value;
    const filename = (document.getElementById("export-filename").value.trim() || "custom-name-pin") + "." + fmt;
    const mimeType = fmt === "jpg" ? "image/jpeg" : "image/png";
    // Render to offscreen canvas without checkerboard
    const offscreen  = document.createElement("canvas");
    offscreen.width  = canvas.width;
    offscreen.height = canvas.height;

    // Temporarily swap ctx so all existing draw functions render to offscreen
    const realCtx = ctx;
    // eslint-disable-next-line no-global-assign
    ctx = offscreen.getContext("2d");

    // Draw background without checkerboard
    if (background.type === "solid") {
        ctx.fillStyle = hexToRgba(background.color, background.colorOpacity ?? 1);
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    } else if (background.type === "gradient") {
        let grad;
        if (background.gradType === "linear") {
            const rad  = (background.angle - 90) * Math.PI / 180;
            const cx   = offscreen.width / 2, cy = offscreen.height / 2;
            const half = Math.sqrt(offscreen.width**2 + offscreen.height**2) / 2;
            grad = ctx.createLinearGradient(
                cx + Math.cos(rad + Math.PI) * half, cy + Math.sin(rad + Math.PI) * half,
                cx + Math.cos(rad) * half,           cy + Math.sin(rad) * half
            );
        } else {
            grad = ctx.createRadialGradient(
                offscreen.width/2, offscreen.height/2, 0,
                offscreen.width/2, offscreen.height/2,
                Math.sqrt(offscreen.width**2 + offscreen.height**2) / 2
            );
        }
        const sorted = [...background.stops].sort((a,b) => a.position - b.position);
        sorted.forEach(s => grad.addColorStop(s.position / 100, hexToRgba(s.color, s.opacity ?? 1)));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    }
    // If solid with opacity 0 or no background type: leave transparent

    // Draw layers
    for (const name of layerOrder) drawLayer(name);

    // Restore real ctx
    ctx = realCtx;

    // JPG doesn't support transparency — fill with white underneath first
    if (fmt === "jpg") {
        const jpgCanvas  = document.createElement("canvas");
        jpgCanvas.width  = offscreen.width;
        jpgCanvas.height = offscreen.height;
        const jpgCtx     = jpgCanvas.getContext("2d");
        jpgCtx.fillStyle = "#ffffff";
        jpgCtx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
        jpgCtx.drawImage(offscreen, 0, 0);
        jpgCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement("a");
            a.href     = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }, mimeType, 0.95);
    } else {
        offscreen.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement("a");
            a.href     = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }, mimeType);
    }
});

// ── Full session save / load ──────────────────────────────────────────────────

function buildFullConfig() {
    return {
        config: {
            face:       { ...config.face },
            board:      { ...config.board, color: boardColor },
            hand_left:  { ...config.hand_left },
            hand_right: { ...config.hand_right },
            text:       { ...config.text }
        },
        textStyle: { ...textStyle },
        background: JSON.parse(JSON.stringify(background)),
        layerOrder: [...layerOrder]
    };
}

function applyFullConfig(data) {
    // Layers
    if (data.config) {
        if (data.config.face)       config.face       = { ...data.config.face };
        if (data.config.board)      { config.board    = { ...data.config.board }; boardColor = data.config.board.color ?? boardColor; updateBoardTint(); }
        if (data.config.hand_left)  config.hand_left  = { ...data.config.hand_left };
        if (data.config.hand_right) config.hand_right = { ...data.config.hand_right };
        if (data.config.text)       config.text       = { ...data.config.text };
    }
    // Text style
    if (data.textStyle) {
        Object.assign(textStyle, data.textStyle);
        textInput.value            = textStyle.content;
        textColorInput.value       = textStyle.color;
        textSize.value             = textStyle.size;
        textRotation.value         = textStyle.rotation;
        textRotationVal.textContent = `${textStyle.rotation}°`;
        document.getElementById("text-opacity").value = textStyle.opacity ?? 1;
    }
    // Background
    if (data.background) {
        Object.assign(background, data.background);
        bgTypeSelect.value  = background.type;
        bgSolidColor.value  = background.color;
        document.getElementById("bg-solid-opacity").value = background.colorOpacity ?? 1;
        bgGradType.value    = background.gradType;
        bgAngle.value       = background.angle;
        bgAngleVal.textContent = `${background.angle}°`;
        bgUpdateUI();
    }
    // Layer order
    if (data.layerOrder) layerOrder = [...data.layerOrder];
    updateInputs();
}

document.getElementById("save-config").addEventListener("click", () => {
    const json = JSON.stringify(buildFullConfig(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "custom-name-pin-config.json";
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById("load-config").addEventListener("click", () => {
    const input    = document.createElement("input");
    input.type     = "file";
    input.accept   = ".json,application/json";
    input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                applyFullConfig(data);
            } catch {
                alert("Invalid config file.");
            }
        };
        reader.readAsText(file);
    });
    input.click();
});

// ── Share via URL hash ───────────────────────────────────────────────────────

document.getElementById("share-btn").addEventListener("click", async () => {
    const json       = JSON.stringify(buildFullConfig());
    const compressed = LZString.compressToEncodedURIComponent(json);
    const url        = `${location.origin}${location.pathname}#share=${compressed}`;
    await navigator.clipboard.writeText(url);
    const btn = document.getElementById("share-btn");
    const orig = btn.textContent;
    btn.textContent = "✓ Link copied!";
    setTimeout(() => { btn.textContent = orig; }, 2000);
});

function restoreFromHash() {
    const hash = location.hash;
    if (!hash.startsWith("#share=")) return;
    try {
        const compressed = hash.slice("#share=".length);
        const json       = LZString.decompressFromEncodedURIComponent(compressed);
        const data       = JSON.parse(json);
        // Wait for brawler assets to load before applying
        applyFullConfig(data);
        // Clear the hash so refreshing doesn't re-apply
        history.replaceState(null, "", location.pathname);
    } catch {
        console.warn("Failed to restore from share link.");
    }
}

copyButton.addEventListener("click", async () => {
    const out = {
        face: config.face, hand_left: config.hand_left, hand_right: config.hand_right,
        board: { ...config.board, color: boardColor },
        text: {
            x: config.text.x, y: config.text.y,
            content: textStyle.content, color: textStyle.color,
            font: textStyle.font, size: textStyle.size, rotation: textStyle.rotation,
            opacity: textStyle.opacity
        },
        background: JSON.parse(JSON.stringify(background)),
        layerOrder: [...layerOrder]
    };
    await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    alert("Copied");
});

// ── Group transform helpers ───────────────────────────────────────────────────

function getLayerCentre(name) {
    if (name === "text") return { x: config.text.x, y: config.text.y };
    const g = getLayerGeom(name);
    return g ? { x: g.cx, y: g.cy } : null;
}

function setLayerPosition(name, x, y) {
    if (name === "text") {
        config.text.x = Math.round(x);
        config.text.y = Math.round(y);
    } else {
        const img = (name === "board") ? boardImage : images[name];
        const cfg = config[name];
        config[name].x = Math.round(x - img.width  * cfg.sx / 2);
        config[name].y = Math.round(y - img.height * cfg.sy / 2);
    }
}

// Rotate a point around a pivot
function rotateAround(px, py, cx, cy, angle) {
    const cos=Math.cos(angle), sin=Math.sin(angle);
    const dx=px-cx, dy=py-cy;
    return { x: cx + dx*cos - dy*sin, y: cy + dx*sin + dy*cos };
}

// ── Mouse events ──────────────────────────────────────────────────────────────

canvas.addEventListener("mousedown", event => {
    const mouse = getMousePos(event);

    // 1. Rotation handles
    const rotIdx = rotationHandleHitTest(mouse.x, mouse.y);
    if (rotIdx !== -1) {
        isRotating = true; rotateSnapshotTaken = false;
        rotatingLayer = getSingleLayer(); // null if group

        if (selectedLayers.size > 1) {
            const centre = groupCentre();
            rotateStartAngle    = (Math.atan2(mouse.y-centre.y, mouse.x-centre.x)*180)/Math.PI;
            rotateStartRotation = 0;
            groupRotateStart = {
                centre,
                startBB: getGroupAABB(),
                layerStarts: {}
            };
            for (const name of selectedLayers) {
                const c = getLayerCentre(name);
                groupRotateStart.layerStarts[name] = {
                    cx: c.x, cy: c.y,
                    rotation: name === "text" ? textStyle.rotation : config[name].rotation
                };
            }
        } else {
            const name   = getSingleLayer();
            const centre = name === "text"
                ? { x: config.text.x, y: config.text.y }
                : (() => { const g=getLayerGeom(name); return {x:g.cx,y:g.cy}; })();
            rotateStartAngle    = (Math.atan2(mouse.y-centre.y, mouse.x-centre.x)*180)/Math.PI;
            rotateStartRotation = name === "text" ? textStyle.rotation : config[name].rotation;
        }
        return;
    }

    // 2. Resize handles
    const edge = resizeHandleHitTest(mouse.x, mouse.y);
    if (edge !== null && edge !== -1) {
        isResizing=true; resizeSnapshotTaken=false;
        resizeEdge=edge; resizingLayer=getSingleLayer();
        resizeStartMouse={ ...mouse };

        if (selectedLayers.size > 1) {
            const bb = getGroupAABB();
            groupResizeStart = {
                bb,
                layerStarts: {}
            };
            for (const name of selectedLayers) {
                const c = getLayerCentre(name);
                groupResizeStart.layerStarts[name] = {
                    cx: c.x, cy: c.y,
                    sx: name === "text" ? 1 : config[name].sx,
                    sy: name === "text" ? 1 : config[name].sy,
                    size: name === "text" ? textStyle.size : null
                };
            }
        } else {
            const name = getSingleLayer();
            resizeStartConfig = name === "text"
                ? { ...config.text, w: getTextMetrics().w, h: getTextMetrics().h, size: textStyle.size }
                : { ...config[name] };
        }
        return;
    }

    // 3. Layer hit tests (reverse render order — topmost first)
    const hitOrder = [...layerOrder].reverse();
    let hitName = null;
    for (const name of hitOrder) {
        if (name === "text") {
            if (textHitTest(mouse.x, mouse.y)) { hitName = "text"; break; }
        } else {
            const img = (name==="board") ? boardImage : images[name];
            if (img && pixelHitTest(name, img, mouse.x, mouse.y)) { hitName = name; break; }
        }
    }

    if (hitName) {
        // Shift-click or Ctrl/Cmd-click: add/remove from selection
        if (event.ctrlKey || event.metaKey) {
            if (selectedLayers.has(hitName)) selectedLayers.delete(hitName);
            else selectedLayers.add(hitName);
            lastSelectedLayer = hitName;
        } else {
            // If clicked layer is already in selection, start dragging the group
            if (!selectedLayers.has(hitName)) setSelectedLayer(hitName);
        }

        // Start drag — store all selected layer positions
        isDragging=true; dragSnapshotTaken=false;
        dragStartConfigs = {};
        for (const name of selectedLayers) {
            const c = getLayerCentre(name);
            dragStartConfigs[name] = { cx: c.x, cy: c.y };
        }
        dragOffsetX = mouse.x;
        dragOffsetY = mouse.y;
    } else {
        // Clicked empty canvas — start marquee
        setSelectedLayer(null);
        isMarquee    = true;
        marqueeStart = { ...mouse };
        marqueeEnd   = { ...mouse };
    }
});

canvas.addEventListener("mousemove", event => {
    const mouse = getMousePos(event);

    // Cursor
    if (!isRotating && !isDragging && !isResizing && !isMarquee) {
        if (rotationHandleHitTest(mouse.x, mouse.y) !== -1)   canvas.style.cursor = "crosshair";
        else if (resizeHandleHitTest(mouse.x, mouse.y) !== -1) canvas.style.cursor = "nesw-resize";
        else canvas.style.cursor = "default";
    }

    // Marquee
    if (isMarquee) {
        marqueeEnd = { ...mouse };
        return;
    }

    // Rotation
    if (isRotating) {
        if (!rotateSnapshotTaken) { pushUndo(snapshotConfig()); rotateSnapshotTaken=true; }

        if (selectedLayers.size > 1 && groupRotateStart) {
            const centre = groupRotateStart.centre;
            const curr   = (Math.atan2(mouse.y-centre.y, mouse.x-centre.x)*180)/Math.PI;
            const delta  = curr - rotateStartAngle;
            const rad    = (delta * Math.PI) / 180;

            for (const name of selectedLayers) {
                const ls = groupRotateStart.layerStarts[name];
                const newRot = Math.round(ls.rotation + delta);
                const newC   = rotateAround(ls.cx, ls.cy, centre.x, centre.y, rad);

                if (name === "text") {
                    textStyle.rotation = newRot;
                    textRotation.value = Math.max(-180, Math.min(180, newRot));
                    textRotationVal.textContent = `${newRot}°`;
                    config.text.x = Math.round(newC.x);
                    config.text.y = Math.round(newC.y);
                } else {
                    config[name].rotation = newRot;
                    const inp = layerInputs[name];
                    inp.rotation.value = Math.max(-180, Math.min(180, newRot));
                    inp.rotationVal.textContent = `${newRot}°`;
                    const img = (name==="board") ? boardImage : images[name];
                    config[name].x = Math.round(newC.x - img.width  * config[name].sx / 2);
                    config[name].y = Math.round(newC.y - img.height * config[name].sy / 2);
                }
            }
        } else {
            const name   = rotatingLayer;
            const centre = name === "text"
                ? { x: config.text.x, y: config.text.y }
                : (() => { const g=getLayerGeom(name); return {x:g.cx,y:g.cy}; })();
            const curr = (Math.atan2(mouse.y-centre.y, mouse.x-centre.x)*180)/Math.PI;
            const deg  = Math.round(rotateStartRotation + (curr - rotateStartAngle));
            if (name === "text") {
                textStyle.rotation=deg;
                textRotation.value=Math.max(-180,Math.min(180,deg));
                textRotationVal.textContent=`${deg}°`;
            } else {
                config[name].rotation=deg;
                const inp=layerInputs[name];
                inp.rotation.value=Math.max(-180,Math.min(180,deg));
                inp.rotationVal.textContent=`${deg}°`;
            }
        }
        updateInputs();
        return;
    }

    // Resize
    if (isResizing) {
        if (!resizeSnapshotTaken) { pushUndo(snapshotConfig()); resizeSnapshotTaken=true; }

        if (selectedLayers.size > 1 && groupResizeStart) {
            // Group resize: scale all layers proportionally relative to group AABB
            const bb   = groupResizeStart.bb;
            const bbW  = bb.maxX - bb.minX;
            const bbH  = bb.maxY - bb.minY;
            const dx   = mouse.x - resizeStartMouse.x;
            const dy   = mouse.y - resizeStartMouse.y;

            let scaleX = 1, scaleY = 1;
            const edgeRight  = resizeEdge === "right"  || resizeEdge === "top-right"    || resizeEdge === "bottom-right";
            const edgeLeft   = resizeEdge === "left"   || resizeEdge === "top-left"     || resizeEdge === "bottom-left";
            const edgeBottom = resizeEdge === "bottom" || resizeEdge === "bottom-left"  || resizeEdge === "bottom-right";
            const edgeTop    = resizeEdge === "top"    || resizeEdge === "top-left"     || resizeEdge === "top-right";
            if (edgeRight)  scaleX = Math.max(0.05, (bbW + dx) / bbW);
            if (edgeLeft)   scaleX = Math.max(0.05, (bbW - dx) / bbW);
            if (edgeBottom) scaleY = Math.max(0.05, (bbH + dy) / bbH);
            if (edgeTop)    scaleY = Math.max(0.05, (bbH - dy) / bbH);

            // Anchor point — opposite corner of group AABB
            const anchorX = edgeLeft  ? bb.maxX : bb.minX;
            const anchorY = edgeTop   ? bb.maxY : bb.minY;

            for (const name of selectedLayers) {
                const ls = groupResizeStart.layerStarts[name];
                const newCx = anchorX + (ls.cx - anchorX) * scaleX;
                const newCy = anchorY + (ls.cy - anchorY) * scaleY;

                if (name === "text") {
                    const scale = (edgeTop || edgeBottom) ? scaleY : scaleX;
                    const newSize = Math.max(8, Math.round(ls.size * scale));
                    textStyle.size = newSize;
                    textSize.value = newSize;
                    config.text.x = Math.round(newCx);
                    config.text.y = Math.round(newCy);
                } else {
                    const img = (name==="board") ? boardImage : images[name];
                    config[name].sx = Math.round(ls.sx * scaleX * 1000) / 1000;
                    config[name].sy = Math.round(ls.sy * scaleY * 1000) / 1000;
                    config[name].x  = Math.round(newCx - img.width  * config[name].sx / 2);
                    config[name].y  = Math.round(newCy - img.height * config[name].sy / 2);
                }
            }
        } else {
            // Single layer resize
            const name = resizingLayer;
            if (name !== "text") {
                const cfg=config[name], inp=layerInputs[name];
                const img=(name==="board")?boardImage:images[name];
                const locked=inp.lock.checked, sc=resizeStartConfig;
                const angle=(sc.rotation*Math.PI)/180;
                const {lx,ly}=canvasToLocal(sc.x+img.width*sc.sx/2, sc.y+img.height*sc.sy/2, angle, mouse.x, mouse.y);
                const {lx:lx0,ly:ly0}=canvasToLocal(sc.x+img.width*sc.sx/2, sc.y+img.height*sc.sy/2, angle, resizeStartMouse.x, resizeStartMouse.y);
                const dLocal={x:lx-lx0, y:ly-ly0};
                let newSx=sc.sx, newSy=sc.sy;
                const eR = resizeEdge==="right"||resizeEdge==="top-right"||resizeEdge==="bottom-right";
                const eL = resizeEdge==="left" ||resizeEdge==="top-left" ||resizeEdge==="bottom-left";
                const eB = resizeEdge==="bottom"||resizeEdge==="bottom-left"||resizeEdge==="bottom-right";
                const eT = resizeEdge==="top"  ||resizeEdge==="top-left" ||resizeEdge==="top-right";
                if(eR) newSx=Math.max(.05,sc.sx+dLocal.x/img.width);
                if(eL) newSx=Math.max(.05,sc.sx-dLocal.x/img.width);
                if(eB) newSy=Math.max(.05,sc.sy+dLocal.y/img.height);
                if(eT) newSy=Math.max(.05,sc.sy-dLocal.y/img.height);
                if(locked){
                    const ratio=sc.sy/sc.sx;
                    if(eR||eL) newSy=newSx*ratio;
                    else newSx=newSy/ratio;
                }
                cfg.sx=Math.round(newSx*1000)/1000;
                cfg.sy=Math.round(newSy*1000)/1000;
                const newW=img.width*cfg.sx, newH=img.height*cfg.sy;
                const oldW=img.width*sc.sx,  oldH=img.height*sc.sy;
                if(eR||eB){ cfg.x=sc.x; cfg.y=sc.y; }
                else if(eL&&!eT){ cfg.x=sc.x+(oldW-newW); cfg.y=sc.y; }
                else if(eT&&!eL){ cfg.x=sc.x; cfg.y=sc.y+(oldH-newH); }
                else if(eL&&eT){ cfg.x=sc.x+(oldW-newW); cfg.y=sc.y+(oldH-newH); }
                inp.sx.value=cfg.sx.toFixed(2); inp.sy.value=cfg.sy.toFixed(2);
                inp.x.value=cfg.x; inp.y.value=cfg.y;
            } else {
                const sc=resizeStartConfig;
                const angle=(textStyle.rotation*Math.PI)/180;
                const {lx,ly}=canvasToLocal(sc.x,sc.y,angle,mouse.x,mouse.y);
                const {lx:lx0,ly:ly0}=canvasToLocal(sc.x,sc.y,angle,resizeStartMouse.x,resizeStartMouse.y);
                let delta=0;
                const tR=resizeEdge==="right"||resizeEdge==="top-right"||resizeEdge==="bottom-right";
                const tL=resizeEdge==="left" ||resizeEdge==="top-left" ||resizeEdge==="bottom-left";
                const tB=resizeEdge==="bottom"||resizeEdge==="bottom-left"||resizeEdge==="bottom-right";
                const tT=resizeEdge==="top"  ||resizeEdge==="top-left" ||resizeEdge==="top-right";
                if(tR||tL) delta=lx-lx0;
                if(tB||tT) delta=ly-ly0;
                if(tL||tT) delta=-delta;
                const halfDim=(tR||tL) ? sc.w/2 : sc.h/2;
                const newSize=Math.max(8,Math.round(sc.size*(1+delta/halfDim)));
                textStyle.size=newSize; textSize.value=newSize;
            }
        }
        return;
    }

    // Drag
    if (!isDragging || !dragStartConfigs) return;
    if (!dragSnapshotTaken) { pushUndo(snapshotConfig()); dragSnapshotTaken=true; }

    const dx = mouse.x - dragOffsetX;
    const dy = mouse.y - dragOffsetY;

    for (const name of selectedLayers) {
        const start = dragStartConfigs[name];
        if (!start) continue;
        setLayerPosition(name, start.cx + dx, start.cy + dy);
    }
    updateInputs();
});

function stopInteraction() {
    // Finalise marquee selection
    if (isMarquee && marqueeStart && marqueeEnd) {
        const hits = ALL_LAYERS.filter(name => {
            // Skip text if no content
            if (name === "text" && !textStyle.content) return false;
            if (name === "hand_left"  && !images.hand_left)  return false;
            if (name === "hand_right" && !images.hand_right) return false;
            if (name === "face"       && !images.face)       return false;
            return layerIntersectsMarquee(name, marqueeStart.x, marqueeStart.y, marqueeEnd.x, marqueeEnd.y);
        });
        if (hits.length > 0) setSelectedGroup(hits);
    }

    isDragging=dragSnapshotTaken=false;
    isRotating=rotateSnapshotTaken=false;
    isResizing=resizeSnapshotTaken=false;
    isMarquee=false;
    marqueeStart=marqueeEnd=null;
    rotatingLayer=resizingLayer=resizeEdge=null;
    dragStartConfigs=groupRotateStart=groupResizeStart=null;
    canvas.style.cursor="default";
}

canvas.addEventListener("mouseup",    stopInteraction);
canvas.addEventListener("mouseleave", stopInteraction);

document.addEventListener("keyup", event => {
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) nudgeSnapshotTaken = false;
});

// ── Keyboard ──────────────────────────────────────────────────────────────────

document.addEventListener("keydown", event => {
    if (document.activeElement && ["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) return;

    const key=event.key;
    if((event.ctrlKey||event.metaKey)&&key==="z"){ event.preventDefault(); applyUndo(); return; }
    if((event.ctrlKey||event.metaKey)&&key==="y"){ event.preventDefault(); applyRedo(); return; }
    if((event.ctrlKey||event.metaKey)&&key==="a"){ event.preventDefault(); ALL_LAYERS.forEach(n => selectedLayers.add(n)); return; }
    if((event.ctrlKey||event.metaKey)&&key==="d"){ event.preventDefault(); selectedLayers.clear(); return; }
    if(key==="1"){ setSelectedLayer("face");       return; }
    if(key==="2"){ setSelectedLayer("board");      return; }
    if(key==="3"){ setSelectedLayer("text");       return; }
    if(key==="4"){ setSelectedLayer("hand_left");  return; }
    if(key==="5"){ setSelectedLayer("hand_right"); return; }

    if(key==="q"||key==="Q"){
        event.preventDefault();
        const base=getSingleLayer()||lastSelectedLayer||layerOrder[0];
        const idx=layerOrder.indexOf(base);
        setSelectedLayer(layerOrder[(idx-1+layerOrder.length)%layerOrder.length]);
        return;
    }
    if(key==="e"||key==="E"){
        event.preventDefault();
        const base=getSingleLayer()||lastSelectedLayer||layerOrder[0];
        const idx=layerOrder.indexOf(base);
        setSelectedLayer(layerOrder[(idx+1)%layerOrder.length]);
        return;
    }

    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(key)){
        event.preventDefault();
        if(!hasSelection()&&lastSelectedLayer) setSelectedLayer(lastSelectedLayer);
        if(!hasSelection()) return;
        if(!nudgeSnapshotTaken){ pushUndo(snapshotConfig()); nudgeSnapshotTaken=true; }
        for (const name of selectedLayers) {
            const target = name==="text" ? config.text : config[name];
            if(key==="ArrowLeft")  target.x-=1;
            if(key==="ArrowRight") target.x+=1;
            if(key==="ArrowUp")    target.y-=1;
            if(key==="ArrowDown")  target.y+=1;
        }
        updateInputs();
    }
});

// ── Brawler loading ───────────────────────────────────────────────────────────

async function loadBrawler(name) {
    setSelectedLayer(null);
    const loaded = await fetch(`./assets/brawlers/${name}/config.json`).then(r=>r.json());

    config = {
        face:       { ...defaultLayerConfig(), ...(loaded.face??{}) },
        board:      { ...defaultLayerConfig(), ...(loaded.board??{}) },
        hand_left:  { ...defaultLayerConfig(), ...(loaded.hand_left??{}) },
        hand_right: { ...defaultLayerConfig(), ...(loaded.hand_right??{}) },
        text:       { x: loaded.text?.x??500, y: loaded.text?.y??500 }
    };

    boardColor=loaded.board?.color??"#ffffff";
    boardColorInput.value=boardColor;
    updateBoardTint();

    textStyle.content  = loaded.text?.content??"";
    textStyle.color    = loaded.text?.color??"#000000";
    textStyle.font     = loaded.text?.font??"Nougat";
    textStyle.size     = loaded.text?.size??72;
    textStyle.rotation = loaded.text?.rotation??0;
    textStyle.opacity  = loaded.text?.opacity??1;
    document.getElementById("text-opacity").value = textStyle.opacity;

    textInput.value=textStyle.content;
    textColor.value=textStyle.color;
    textFont.value=textStyle.font;
    if(!textFont.value) textFont.selectedIndex=0;
    textStyle.font=textFont.value;
    textSize.value=textStyle.size;
    textRotation.value=textStyle.rotation;
    textRotationVal.textContent=`${textStyle.rotation}°`;

    const face=new Image(), hLeft=new Image(), hRight=new Image();
    face.src  =`./assets/brawlers/${name}/face.png`;
    hLeft.src =`./assets/brawlers/${name}/hand_left.png`;
    hRight.src=`./assets/brawlers/${name}/hand_right.png`;

    await Promise.all([
        new Promise(r=>face.onload=r),
        new Promise(r=>hLeft.onload=r),
        new Promise(r=>hRight.onload=r)
    ]);

    images.face=face; images.hand_left=hLeft; images.hand_right=hRight;

    for(const [n,img] of [["face",face],["hand_left",hLeft],["hand_right",hRight],["board",boardImage]]){
        createHitCanvas(n,img);
        contourPaths[n]=generateContour(img);
    }

    updateInputs();
}

async function loadBrawlers() {
    const brawlers=await fetch("./assets/brawlers/index.json").then(r=>r.json());
    for(const b of brawlers){
        const opt=document.createElement("option");
        opt.value=b; opt.textContent=b.charAt(0).toUpperCase()+b.slice(1);
        brawlerSelect.appendChild(opt);
    }
    if(brawlers.length) await loadBrawler(brawlers[0]);
}

brawlerSelect.addEventListener("change",()=>loadBrawler(brawlerSelect.value));

// ── Nougat vector font ────────────────────────────────────────────────────────

const nougat={meta:null,paths:{},ready:false};

async function loadNougat() {
    try {
        nougat.meta=await fetch("./assets/fonts/nougat-paths.json").then(r=>r.json());
        for(const [cp,g] of Object.entries(nougat.meta.glyphs))
            if(g.path) nougat.paths[cp]=new Path2D(g.path);
        nougat.ready=true;
    } catch(e){ console.warn("Nougat failed to load:",e); }
}

function measureNougatText(text,renderSize) {
    if(!nougat.ready) return 0;
    const scale=renderSize/nougat.meta.unitsPerEm;
    let w=0;
    for(const ch of text){ const g=nougat.meta.glyphs[ch.codePointAt(0)]; if(g) w+=g.adv*scale; }
    return w;
}

function drawNougatText(ctx,text,cx,cy,renderSize,color) {
    if(!nougat.ready||!text) return;
    const meta=nougat.meta, scale=renderSize/meta.unitsPerEm;
    const totalW=measureNougatText(text,renderSize);
    const midY=meta.ascender-(meta.ascender-meta.descender)/2;
    let x=cx-totalW/2;
    ctx.save(); ctx.fillStyle=color;
    for(const ch of text){
        const cp=ch.codePointAt(0), g=nougat.meta.glyphs[cp], path=nougat.paths[cp];
        if(!g){ x+=renderSize*.3; continue; }
        ctx.save();
        ctx.translate(x,cy+midY*scale);
        ctx.scale(scale,-scale);
        if(path) ctx.fill(path);
        ctx.restore();
        x+=g.adv*scale;
    }
    ctx.restore();
}

// ── OS font detection ─────────────────────────────────────────────────────────

const CANDIDATE_FONTS = [
    "Agency FB","Algerian","Arial","Arial Black","Arial Narrow","Arial Rounded MT Bold",
    "Arial Unicode MS","Bahnschrift","Baskerville Old Face","Batang","BatangChe",
    "Bell MT","Berlin Sans FB","Berlin Sans FB Demi","Bernard MT Condensed",
    "Blackadder ITC","Bodoni MT","Bodoni MT Black","Bodoni MT Condensed",
    "Bodoni MT Poster Compressed","Book Antiqua","Bookman Old Style","Bookshelf Symbol 7",
    "Bradley Hand ITC","Britannic Bold","Broadway","Brush Script MT","Calibri",
    "Californian FB","Calisto MT","Cambria","Cambria Math","Candara","Castellar",
    "Centaur","Century","Century Gothic","Century Schoolbook","Chiller",
    "Colonna MT","Comic Sans MS","Consolas","Constantia","Cooper Black",
    "Copperplate Gothic Bold","Copperplate Gothic Light","Corbel","Courier New",
    "Curlz MT","Dubai","Ebrima","Edwardian Script ITC","Elephant","Engravers MT",
    "Eras Bold ITC","Eras Demi ITC","Eras Light ITC","Eras Medium ITC",
    "Felix Titling","Footlight MT Light","Forte","Franklin Gothic Book",
    "Franklin Gothic Demi","Franklin Gothic Demi Cond","Franklin Gothic Heavy",
    "Franklin Gothic Medium","Franklin Gothic Medium Cond","Freestyle Script",
    "French Script MT","Gabriola","Gadugi","Garamond","Georgia","Gigi",
    "Gill Sans MT","Gill Sans MT Condensed","Gill Sans MT Ext Condensed Bold",
    "Gill Sans Ultra Bold","Gill Sans Ultra Bold Condensed","Gloucester MT Extra Condensed",
    "Goudy Old Style","Goudy Stout","Haettenschweiler","Harlow Solid Italic","Harrington",
    "High Tower Text","HoloLens MDL2 Assets","Impact","Imprint MT Shadow",
    "Informal Roman","Ink Free","Javanese Text","Jokerman","Juice ITC","Kristen ITC",
    "Kunstler Script","Leelawadee","Leelawadee UI","Leelawadee UI Semilight",
    "Lucida Bright","Lucida Calligraphy","Lucida Console","Lucida Fax",
    "Lucida Handwriting","Lucida Sans","Lucida Sans Typewriter","Lucida Sans Unicode",
    "Magneto","Maiandra GD","Malgun Gothic","Malgun Gothic Semilight","Marlett",
    "Matura MT Script Capitals","Microsoft Himalaya","Microsoft JhengHei",
    "Microsoft JhengHei Light","Microsoft JhengHei UI","Microsoft New Tai Lue",
    "Microsoft PhagsPa","Microsoft Sans Serif","Microsoft Tai Le","Microsoft Uighur",
    "Microsoft YaHei","Microsoft YaHei Light","Microsoft YaHei UI","Microsoft Yi Baiti",
    "MingLiU-ExtB","MingLiU_HKSCS-ExtB","Mistral","Modern No. 20","Mongolian Baiti",
    "Monotype Corsiva","MV Boli","Myanmar Text","Niagara Engraved","Niagara Solid",
    "Nirmala UI","Nirmala UI Semilight","OCR A Extended","Old English Text MT",
    "Onyx","Palatino Linotype","Papyrus","Parchment","Perpetua","Perpetua Titling MT",
    "Playbill","PMingLiU-ExtB","Poor Richard","Pristina","Rage Italic","Ravie",
    "Rockwell","Rockwell Condensed","Rockwell Extra Bold","Script MT Bold",
    "Segoe MDL2 Assets","Segoe Print","Segoe Script","Segoe UI","Segoe UI Black",
    "Segoe UI Emoji","Segoe UI Historic","Segoe UI Light","Segoe UI Semibold",
    "Segoe UI Semilight","Segoe UI Symbol","Showcard Gothic","SimSun","SimSun-ExtB",
    "Sitka Banner","Sitka Display","Sitka Heading","Sitka Small","Sitka Subheading",
    "Sitka Text","Snap ITC","Stencil","Sylfaen","Symbol","Tahoma","Tempus Sans ITC",
    "Times New Roman","Trebuchet MS","Tw Cen MT","Tw Cen MT Condensed",
    "Tw Cen MT Condensed Extra Bold","Verdana","Viner Hand ITC","Vivaldi",
    "Vladimir Script","Webdings","Wide Latin","Wingdings","Wingdings 2","Wingdings 3",
    "American Typewriter","Andale Mono","Apple Chancery","Apple Color Emoji",
    "Apple SD Gothic Neo","AppleGothic","AppleMyungjo","Arial Hebrew","Avenir",
    "Avenir Next","Avenir Next Condensed","Ayuthaya","Baghdad","Bangla MN",
    "Bangla Sangam MN","Baskerville","Beirut","Big Caslon","Bodoni 72",
    "Bodoni 72 Oldstyle","Bodoni 72 Smallcaps","Bodoni Ornaments","Bradley Hand",
    "Chalkboard","Chalkboard SE","Chalkduster","Charter","Cochin","Copperplate",
    "Corsiva Hebrew","Courier","Damascus","DecoType Naskh","Devanagari MT",
    "Didot","Diwan Kufi","Diwan Thuluth","Euphemia UCAS","Farah","Farisi",
    "Futura","Geneva","Georgia","Gill Sans","Gujarati MT","Gulim","GungSeo",
    "Gurmukhi MN","Gurmukhi MT","Heiti SC","Heiti TC","Helvetica","Helvetica Neue",
    "Herculanum","Hiragino Kaku Gothic Pro","Hiragino Kaku Gothic ProN",
    "Hiragino Kaku Gothic Std","Hiragino Kaku Gothic StdN","Hiragino Maru Gothic Pro",
    "Hiragino Maru Gothic ProN","Hiragino Mincho Pro","Hiragino Mincho ProN",
    "Hiragino Sans","Hoefler Text","Impact","InaiMathi","Iowan Old Style",
    "ITF Devanagari","Kailasa","Kannada MN","Kannada Sangam MN","Kefa","Khmer MN",
    "Khmer Sangam MN","Kokonor","Krungthep","KufiStandardGK","Lao MN","Lao Sangam MN",
    "Lucida Grande","Malayalam MN","Malayalam Sangam MN","Marion","Menlo","Mishafi",
    "Monaco","Mshtakan","Muna","Myanmar MN","Myanmar Sangam MN","Nadeem","New Peninim MT",
    "Noteworthy","Noto Nastaliq Urdu","Noto Sans Kannada","Optima","Oriya MN",
    "Oriya Sangam MN","Osaka","Palatino","Papyrus","PCMyungjo","Phosphate","PilGi",
    "Plantagenet Cherokee","PT Mono","PT Sans","PT Sans Caption","PT Sans Narrow",
    "PT Serif","PT Serif Caption","Raanana","Rockwell","Sana","Sathu","Savoye LET",
    "SignPainter","Silom","Sinhala MN","Sinhala Sangam MN","Skia","Snell Roundhand",
    "Songti SC","Songti TC","STFangsong","STHeiti","STIXGeneral","STIXIntegralsD",
    "STIXIntegralsSm","STIXIntegralsUp","STIXIntegralsUpD","STIXIntegralsUpSm",
    "STIXNonUnicode","STIXSizeFiveSym","STIXSizeFourSym","STIXSizeOneSym",
    "STIXSizeThreeSym","STIXSizeTwoSym","STIXVariants","STKaiti","STSong","Sukhumvit Set",
    "SuperClarendon","Tamil MN","Tamil Sangam MN","Telugu MN","Telugu Sangam MN",
    "Thonburi","Times","Trattatello","Trebuchet MS","Verdana","Waseem","Wawati SC",
    "Wawati TC","Weibei SC","Weibei TC","Wingdings","Wingdings 2","Wingdings 3",
    "Xingkai SC","Yuanti SC","YuGothic","YuMincho","Yuppy SC","Yuppy TC","Zapf Dingbats",
    "Zapfino"
];

function detectAvailableFonts() {
    const testStr="mmmmmmmmmmlli", testSize="72px", fbs=["monospace","sans-serif","serif"];
    const c2=document.createElement("canvas"); c2.width=500; c2.height=100;
    const cx2=c2.getContext("2d");
    const base=fbs.map(fb=>{ cx2.font=`${testSize} ${fb}`; return cx2.measureText(testStr).width; });
    const out=[];
    for(const fam of CANDIDATE_FONTS){
        for(let i=0;i<fbs.length;i++){
            cx2.font=`${testSize} "${fam}", ${fbs[i]}`;
            if(cx2.measureText(testStr).width!==base[i]){ out.push(fam); break; }
        }
    }
    return out;
}

function populateOSFonts() {
    for(const fam of detectAvailableFonts()){
        const opt=document.createElement("option");
        opt.value=fam; opt.textContent=fam;
        textFont.appendChild(opt);
    }
}

// ── Layers panel ──────────────────────────────────────────────────────────────

const layersPanel = document.getElementById("layers-panel");
let dragLayerName = null;

function moveLayer(name, dir) {
    // dir: +1 = up (towards top/end of array), -1 = down (towards bottom/start)
    const idx = layerOrder.indexOf(name);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= layerOrder.length) return;
    pushUndo(snapshotConfig());
    [layerOrder[idx], layerOrder[newIdx]] = [layerOrder[newIdx], layerOrder[idx]];
    renderLayersPanel();
}

function renderLayersPanel() {
    layersPanel.innerHTML = "";
    // Display top-to-bottom, i.e. reverse of layerOrder (which is bottom→top)
    const topToBottom = [...layerOrder].reverse();

    topToBottom.forEach(name => {
        const row = document.createElement("div");
        row.className = "layer-row" + (selectedLayers.has(name) ? " selected" : "");
        row.draggable = true;

        // Thumbnail
        const thumb = document.createElement("div");
        thumb.className = "layer-thumb";
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width  = 32;
        thumbCanvas.height = 32;
        const tc = thumbCanvas.getContext("2d");
        const img = name === "board" ? boardTintCanvas : images[name];
        if (name === "text" && textStyle.content) {
            tc.fillStyle = textStyle.color;
            tc.font = `bold 18px sans-serif`;
            tc.textAlign = "center";
            tc.textBaseline = "middle";
            tc.fillText(textStyle.content.charAt(0).toUpperCase(), 16, 16);
        } else if (img) {
            const scale = Math.min(32 / img.width, 32 / img.height);
            const dw = img.width * scale, dh = img.height * scale;
            tc.drawImage(img, (32 - dw) / 2, (32 - dh) / 2, dw, dh);
        }
        thumb.appendChild(thumbCanvas);

        const label = document.createElement("span");
        label.className = "layer-row-name";
        label.textContent = LAYER_LABELS[name];

        const btns = document.createElement("div");
        btns.className = "layer-row-btns";

        const upBtn = document.createElement("button");
        upBtn.textContent = "↑";
        upBtn.title = "Move up";
        upBtn.disabled = layerOrder.indexOf(name) === layerOrder.length - 1;
        upBtn.addEventListener("click", e => { e.stopPropagation(); moveLayer(name, 1); });

        const downBtn = document.createElement("button");
        downBtn.textContent = "↓";
        downBtn.title = "Move down";
        downBtn.disabled = layerOrder.indexOf(name) === 0;
        downBtn.addEventListener("click", e => { e.stopPropagation(); moveLayer(name, -1); });

        btns.appendChild(upBtn);
        btns.appendChild(downBtn);

        row.appendChild(thumb);
        row.appendChild(label);
        row.appendChild(btns);

        // Click row to select (supports ctrl/cmd to toggle group selection, like canvas)
        row.addEventListener("click", e => {
            if (e.ctrlKey || e.metaKey) {
                if (selectedLayers.has(name)) selectedLayers.delete(name);
                else selectedLayers.add(name);
                lastSelectedLayer = name;
            } else {
                setSelectedLayer(name);
            }
            renderLayersPanel();
        });

        // Drag to reorder
        row.addEventListener("dragstart", e => {
            dragLayerName = name;
            row.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
        });
        row.addEventListener("dragend", () => {
            row.classList.remove("dragging");
            dragLayerName = null;
            renderLayersPanel();
        });
        row.addEventListener("dragover", e => {
            e.preventDefault();
            if (!dragLayerName || dragLayerName === name) return;
            const rect = row.getBoundingClientRect();
            const before = (e.clientY - rect.top) < rect.height / 2;
            row.classList.toggle("drag-over-top", before);
            row.classList.toggle("drag-over-bottom", !before);
        });
        row.addEventListener("dragleave", () => {
            row.classList.remove("drag-over-top", "drag-over-bottom");
        });
        row.addEventListener("drop", e => {
            e.preventDefault();
            row.classList.remove("drag-over-top", "drag-over-bottom");
            if (!dragLayerName || dragLayerName === name) return;

            const rect = row.getBoundingClientRect();
            const before = (e.clientY - rect.top) < rect.height / 2;

            // Work in top-to-bottom space, then convert back to layerOrder (bottom→top)
            const ttb = [...layerOrder].reverse();
            const fromIdx = ttb.indexOf(dragLayerName);
            ttb.splice(fromIdx, 1);
            let toIdx = ttb.indexOf(name);
            if (!before) toIdx += 1;
            ttb.splice(toIdx, 0, dragLayerName);

            pushUndo(snapshotConfig());
            layerOrder = [...ttb].reverse();
            renderLayersPanel();
        });

        layersPanel.appendChild(row);
    });
}

let lastSelectedLayersSig = "";
function syncLayersPanelIfNeeded() {
    const sig = [...selectedLayers].sort().join(",") + "|" + layerOrder.join(",");
    if (sig !== lastSelectedLayersSig) {
        lastSelectedLayersSig = sig;
        renderLayersPanel();
        updateRightPanel();
    }
}

// ── Theme toggle ──────────────────────────────────────────────────────────────

const themeToggleBtn = document.getElementById("theme-toggle");
const themePopover   = document.getElementById("theme-popover");

function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const logoCanvas = document.getElementById("topbar-logo");

function drawLogo() {
    if (!nougat.ready) return;
    const text     = "Custom Name Pin";
    const fontSize = 20;
    const w        = Math.ceil(measureNougatText(text, fontSize)) + 4;
    logoCanvas.width = w;
    const lctx = logoCanvas.getContext("2d");
    lctx.clearRect(0, 0, w, 28);
    // Use CSS variable color — read computed style from document
    const color = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#ffffff";
    drawNougatText(lctx, text, w / 2, 14, fontSize, color);
}

function applyTheme(pref) {
    localStorage.setItem("cnp-theme", pref);
    const resolved = pref === "system" ? getSystemTheme() : pref;
    document.documentElement.setAttribute("data-theme", resolved);
    document.querySelectorAll(".theme-opt").forEach(b => {
        b.classList.toggle("active", b.dataset.theme === pref);
    });
    // Redraw logo with updated text color
    setTimeout(drawLogo, 0);
}

themeToggleBtn.addEventListener("click", e => {
    e.stopPropagation();
    themePopover.classList.toggle("open");
});

document.querySelectorAll(".theme-opt").forEach(btn => {
    btn.addEventListener("click", () => {
        applyTheme(btn.dataset.theme);
        themePopover.classList.remove("open");
    });
});

document.addEventListener("click", () => themePopover.classList.remove("open"));

// System theme change listener
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (localStorage.getItem("cnp-theme") === "system") applyTheme("system");
});

applyTheme(localStorage.getItem("cnp-theme") || "dark");

// ── Canvas scaling ─────────────────────────────────────────────────────────────

function scaleCanvas() {
    const area = document.getElementById("canvas-area");
    const pad  = 32;
    const aw   = area.clientWidth  - pad;
    const ah   = area.clientHeight - pad;
    const scale = Math.min(aw / canvas.width, ah / canvas.height, 1);
    canvas.style.width  = Math.round(canvas.width  * scale) + "px";
    canvas.style.height = Math.round(canvas.height * scale) + "px";
}
window.addEventListener("resize", scaleCanvas);
// Called once after boot

// ── Context-sensitive right panel ─────────────────────────────────────────────

function updateRightPanel() {
    const single  = getSingleLayer();
    const noSel   = document.getElementById("no-selection");

    // Hide all layer prop panels
    document.querySelectorAll(".layer-props").forEach(el => el.classList.remove("active"));

    if (single) {
        noSel.style.display = "none";
        const panel = document.getElementById(`props-${single}`);
        if (panel) panel.classList.add("active");
    } else {
        noSel.style.display = "";
    }
    // Background is always visible — no toggling needed
}

// Hook updateRightPanel into syncLayersPanelIfNeeded (already called every frame)
const _origSync = syncLayersPanelIfNeeded;
// Patch: also call updateRightPanel whenever panel re-renders
// We override the signature slightly:

// ── Layer reset ───────────────────────────────────────────────────────────────

document.querySelectorAll(".reset-layer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const name = btn.dataset.layer;
        pushUndo(snapshotConfig());

        if (name === "text") {
            textStyle.content  = "";
            textStyle.color    = "#000000";
            textStyle.font     = "Nougat";
            textStyle.size     = 72;
            textStyle.rotation = 0;
            textStyle.opacity  = 1;
            config.text.x = 500;
            config.text.y = 500;
            textInput.value             = "";
            textColor.value             = "#000000";
            textFont.value              = "Nougat";
            textSize.value              = 72;
            textRotation.value          = 0;
            textRotationVal.textContent = "0°";
            document.getElementById("text-opacity").value = 1;
        } else if (name === "board") {
            config.board = defaultLayerConfig();
            boardColor   = "#ffffff";
            boardColorInput.value = "#ffffff";
            updateBoardTint();
        } else {
            config[name] = defaultLayerConfig();
        }
        updateInputs();
    });
});

// ── Boot ──────────────────────────────────────────────────────────────────────

Promise.all([
    new Promise(r=>boardImage.onload=r),
    new Promise(r=>boardOutlineImage.onload=r),
    loadNougat()
]).then(async ()=>{
    updateBoardTint();
    contourPaths["board"]=generateContour(boardImage);
    createHitCanvas("board",boardImage);
    await loadBrawlers();
    populateOSFonts();
    drawLogo();
    restoreFromHash();
    scaleCanvas();
    updateRightPanel();
});