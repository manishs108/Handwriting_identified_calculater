import {
  InferenceEngine,
  preprocessStrokes,
  isStrokeMeaningful,
  loadVocab,
} from "ink-on/core";
import * as ort from "onnxruntime-web";

// Use a single WASM thread unless cross-origin isolation explicitly enables
// SharedArrayBuffer; on isolated deployments, cap workers to leave CPU for UI.
const canUseSharedWasmThreads =
  typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
ort.env.wasm.numThreads = canUseSharedWasmThreads
  ? Math.min(2, navigator.hardwareConcurrency || 2)
  : 1;

let engine = null;
let vocab = null;

export async function initializeRecognition() {
  if (engine) {
    return;
  }

  console.log("Loading CalcInk recognition model...");

  vocab = await loadVocab(
    "/models/comer/vocab.json"
  );

  engine = new InferenceEngine({
    encoderUrl:
      "/models/comer/encoder_int8.onnx",

    decoderUrl:
      "/models/comer/decoder_int8.onnx",

    beamWidth: 3,

    executionProvider: "wasm",
  });

  await engine.init();

  console.log(
    "CalcInk recognition model loaded."
  );
}

export async function recognizeStrokes(strokes) {
  if (!engine || !vocab) {
    throw new Error(
      "Recognition engine is not initialized."
    );
  }

  const modelStrokes = strokes.map((stroke) => ({
    points: stroke.points,
    lineWidth: stroke.width,
  }));

  if (!isStrokeMeaningful(modelStrokes)) {
    return null;
  }

  const input = preprocessStrokes(modelStrokes);

  const result = await engine.recognize(
    input,
    vocab,
    "number"
  );

  return result;
}

export function disposeRecognition() {
  if (engine) {
    engine.dispose();
    engine = null;
    vocab = null;
  }
}
