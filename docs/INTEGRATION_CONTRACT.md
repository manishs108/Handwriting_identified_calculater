# CalcInk Subsystem Integration Contract

## Overview

This document specifies the interface boundary between the **Core Math & Recognition Subsystem** (this implementation) and the **UI & Canvas Subsystem** (teammate's ownership).

The design preserves clear separation of concerns:
* **Core Math & Recognition**: Owns handwriting inference, off-main-thread processing, normalization, AST arithmetic evaluation, and revision safety.
* **UI & Canvas**: Owns canvas rendering, pointer drawing events, toolbar buttons, styling, and visual answer placement.

---

## 1. Calculation Pipeline API

### `calculateRecognizedExpression(recognitionResult)`
* **Module**: `src/math/calculation-pipeline.js`
* **Input**: Recognition output (string or `{ latex, text, expression }`)
* **Output**: Structured calculation result object

```typescript
interface CalculationResponse {
  status: "ready" | "incomplete" | "undefined" | "invalid" | "empty";
  expression: string | null;      // Normalized arithmetic expression without "="
  result: number | null;          // Evaluated numeric value (null if not finite/undefined)
  displayResult: string | null;   // Formatted string to project beside "=" (e.g. "30", "Undefined")
  error: string | null;           // Error description for logging or debugging
}
```

### Status Codes
| Status | Meaning | UI Action |
|---|---|---|
| `"ready"` | Expression successfully evaluated | Render `displayResult` beside "="; add to calculation history |
| `"incomplete"` | Expression written without terminal "=" | Clear / hide calculation result; wait for completion |
| `"undefined"` | Expression divided by zero | Render `"Undefined"` beside "=" |
| `"invalid"` | Syntax error, malformed "=", or unsupported symbols | Clear / hide calculation result; do not crash |
| `"empty"` | No strokes or empty input | Clear / hide calculation result |

---

## 2. Recognition API

### `initializeRecognition()`
* **Module**: `src/recognition/recognition.js`
* Pre-warms the Web Worker and loads ONNX sessions. Idempotent.

### `recognizeStrokes(strokes)`
* **Module**: `src/recognition/recognition.js`
* **Input**: Array of stroke objects (`{ points: [{ x, y, pressure }], width }`).
* **Output**: `Promise<{ latex: string, timing: { encoderMs, decoderMs, totalMs } } | null>`.

### `getRecognitionState()`
* Returns `"idle"` | `"loading"` | `"ready"` | `"error"`.

### `disposeRecognition()`
* Terminates worker and frees ONNX session memory.

---

## 3. Revision Controller API

### `createRevisionController()`
* **Module**: `src/recognition/revision-controller.js`
* Manages request revision IDs to prevent race conditions during asynchronous inference.

```javascript
const controller = createRevisionController();
const revId = controller.next();          // Allocate new revision for in-flight request
controller.isCurrent(revId);              // True if revId matches the latest revision
controller.invalidate();                  // Invalidate all pending requests
```

---

## 4. Canvas Mutation Event Contracts

| User Action | Subsystem Coordination |
|---|---|
| **Pen Stroke Complete** | 1. Commit stroke to `strokesRef`<br>2. Call `processRecognition()` with new revision |
| **Eraser Down** | 1. Invalidate revisions via `controller.invalidate()`<br>2. Immediately clear answer (`setCalculationResult(null)`) |
| **Eraser Up** | 1. Flush erased points<br>2. If strokes remain, call `processRecognition()`<br>3. If canvas is empty, clear answer |
| **Undo / Redo** | 1. Restore strokes state<br>2. Invalidate revisions and clear current answer<br>3. If strokes remain, call `processRecognition()` |
| **Clear Canvas** | 1. Empty `strokesRef`<br>2. Invalidate revisions and clear answer |
