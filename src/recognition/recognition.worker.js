import { InferenceEngine, loadVocab } from "ink-on/core";

let engine = null;
let vocab = null;
let loading = null;

async function initialize() {
  if (engine && vocab) return;
  if (loading) return loading;

  loading = (async () => {
    vocab = await loadVocab("/models/comer/vocab.json");
    engine = new InferenceEngine({
      encoderUrl: "/models/comer/encoder_int8.onnx",
      decoderUrl: "/models/comer/decoder_int8.onnx",
      beamWidth: 3,
      executionProvider: "wasm",
    });
    await engine.init();
  })();

  try {
    await loading;
  } finally {
    loading = null;
  }
}

self.onmessage = async ({ data }) => {
  const { id, type, input } = data;
  try {
    if (type === "dispose") {
      engine?.dispose();
      engine = null;
      vocab = null;
      self.postMessage({ id, ok: true });
      return;
    }

    await initialize();
    if (type === "initialize") {
      self.postMessage({ id, ok: true });
      return;
    }

    const result = await engine.recognize(input, vocab, "number");
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : "Recognition failed" });
  }
};
