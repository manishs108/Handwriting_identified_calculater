# CalcInk Recognition Pipeline

## Architecture Overview

CalcInk performs 100% on-device, offline handwritten mathematical expression recognition using an INT8-quantized CoMER neural network run through ONNX Runtime Web.

The processing pipeline is organized as follows:

```
Canvas Strokes
      ↓
isStrokeMeaningful() & preprocessStrokes() (Main Thread)
      ↓
ArrayBuffer Transfer (Zero-Copy)
      ↓
Web Worker (`recognition.worker.js`)
      ↓
ONNX Inference Engine (WASM INT8 Encoder + Autoregressive Decoder)
      ↓
Recognized LaTeX / String Output
      ↓
Normalization Layer (`normalizeRecognitionOutput()`)
      ↓
Terminal "=" Trigger Detection
      ↓
Math Engine (Tokenizer → Parser → AST → Evaluator)
      ↓
Structured Result (`ready`, `incomplete`, `undefined`, `invalid`)
      ↓
UI Answer Projection Beside "="
```

---

## Model Specifications & Attribution

* **Model Family**: CoMER (Convolutional attention Model for Handwritten Mathematical Expression Recognition).
* **Integration Layer**: `ink-on` (`ink-on/core`) lightweight browser runtime.
* **Inference Runtime**: ONNX Runtime Web (`onnxruntime-web`) via WebAssembly (`wasm`).
* **Model Assets**:
  * Encoder: `/models/comer/encoder_int8.onnx` (~3.5 MB, INT8 quantized)
  * Decoder: `/models/comer/decoder_int8.onnx` (~4.1 MB, INT8 quantized)
  * Vocabulary: `/models/comer/vocab.json` (~3.7 KB, 238 mathematical tokens)
* **Execution Strategy**: Single initialization; sessions are cached in memory and reused across all recognition queries.
* **Beam Search**: Evaluates top token paths with `beamWidth: 3`.

---

## Web Worker Performance Isolation

Running transformer-based math OCR on the main browser thread causes frame drops during pen interaction. CalcInk solves this by isolating the neural network inference in a dedicated Web Worker:

1. **Lightweight Main-Thread Rasterization**: `preprocessStrokes` quickly converts stroke coordinates into input tensors (`<1ms`).
2. **Transferable Objects**: The underlying `ArrayBuffer` instances of `tensor` and `mask` are transferred into the worker, avoiding redundant memory copies.
3. **Dedicated Compute Worker**: The worker performs encoder forward-passes and multi-step autoregressive beam decoding asynchronously without impacting canvas redraws (preserving fluid 60 FPS drawing).
4. **Lifecycle Management**: The `RecognitionClient` manages request IDs, tracks in-flight promises, and safely disposes of the worker when necessary.

---

## Normalization Layer (`src/math/normalize.js`)

Handwriting OCR models naturally output LaTeX markup or alternative Unicode representations. The normalization layer sanitizes untrusted model output into standard arithmetic syntax:

* **Operator Mappings**:
  * `\times` or `\cdot` → `*`
  * `\div` → `/`
  * `\minus` → `-`
  * `\equals` → `=`
  * Unicode `×` → `*`
  * Unicode `÷` → `/`
  * Unicode dashes (`−`, `–`, `—`) → `-`
* **Formatting Stripping**: Cleans `{`, `}`, `$`, and whitespace.
* **Strict Character Whitelist**: Enforces `/^[0-9+\-*/.()=]+$/`. Any unexpected character (variables, trigonometry, roots) safely fails with a descriptive error.

---

## Revision Safety (`src/recognition/revision-controller.js`)

Because recognition is asynchronous and may take hundreds of milliseconds, rapid user drawing or edits can cause race conditions (e.g., Request 1 finishing *after* Request 2 has completed or after the user erased the canvas).

CalcInk guarantees revision safety:
* Every canvas state mutation (new stroke, eraser gesture, undo, redo, clear) increments the revision counter or invalidates pending revisions.
* When the worker responds with recognition results, `revisionController.isCurrent(revisionId)` is checked.
* Stale responses from earlier canvas states are discarded immediately, preventing outdated results from corrupting the UI.
