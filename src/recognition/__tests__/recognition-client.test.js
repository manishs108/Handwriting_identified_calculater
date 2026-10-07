import { describe, expect, it } from "vitest";
import { RecognitionClient } from "../recognition-client.js";

class MockWorker {
  constructor() {
    this.messagesPosted = [];
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(data, transfers) {
    this.messagesPosted.push({ data, transfers });
  }

  terminate() {
    this.terminated = true;
  }

  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

describe("RecognitionClient", () => {
  it("initializes and communicates with worker using request IDs", async () => {
    const mockWorker = new MockWorker();
    const client = new RecognitionClient(mockWorker);

    const initPromise = client.initialize();
    expect(mockWorker.messagesPosted.length).toBe(1);
    const { id, type } = mockWorker.messagesPosted[0].data;
    expect(type).toBe("initialize");

    mockWorker.simulateMessage({ id, ok: true });
    await expect(initPromise).resolves.toBeUndefined();
  });

  it("handles recognize requests and resolves with result", async () => {
    const mockWorker = new MockWorker();
    const client = new RecognitionClient(mockWorker);

    const recognizePromise = client.recognize({ testInput: true });
    expect(mockWorker.messagesPosted.length).toBe(1);
    const { id, type, input } = mockWorker.messagesPosted[0].data;
    expect(type).toBe("recognize");
    expect(input).toEqual({ testInput: true });

    mockWorker.simulateMessage({
      id,
      ok: true,
      result: { latex: "18+4*3=", encoderMs: 10, decoderMs: 20, totalMs: 30 },
    });

    const result = await recognizePromise;
    expect(result).toEqual({
      latex: "18+4*3=",
      encoderMs: 10,
      decoderMs: 20,
      totalMs: 30,
    });
  });

  it("rejects request when worker reports error", async () => {
    const mockWorker = new MockWorker();
    const client = new RecognitionClient(mockWorker);

    const requestPromise = client.recognize({});
    const { id } = mockWorker.messagesPosted[0].data;

    mockWorker.simulateMessage({
      id,
      ok: false,
      error: "Model execution failed",
    });

    await expect(requestPromise).rejects.toThrow("Model execution failed");
  });

  it("rejects pending requests and terminates worker on dispose()", async () => {
    const mockWorker = new MockWorker();
    const client = new RecognitionClient(mockWorker);

    const pendingPromise = client.recognize({});
    client.dispose();

    await expect(pendingPromise).rejects.toThrow("Recognition client disposed");
    expect(mockWorker.terminated).toBe(true);
  });
});
