import { isStrokeMeaningful, preprocessStrokes } from "ink-on/core";
import { RecognitionClient } from "./recognition-client.js";

let client = null;
let initialization = null;
let recognitionState = "idle";

function getClient() {
  if (!client) {
    client = new RecognitionClient();
  }
  return client;
}

export function getRecognitionState() {
  return recognitionState;
}

export async function initializeRecognition() {
  if (recognitionState === "ready") {
    return;
  }

  if (!initialization) {
    recognitionState = "loading";
    initialization = getClient()
      .initialize()
      .then(() => {
        recognitionState = "ready";
      })
      .catch((error) => {
        recognitionState = "error";
        initialization = null;
        throw error;
      });
  }

  await initialization;
}

export async function recognizeStrokes(strokes) {
  if (!strokes || strokes.length === 0) {
    return null;
  }

  await initializeRecognition();

  const modelStrokes = strokes.map((stroke) => ({
    points: stroke.points,
    lineWidth: stroke.width,
  }));

  if (!isStrokeMeaningful(modelStrokes)) {
    return null;
  }

  const input = preprocessStrokes(modelStrokes);
  const result = await getClient().recognize(input);
  if (!result) {
    return null;
  }

  return {
    latex: result.latex,
    timing: {
      encoderMs: result.encoderMs,
      decoderMs: result.decoderMs,
      totalMs: result.totalMs,
    },
  };
}

export function disposeRecognition() {
  client?.dispose();
  client = null;
  initialization = null;
  recognitionState = "idle";
}
