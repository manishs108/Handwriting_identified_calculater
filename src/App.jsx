import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  initializeRecognition,
  recognizeStrokes,
} from "./recognition/recognition";
import { calculateRecognizedExpression } from "./math/calculation-pipeline";
import { createRevisionController } from "./recognition/revision-controller";

function ToolbarIcon({ name }) {
  const paths = {
    pen: <><path d="m4 20 4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /><path d="m14.5 6.5 3 3" /></>,
    fine: <><path d="m7 17 9.8-9.8a2 2 0 0 1 2.8 2.8L9.8 19.8 5 21l2-4Z" /><path d="m15 8 2 2" /><path d="m4 4 2 2" /></>,
    ballpoint: <><path d="m5 17 9-9 4 4-9 9-5 1 1-5Z" /><path d="m14 8 2-2a2.1 2.1 0 0 1 3 3l-2 2" /><path d="m4 21 4-1" /></>,
    marker: <><path d="m6 16 9-9 5 5-9 9H6v-5Z" /><path d="m13 9 5 5" /><path d="M6 16v5" /></>,
    pencil: <><path d="m4 16 11-11 5 5L9 21H4v-5Z" /><path d="m13 7 5 5" /><path d="m4 16 5 5" /><path d="m4 21 3-1" /></>,
    strokeEraser: <><path d="m7 16 8-10a2 2 0 0 1 3-.2l2.2 1.8a2 2 0 0 1 .3 2.8l-8 10.1H9L5.5 18a2 2 0 0 1-.3-2Z" /><path d="m9 20 5-6" /></>,
    partialEraser: <><path d="m6 15 7-9a2 2 0 0 1 3-.3l3 2.3a2 2 0 0 1 .4 2.8L12 20H8l-2-2a2 2 0 0 1 0-3Z" /><path d="m4 21 16-16" /></>,
    undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h9a7 7 0 0 1 7 7v2" /></>,
    redo: <><path d="m15 14 5-5-5-5" /><path d="M20 9h-9a7 7 0 0 0-7 7v2" /></>,
    history: <><path d="M6 4h12a2 2 0 0 1 2 2v14H8a3 3 0 0 1-3-3V6a2 2 0 0 1 1-2Z" /><path d="M5 7H3v10a3 3 0 0 0 3 3h2" /><path d="M10 8h6m-6 4h6m-6 4h4" /></>,
    moon: <path d="M20.5 15.5A8 8 0 0 1 8.5 3.7 8.5 8.5 0 1 0 20.5 15.5Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    zoomIn: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5M10.8 7.8v6m-3-3h6" /></>,
    zoomOut: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5m-13.2-10.2h6" /></>,
  };

  return (
    <svg className={`icon-svg icon-${name}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

function IconButton({ label, icon, onClick, active = false, danger = false }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tapLabel, setTapLabel] = useState(label);
  const tooltipTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(tooltipTimer.current), []);

  function handleClick() {
    onClick();
    setTapLabel(label);
    setTooltipVisible(true);
    window.clearTimeout(tooltipTimer.current);
    tooltipTimer.current = window.setTimeout(() => setTooltipVisible(false), 1400);
  }

  return (
    <span className={`icon-control${tooltipVisible ? " tooltip-visible" : ""}`}>
      <button
        type="button"
        className={`tool-button icon-button${active ? " active" : ""}${danger && active ? " eraser-active" : ""}`}
        onClick={handleClick}
        aria-label={label}
        title={label}
      >
        <ToolbarIcon name={icon} />
      </button>
      <span className="icon-tooltip" role="tooltip">{tooltipVisible ? tapLabel : label}</span>
    </span>
  );
}

function App() {
  useEffect(() => {
  initializeRecognition()
    .then(() => {
      console.log("✅ CalcInk AI model is ready");
    })
    .catch((error) => {
      console.error(
        "❌ Failed to load CalcInk AI model:",
        error
      );
    });
}, []);
  const canvasRef = useRef(null);
  const activeCanvasRef = useRef(null);
  const paperRef = useRef(null);
  const cursorPreviewRef = useRef(null);
  const activeDrawFrameRef = useRef(null);
  const eraseFrameRef = useRef(null);
  const pendingErasePointsRef = useRef([]);
  const longPressTimerRef = useRef(null);

  // All completed handwriting strokes
  const strokesRef = useRef([]);

  // Stroke currently being drawn
  const currentStrokeRef = useRef(null);

  // Undo/redo history
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  const drawingRef = useRef(false);
  const recognitionRevisionRef = useRef(createRevisionController());

  const [brushSize, setBrushSize] = useState(4);
  const [zoom, setZoom] = useState(() => {
    const storedZoom = Number(localStorage.getItem("calcink-canvas-zoom"));
    return Number.isFinite(storedZoom) && storedZoom >= 0.5 && storedZoom <= 2
      ? storedZoom
      : 1;
  });
  const [tool, setTool] = useState("pen");

  const [calculationResult, setCalculationResult] =
  useState(null);
  const [calculationHistory, setCalculationHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("calcink-calculation-history") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [penColor, setPenColor] = useState("#111827");
  const [penHue, setPenHue] = useState(220);

  const [penStyle, setPenStyle] =
  useState("fine");

  const [themeLevel, setThemeLevel] = useState(() => {
    const savedLevel = localStorage.getItem("calcink-theme-level");
    if (savedLevel !== null) {
      const parsedLevel = Number(savedLevel);
      return Number.isFinite(parsedLevel) ? Math.max(0, Math.min(100, parsedLevel)) : 0;
    }
    return localStorage.getItem("calcink-theme") === "dark" ? 100 : 0;
  });
  const theme = themeLevel >= 50 ? "dark" : "light";
  const [pageStyle, setPageStyle] = useState(
  localStorage.getItem("calcink-page-style") || "blank"
);

  const [resultPosition, setResultPosition] = useState({
  left: 0,
  top: 0,
  fontSize: 20,
});

  useEffect(() => {
    localStorage.setItem(
      "calcink-calculation-history",
      JSON.stringify(calculationHistory)
    );
  }, [calculationHistory]);

  function deleteCalculation(id) {
    setCalculationHistory((history) =>
      history.filter((entry) => entry.id !== id)
    );
  }

  function clearCalculationHistory() {
    setCalculationHistory([]);
    setHistoryOpen(false);
  }
  function changeThemeLevel(value) {
    const nextLevel = Number(value);
    setThemeLevel(nextLevel);
    localStorage.setItem("calcink-theme-level", String(nextLevel));
    localStorage.setItem("calcink-theme", nextLevel >= 50 ? "dark" : "light");
    requestAnimationFrame(redrawCanvas);
  }

  function changeZoom(amount) {
    setZoom((currentZoom) => {
      const nextZoom = Math.max(0.5, Math.min(2, Math.round((currentZoom + amount) * 10) / 10));
      localStorage.setItem("calcink-canvas-zoom", String(nextZoom));
      return nextZoom;
    });
  }
  /*
   * ----------------------------------------------------
   * CANVAS SETUP
   * ----------------------------------------------------
   */

  function setupCanvas() {
    const canvas = canvasRef.current;
    const activeCanvas = activeCanvasRef.current;

    if (!canvas || !activeCanvas) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    activeCanvas.width = canvas.width;
    activeCanvas.height = canvas.height;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const activeCtx = activeCanvas.getContext("2d");
    if (activeCtx) {
      activeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      activeCtx.lineCap = "round";
      activeCtx.lineJoin = "round";
    }

    redrawCanvas();
    if (currentStrokeRef.current) scheduleActiveStrokeRedraw();
  }

  /*
   * ----------------------------------------------------
   * DRAW ONE STROKE
   * ----------------------------------------------------
   */

  function drawStroke(ctx, stroke) {
    if (!stroke || stroke.points.length === 0) {
      return;
    }

    const points = stroke.points;

    ctx.beginPath();

    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = stroke.color || penColor;

    ctx.globalAlpha =
      stroke.opacity ?? 1;

    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      ctx.lineTo(
        points[0].x + 0.01,
        points[0].y + 0.01
      );
    } else {
      for (let i = 1; i < points.length; i++) {
        const previous = points[i - 1];
        const current = points[i];

        const midX =
          (previous.x + current.x) / 2;

        const midY =
          (previous.y + current.y) / 2;

        ctx.quadraticCurveTo(
          previous.x,
          previous.y,
          midX,
          midY
        );
      }

      const last = points[points.length - 1];

      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /*
   * ----------------------------------------------------
   * REDRAW ENTIRE DOCUMENT
   * ----------------------------------------------------
   */

  function redrawCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(
      0,
      0,
      canvas.clientWidth,
      canvas.clientHeight
    );

    // Draw completed strokes
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }

    clearActiveStrokeCanvas();
  }

  function clearActiveStrokeCanvas() {
    const canvas = activeCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  function scheduleActiveStrokeRedraw() {
    if (activeDrawFrameRef.current !== null) return;
    activeDrawFrameRef.current = requestAnimationFrame(() => {
      activeDrawFrameRef.current = null;
      clearActiveStrokeCanvas();
      const canvas = activeCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && currentStrokeRef.current) {
        drawStroke(ctx, currentStrokeRef.current);
      }
    });
  }

  function commitActiveStroke(stroke) {
    const baseCanvas = canvasRef.current;
    const activeCanvas = activeCanvasRef.current;
    const baseCtx = baseCanvas?.getContext("2d");
    const activeCtx = activeCanvas?.getContext("2d");
    if (!baseCanvas || !activeCanvas || !baseCtx || !activeCtx) return;

    clearActiveStrokeCanvas();
    const dpr = window.devicePixelRatio || 1;
    activeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStroke(activeCtx, stroke);

    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseCtx.drawImage(
      activeCanvas,
      0,
      0,
      baseCanvas.clientWidth,
      baseCanvas.clientHeight
    );
    clearActiveStrokeCanvas();
  }

  function updateCursorPreview(event) {
    const cursor = cursorPreviewRef.current;
    const paper = paperRef.current;
    if (!cursor || !paper) return;
    const canvasRect = activeCanvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    cursor.style.left = `${event.clientX - paper.getBoundingClientRect().left + paper.scrollLeft}px`;
    cursor.style.top = `${event.clientY - paper.getBoundingClientRect().top + paper.scrollTop}px`;
    cursor.style.visibility = "visible";
  }

  function hideCursorPreview() {
    if (cursorPreviewRef.current) {
      cursorPreviewRef.current.style.visibility = "hidden";
    }
  }

  function getPenWidth(size, style) {
    if (style === "ballpoint") return Math.max(2, size * 0.8);
    if (style === "marker") return size * 1.8;
    if (style === "pencil") return Math.max(1, size * 0.7);
    return size;
  }

  function increasePenSizeForLongPress() {
    const nextSize = Math.min(12, brushSize + 2);
    if (nextSize === brushSize) return;

    setBrushSize(nextSize);
    const stroke = currentStrokeRef.current;
    if (!stroke) return;

    stroke.width = getPenWidth(nextSize, penStyle);
    stroke.boundingBox = calculateBoundingBox(stroke.points, stroke.width);
    scheduleActiveStrokeRedraw();
  }

  /*
   * ----------------------------------------------------
   * CONVERT POINTER COORDINATES
   * ----------------------------------------------------
   */

  function getPoint(event) {
    const canvas = canvasRef.current;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
      pressure:
        event.pressure && event.pressure > 0
          ? event.pressure
          : 0.5,
    };
  }

  function calculateBoundingBox(points, strokeWidth = 0) {
  if (!points || points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  // Include the visible thickness of the pen.
  const padding = strokeWidth / 2;

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
  /*
   * ----------------------------------------------------
   * SAVE STATE FOR UNDO
   * ----------------------------------------------------
   */

  function saveHistory() {
    const snapshot =
      structuredClone(strokesRef.current);

    undoStackRef.current.push(snapshot);

    // Once a new action happens,
    // the redo history is no longer valid.
    redoStackRef.current = [];
  }

  /*
   * ----------------------------------------------------
   * UNDO
   * ----------------------------------------------------
   */

  function undo() {
    if (undoStackRef.current.length === 0) {
      return;
    }

    const current =
      structuredClone(strokesRef.current);

    redoStackRef.current.push(current);

    const previous =
      undoStackRef.current.pop();

    strokesRef.current =
      previous || [];

    redrawCanvas();
    recognitionRevisionRef.current.invalidate();
    setCalculationResult(null);
    if (strokesRef.current.length > 0) {
      processRecognition();
    }
  }

  /*
   * ----------------------------------------------------
   * REDO
   * ----------------------------------------------------
   */

  function redo() {
    if (redoStackRef.current.length === 0) {
      return;
    }

    const current =
      structuredClone(strokesRef.current);

    undoStackRef.current.push(current);

    const next =
      redoStackRef.current.pop();

    strokesRef.current =
      next || [];

    redrawCanvas();
    recognitionRevisionRef.current.invalidate();
    setCalculationResult(null);
    if (strokesRef.current.length > 0) {
      processRecognition();
    }
  }

  /*
   * ----------------------------------------------------
   * DISTANCE BETWEEN POINTS
   * ----------------------------------------------------
   */

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(
      dx * dx + dy * dy
    );
  }

  /*
   * ----------------------------------------------------
   * STROKE ERASER
   * ----------------------------------------------------
   */

  function eraseAtPoint(point, shouldRedraw = true) {
    const eraserRadius =
      Math.max(12, brushSize * 3);

    let changed = false;

    const remaining = [];
    for (const stroke of strokesRef.current) {
      const radius = eraserRadius + stroke.width / 2;
      const points = stroke.points;
      const bounds = stroke.boundingBox;
      if (bounds && (
        point.x < bounds.minX - eraserRadius ||
        point.x > bounds.maxX + eraserRadius ||
        point.y < bounds.minY - eraserRadius ||
        point.y > bounds.maxY + eraserRadius
      )) {
        remaining.push(stroke);
        continue;
      }
      const fragments = [];
      let fragment = [];
      let strokeChanged = false;
      const samplePoint = (sample) => {
        if (distance(sample, point) <= radius) {
          if (fragment.length) fragments.push(fragment);
          fragment = [];
          strokeChanged = true;
        } else {
          fragment.push(sample);
        }
      };

      if (points.length === 1) {
        samplePoint(points[0]);
      } else {
        for (let i = 1; i < points.length; i++) {
          const start = points[i - 1];
          const end = points[i];
          const steps = Math.max(1, Math.ceil(distance(start, end) / 3));
          for (let step = i === 1 ? 0 : 1; step <= steps; step++) {
            const t = step / steps;
            samplePoint({
              x: start.x + (end.x - start.x) * t,
              y: start.y + (end.y - start.y) * t,
              pressure: (start.pressure ?? 0.5) + ((end.pressure ?? 0.5) - (start.pressure ?? 0.5)) * t,
            });
          }
        }
      }
      if (fragment.length) fragments.push(fragment);

      if (!strokeChanged) {
        remaining.push(stroke);
      } else {
        changed = true;
        for (const fragmentPoints of fragments) {
          remaining.push({
  ...stroke,
  id: crypto.randomUUID(),
  points: fragmentPoints,
  boundingBox: calculateBoundingBox(
    fragmentPoints,
    stroke.width
  ),
});
        }
      }
    }

    if (changed) {
      strokesRef.current = remaining;
      if (shouldRedraw) redrawCanvas();
    }
    return changed;
  }

  function eraseStrokeAtPoint(point, shouldRedraw = true) {
    const eraserRadius = Math.max(12, brushSize * 3);
    let changed = false;
    const remaining = strokesRef.current.filter((stroke) => {
      const points = stroke.points;
      const radius = eraserRadius + stroke.width / 2;
      const bounds = stroke.boundingBox;
      if (bounds && (
        point.x < bounds.minX - radius ||
        point.x > bounds.maxX + radius ||
        point.y < bounds.minY - radius ||
        point.y > bounds.maxY + radius
      )) return true;
      let hit = points.some((strokePoint) => distance(strokePoint, point) <= radius);
      for (let i = 1; !hit && i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        const steps = Math.max(1, Math.ceil(distance(start, end) / 3));
        for (let step = 1; step < steps; step++) {
          const sample = {
            x: start.x + (end.x - start.x) * step / steps,
            y: start.y + (end.y - start.y) * step / steps,
          };
          if (distance(sample, point) <= radius) {
            hit = true;
            break;
          }
        }
      }
      if (hit) changed = true;
      return !hit;
    });

    if (changed) {
      strokesRef.current = remaining;
      if (shouldRedraw) redrawCanvas();
    }
    return changed;
  }

  function flushPendingErasePoints() {
    if (eraseFrameRef.current !== null) {
      cancelAnimationFrame(eraseFrameRef.current);
      eraseFrameRef.current = null;
    }
    const points = pendingErasePointsRef.current.splice(0);
    let changed = false;
    for (const point of points) {
      changed = (tool === "stroke-eraser"
        ? eraseStrokeAtPoint(point, false)
        : eraseAtPoint(point, false)) || changed;
    }
    if (changed) redrawCanvas();
  }

  function scheduleErasePoint(point) {
    pendingErasePointsRef.current.push(point);
    if (eraseFrameRef.current !== null) return;
    eraseFrameRef.current = requestAnimationFrame(flushPendingErasePoints);
  }

  /*
   * ----------------------------------------------------
   * POINTER DOWN
   * ----------------------------------------------------
   */

  function handlePointerDown(event) {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const canvas = activeCanvasRef.current;

    if (!canvas) return;

    canvas.setPointerCapture(
      event.pointerId
    );

    const point = getPoint(event);
    updateCursorPreview(event);

    /*
     * ERASER MODE
     */

    if (tool === "eraser" || tool === "stroke-eraser") {
      saveHistory();
      recognitionRevisionRef.current.invalidate();
      setCalculationResult(null);

      if (tool === "stroke-eraser") eraseStrokeAtPoint(point);
      else eraseAtPoint(point);

      drawingRef.current = true;

      return;
    }

    if (event.pointerType === "pen") {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = window.setTimeout(
        increasePenSizeForLongPress,
        550
      );
    }

    /*
     * PEN MODE
     */

    saveHistory();

    drawingRef.current = true;

    const actualWidth = getPenWidth(brushSize, penStyle);
    const opacity = {
      fine: 1,
      ballpoint: 0.9,
      marker: 0.85,
      pencil: 0.65,
    }[penStyle] ?? 1;

currentStrokeRef.current = {
  id: crypto.randomUUID(),

  points: [point],

  width: actualWidth,

  color: penColor,

  opacity: opacity,

  boundingBox: calculateBoundingBox(
    [point],
    actualWidth
  ),

  createdAt: Date.now(),
};

    scheduleActiveStrokeRedraw();
  }

  /*
   * ----------------------------------------------------
   * POINTER MOVE
   * ----------------------------------------------------
   */

  function handlePointerMove(event) {
    updateCursorPreview(event);

    if (!drawingRef.current) {
      return;
    }

    const point = getPoint(event);

    /*
     * ERASER
     */

    if (tool === "eraser" || tool === "stroke-eraser") {
      scheduleErasePoint(point);
      return;
    }

    /*
     * PEN
     */

    if (!currentStrokeRef.current) {
      return;
    }

    currentStrokeRef.current.points.push(
  point
);

const box = currentStrokeRef.current.boundingBox;
const padding = currentStrokeRef.current.width / 2;
box.minX = Math.min(box.minX, point.x - padding);
box.minY = Math.min(box.minY, point.y - padding);
box.maxX = Math.max(box.maxX, point.x + padding);
box.maxY = Math.max(box.maxY, point.y + padding);
box.width = box.maxX - box.minX;
box.height = box.maxY - box.minY;

scheduleActiveStrokeRedraw();
  }

  /*
   * ----------------------------------------------------
   * POINTER UP
   * ----------------------------------------------------
   */
  function calculateResultPosition(strokes, result) {
  const canvas = canvasRef.current;

  if (!canvas || !strokes || strokes.length === 0) {
    return {
      left: 0,
      top: 0,
      fontSize: 20,
    };
  }

  /*
   * ----------------------------------------------------
   * FIND THE "=" SIGN
   * ----------------------------------------------------
   */

  const equalsStrokes = strokes.slice(-2);

  const equalsPoints = equalsStrokes.flatMap(
    (stroke) => stroke.points
  );

  if (equalsPoints.length === 0) {
    return {
      left: 0,
      top: 0,
      fontSize: 20,
    };
  }

  const equalsBox = calculateBoundingBox(
    equalsPoints,
    Math.max(
      ...equalsStrokes.map(
        (stroke) => stroke.width
      )
    )
  );


  /*
   * ----------------------------------------------------
   * ESTIMATE HANDWRITING HEIGHT
   * ----------------------------------------------------
   */

  // Exclude the "=" sign when measuring handwriting height.
// The last two strokes are the two horizontal lines of "=".
const inputStrokes = strokes.slice(0, -2);

const inputPoints = inputStrokes.flatMap(
  (stroke) => stroke.points
);

const handwritingBox =
  calculateBoundingBox(
    inputPoints,
    Math.max(
      ...inputStrokes.map(
        (stroke) => stroke.width
      )
    )
  );

const handwritingHeight =
  handwritingBox.height;

  /*
   * ----------------------------------------------------
   * BASE FONT SIZE
   *
   * Keep answer approximately the same height
   * as handwritten numbers.
   * ----------------------------------------------------
   */

  let fontSize = handwritingHeight * 0.80;


  /*
   * ----------------------------------------------------
   * AVAILABLE WIDTH
   * ----------------------------------------------------
   */

  const rightPadding = 20;

// Dynamic gap between "=" and the answer
const gapAfterEquals = Math.max(
  20,
  fontSize * 0.45
);

const answerLeft =
  equalsBox.maxX + gapAfterEquals;

  const availableWidth =
    canvas.clientWidth -
    answerLeft -
    rightPadding;


  /*
   * ----------------------------------------------------
   * ESTIMATE RESULT WIDTH
   * ----------------------------------------------------
   */

  const resultText =
    String(result);

  /*
   * Approximate width of normal browser text.
   * This is deliberately conservative so the
   * answer stays inside the canvas.
   */

  const estimatedCharacterWidth =
    fontSize * 0.58;

  const estimatedWidth =
    resultText.length *
    estimatedCharacterWidth;


  /*
   * ----------------------------------------------------
   * SHRINK RESULT IF IT IS TOO WIDE
   * ----------------------------------------------------
   */

  if (
    estimatedWidth > availableWidth &&
    availableWidth > 0
  ) {
    fontSize =
      fontSize *
      (availableWidth / estimatedWidth);
  }


  /*
   * Never make the answer too tiny.
   */

  fontSize = Math.max(12, fontSize);


  /*
   * ----------------------------------------------------
   * FINAL SAFETY CHECK
   * ----------------------------------------------------
   */

  const finalEstimatedWidth =
    resultText.length *
    fontSize *
    0.58;

  let finalLeft = answerLeft;

  /*
   * If something still exceeds the canvas,
   * move it slightly left.
   */

  if (
    finalLeft + finalEstimatedWidth >
    canvas.clientWidth - rightPadding
  ) {
    finalLeft =
      Math.max(
        10,
        canvas.clientWidth -
          rightPadding -
          finalEstimatedWidth
      );
  }


  /*
   * ----------------------------------------------------
   * VERTICAL ALIGNMENT
   * ----------------------------------------------------
   */

  /*
 * ----------------------------------------------------
 * VERTICAL ALIGNMENT
 * ----------------------------------------------------
 * Center the answer vertically with the "=" sign.
 */

/*
 * ----------------------------------------------------
 * VERTICAL ALIGNMENT
 * ----------------------------------------------------
 * Align the VISUAL center of the answer
 * with the center of the handwritten "=".
 */

const equalsCenterY =
  equalsBox.minY + equalsBox.height / 2;

// Browser text has internal font padding.
// Move the text slightly downward so that
// the visible digit is centered with "=".
const opticalOffset =
  fontSize * 0.30;

let top =
  equalsCenterY -
  fontSize / 2 +
  opticalOffset;

top =
  Math.max(
    10,
    Math.min(
      canvas.clientHeight - fontSize - 10,
      top
    )
  );


  return {
    left: finalLeft,
    top,
    fontSize,
  };
}
  function processRecognition() {
    const currentStrokes = strokesRef.current;
    if (!currentStrokes || currentStrokes.length === 0) {
      recognitionRevisionRef.current.invalidate();
      setCalculationResult(null);
      return;
    }

    const revisionId = recognitionRevisionRef.current.next();

    recognizeStrokes(currentStrokes)
      .then((result) => {
        // Ignore an older recognition result if user modified the canvas
        if (!recognitionRevisionRef.current.isCurrent(revisionId)) {
          console.log(
            "⏭️ Ignoring stale recognition result for revision",
            revisionId
          );
          return;
        }

        console.log("🤖 AI recognition result:", result);

        if (!result) {
          setCalculationResult(null);
          return;
        }

        const calculation = calculateRecognizedExpression(result);
        console.log("🧮 Calculation result:", calculation);

        if (calculation.status === "ready") {
          setCalculationResult(calculation.displayResult);

          const position = calculateResultPosition(
            strokesRef.current,
            calculation.displayResult
          );
          setResultPosition(position);

          setCalculationHistory((history) => [
            {
              id: crypto.randomUUID(),
              expression: calculation.expression,
              result: calculation.displayResult,
              createdAt: Date.now(),
            },
            ...history,
          ]);
        } else if (calculation.status === "undefined") {
          setCalculationResult("Undefined");

          const position = calculateResultPosition(
            strokesRef.current,
            "Undefined"
          );
          setResultPosition(position);
        } else {
          // "incomplete", "invalid", or "empty"
          setCalculationResult(null);
        }
      })
      .catch((error) => {
        console.error("❌ AI recognition failed:", error);
        if (recognitionRevisionRef.current.isCurrent(revisionId)) {
          setCalculationResult(null);
        }
      });
  }

  function handlePointerUp(event) {
    if (!drawingRef.current) {
      return;
    }

    window.clearTimeout(longPressTimerRef.current);

    if (tool === "eraser" || tool === "stroke-eraser") {
      flushPendingErasePoints();
      if (strokesRef.current.length > 0) {
        processRecognition();
      } else {
        recognitionRevisionRef.current.invalidate();
        setCalculationResult(null);
      }
    }

    if (activeDrawFrameRef.current !== null) {
      cancelAnimationFrame(activeDrawFrameRef.current);
      activeDrawFrameRef.current = null;
    }

    const canvas = activeCanvasRef.current;

    if (canvas) {
      try {
        canvas.releasePointerCapture(
          event.pointerId
        );
      } catch {
        // Pointer capture may already be released.
      }
    }

    /*
     * Finish pen stroke
     */

    if (
      tool === "pen" &&
      currentStrokeRef.current
    ) {
      const stroke = currentStrokeRef.current;

      stroke.boundingBox =
        calculateBoundingBox(
          stroke.points,
          stroke.width
        );

      strokesRef.current.push(stroke);
      commitActiveStroke(stroke);
      currentStrokeRef.current = null;
      processRecognition();
    }

    drawingRef.current = false;
  }

  /*
   * ----------------------------------------------------
   * CLEAR
   * ----------------------------------------------------
   */

  function clearCanvas() {
    if (strokesRef.current.length === 0) {
      recognitionRevisionRef.current.invalidate();
      setCalculationResult(null);
      return;
    }

    saveHistory();

    strokesRef.current = [];

    // Clear the displayed calculation result and invalidate revisions
    recognitionRevisionRef.current.invalidate();
    setCalculationResult(null);

    redrawCanvas();
  }

  /*
   * ----------------------------------------------------
   * WINDOW RESIZE
   * ----------------------------------------------------
   */

  useEffect(() => {
    setupCanvas();

    window.addEventListener(
      "resize",
      setupCanvas
    );

    return () => {
      window.removeEventListener(
        "resize",
        setupCanvas
      );
      if (activeDrawFrameRef.current !== null) {
        cancelAnimationFrame(activeDrawFrameRef.current);
      }
      if (eraseFrameRef.current !== null) {
        cancelAnimationFrame(eraseFrameRef.current);
      }
    };
  }, []);

  /*
   * ----------------------------------------------------
   * KEYBOARD SHORTCUTS
   * ----------------------------------------------------
   */

  useEffect(() => {
    function handleKeyboard(event) {
      /*
       * Ctrl + Z
       */

      if (
        event.ctrlKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        undo();
      }

      /*
       * Ctrl + Y
       */

      if (
        event.ctrlKey &&
        event.key.toLowerCase() === "y"
      ) {
        event.preventDefault();
        redo();
      }

      /*
       * Ctrl + Shift + Z
       */

      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  });

  return (
  <div className={`app ${theme}-theme`} style={{ "--theme-darkness": `${themeLevel}%` }}>

      {/* -----------------------------------------
          TOOLBAR
      ------------------------------------------ */}

      <header className="toolbar">

        <div className="brand">
          <h1>CalcInk</h1>

          <p>
            On-device handwritten math calculator
          </p>
        </div>

        <div className="controls">


          {/* UNDO */}
          <IconButton label="Undo" icon="undo" onClick={undo} />

          {/* REDO */}
          <IconButton label="Redo" icon="redo" onClick={redo} />
          <label className="theme-gradient-control" title="Choose a theme between light and dark">
            <ToolbarIcon name="sun" />
            <input
              type="range"
              min="0"
              max="100"
              value={themeLevel}
              onChange={(event) => changeThemeLevel(event.target.value)}
              aria-label={`Theme brightness: ${themeLevel}%`}
            />
            <ToolbarIcon name="moon" />
          </label>
<select
  className="page-style-select"
  value={pageStyle}
  onChange={(event) => {
    const style = event.target.value;
    setPageStyle(style);

    localStorage.setItem(
      "calcink-page-style",
      style
    );
  }}
>
  <option value="blank">📄 Blank</option>
  <option value="ruled">📖 Ruled</option>
  <option value="grid">▦ Grid</option>
  <option value="graph">📐 Graph</option>
  <option value="dots">⠿ Dot Grid</option>
  <option value="engineering">▦ Engineering</option>
</select>

          {/* BRUSH SIZE */}

          <label className="brush-control">
            <span>
              Brush {brushSize}px
            </span>

            <input
              type="range"
              min="1"
              max="12"
              value={brushSize}
              onChange={(event) =>
                setBrushSize(
                  Number(event.target.value)
                )
              }
            />
          </label>

          {/* CLEAR */}

          <button
            className="clear-button"
            onClick={clearCanvas}
          >
            🗑 Clear
          </button>

        </div>

        {calculationHistory.length > 0 && (
          <button
            className="history-trigger"
            onClick={() => setHistoryOpen(true)}
            aria-expanded={historyOpen}
            aria-controls="calculation-history"
          >
            <ToolbarIcon name="history" />
            <span>History</span>
            <span className="history-count">{calculationHistory.length}</span>
          </button>
        )}

      </header>

      {historyOpen && (
        <div className="history-backdrop" onClick={() => setHistoryOpen(false)}>
          <aside
            id="calculation-history"
            className="history-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-header">
              <div>
                <h2 id="history-title">Calculation history</h2>
                <p>Your recent answers are saved on this device.</p>
              </div>
              <button
                className="history-close"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history"
              >
                Close
              </button>
            </div>

            <div className="history-actions">
              <span>{calculationHistory.length} {calculationHistory.length === 1 ? "calculation" : "calculations"}</span>
              <button
                className="history-clear"
                onClick={clearCalculationHistory}
                disabled={calculationHistory.length === 0}
              >
                Clear history
              </button>
            </div>

            {calculationHistory.length === 0 ? (
              <div className="history-empty">
                <span className="history-empty-icon" aria-hidden="true">Math</span>
                <strong>No calculations yet</strong>
                <p>Write an equation and solve it to see it here.</p>
              </div>
            ) : (
              <ul className="history-list">
                {calculationHistory.map((entry) => (
                  <li className="history-entry" key={entry.id}>
                    <div className="history-entry-content">
                      <span className="history-expression">{entry.expression}</span>
                      <strong className="history-result">= {entry.result}</strong>
                      <time dateTime={new Date(entry.createdAt).toISOString()}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <button
                      className="history-delete"
                      onClick={() => deleteCalculation(entry.id)}
                      aria-label={`Delete ${entry.expression} equals ${entry.result}`}
                      title="Delete calculation"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}

      <div className="workspace">
        <aside className="drawing-tools" aria-label="Drawing tools">
          <span className="drawing-tools-label">TOOLS</span>
          <IconButton label="Pen tool" icon="pen" active={tool === "pen"} onClick={() => setTool("pen")} />

          <div className="pen-style-tools" role="group" aria-label="Pen style">
            <IconButton label="Fine pen" icon="fine" active={penStyle === "fine"} onClick={() => { setPenStyle("fine"); setTool("pen"); }} />
            <IconButton label="Ballpoint pen" icon="ballpoint" active={penStyle === "ballpoint"} onClick={() => { setPenStyle("ballpoint"); setTool("pen"); }} />
            <IconButton label="Marker pen" icon="marker" active={penStyle === "marker"} onClick={() => { setPenStyle("marker"); setTool("pen"); }} />
            <IconButton label="Pencil" icon="pencil" active={penStyle === "pencil"} onClick={() => { setPenStyle("pencil"); setTool("pen"); }} />
          </div>

          <div className="pen-colors" role="group" aria-label="Pen color">
            {[
              { color: "#111827", name: "Black" },
              { color: "#64748b", name: "Slate" },
              { color: "#ffffff", name: "White" },
              { color: "#7f1d1d", name: "Dark red" },
              { color: "#dc2626", name: "Red" },
              { color: "#fb7185", name: "Rose" },
              { color: "#f97316", name: "Orange" },
              { color: "#f59e0b", name: "Amber" },
              { color: "#eab308", name: "Yellow" },
              { color: "#84cc16", name: "Lime" },
              { color: "#16a34a", name: "Green" },
              { color: "#14b8a6", name: "Teal" },
              { color: "#06b6d4", name: "Cyan" },
              { color: "#38bdf8", name: "Sky blue" },
              { color: "#2563eb", name: "Blue" },
              { color: "#4f46e5", name: "Indigo" },
              { color: "#7c3aed", name: "Violet" },
              { color: "#9333ea", name: "Purple" },
              { color: "#d946ef", name: "Magenta" },
              { color: "#ec4899", name: "Pink" },
            ].map(({ color, name }) => (
              <button
                key={color}
                className={`color-dot ${penColor === color ? "selected" : ""}`}
                style={{ background: color, ...(color === "#ffffff" ? { border: "1px solid #94a3b8" } : {}) }}
                onClick={() => setPenColor(color)}
                title={name}
                aria-label={`${name} ink`}
                aria-pressed={penColor === color}
              />
            ))}
          </div>

          <label className="pen-hue-control">
            <span>Color gradient</span>
            <input
              type="range"
              min="0"
              max="359"
              value={penHue}
              style={{ "--pen-hue": penHue }}
              aria-label="Choose pen color from gradient"
              onChange={(event) => {
                const hue = Number(event.target.value);
                setPenHue(hue);
                setPenColor(`hsl(${hue}, 85%, 48%)`);
              }}
            />
          </label>

          <span className="drawing-tools-divider" />
          <IconButton label="Stroke eraser" icon="strokeEraser" active={tool === "stroke-eraser"} danger onClick={() => setTool("stroke-eraser")} />
          <IconButton label="Partial eraser" icon="partialEraser" active={tool === "eraser"} danger onClick={() => setTool("eraser")} />
        </aside>

        {/* DIGITAL PAPER */}

      <main ref={paperRef} className={`paper page-${pageStyle}`}>
        <div className="canvas-zoom-controls" role="group" aria-label="Canvas zoom">
          <button type="button" onClick={() => changeZoom(-0.1)} disabled={zoom <= 0.5} aria-label="Zoom out" title="Zoom out">
            <ToolbarIcon name="zoomOut" />
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => changeZoom(0.1)} disabled={zoom >= 2} aria-label="Zoom in" title="Zoom in">
            <ToolbarIcon name="zoomIn" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          style={{ transform: `scale(${zoom})` }}
          aria-hidden="true"
        />
        <canvas
          ref={activeCanvasRef}
          className={`drawing-canvas active-stroke-canvas canvas-${tool}`}
          style={{ transform: `scale(${zoom})` }}
          onPointerDown={
            handlePointerDown
          }

          onPointerMove={
            handlePointerMove
          }

          onPointerUp={
            handlePointerUp
          }

          onPointerCancel={
            handlePointerUp
          }

          onPointerLeave={hideCursorPreview}

          onLostPointerCapture={() => {
            drawingRef.current = false;
            window.clearTimeout(longPressTimerRef.current);
          }}
        />
        {tool === "pen" && (
          <span
            ref={cursorPreviewRef}
            className={`pen-cursor pen-cursor-${penStyle}`}
            style={{
              left: 0,
              top: 0,
              "--cursor-color": penColor,
              visibility: "hidden",
            }}
            aria-hidden="true"
          />
        )}
        {(tool === "eraser" || tool === "stroke-eraser") && (
          <span
            ref={cursorPreviewRef}
            className={`eraser-cursor ${tool === "eraser" ? "eraser-cursor-partial" : "eraser-cursor-stroke"}`}
            style={{
              left: 0,
              top: 0,
              width: Math.max(12, brushSize * 3) * 2 * zoom,
              height: Math.max(12, brushSize * 3) * 2 * zoom,
              visibility: "hidden",
            }}
            aria-hidden="true"
          />
        )}
        {calculationResult !== null && (
  <div
    className="calculation-result"
    style={{
      left: `${20 + resultPosition.left * zoom}px`,
      top: `${20 + resultPosition.top * zoom}px`,
      fontSize: `${resultPosition.fontSize * zoom}px`,
    }}
  >
    {calculationResult}
  </div>
)}

      </main>
      </div>

    </div>
  );
}

export default App;
