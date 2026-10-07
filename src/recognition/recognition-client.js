import RecognitionWorker from "./recognition.worker.js?worker";

export class RecognitionClient {
  constructor(customWorker = null) {
    this.worker = customWorker ?? new RecognitionWorker();
    this.nextId = 0;
    this.pending = new Map();

    this.worker.onmessage = ({ data }) => {
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      if (data.ok) {
        pending.resolve(data.result);
      } else {
        pending.reject(new Error(data.error || "Recognition failed"));
      }
    };

    this.worker.onerror = (error) => {
      this.rejectAll(new Error(error?.message || "Recognition worker failed"));
    };
  }

  request(type, input) {
    if (!this.worker) {
      return Promise.reject(new Error("Recognition worker is not available"));
    }

    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const transfers = [];
      if (
        input?.tensor?.buffer instanceof ArrayBuffer &&
        !input.tensor.buffer.detached
      ) {
        transfers.push(input.tensor.buffer);
      }
      if (
        input?.mask?.buffer instanceof ArrayBuffer &&
        !input.mask.buffer.detached
      ) {
        transfers.push(input.mask.buffer);
      }
      this.worker.postMessage({ id, type, input }, transfers);
    });
  }

  initialize() {
    return this.request("initialize");
  }

  recognize(input) {
    return this.request("recognize", input);
  }

  rejectAll(error) {
    for (const { reject } of this.pending.values()) {
      reject(error);
    }
    this.pending.clear();
  }

  dispose() {
    this.rejectAll(new Error("Recognition client disposed"));
    if (this.worker) {
      try {
        this.worker.postMessage({ id: ++this.nextId, type: "dispose" });
        this.worker.terminate();
      } catch {
        // Ignore termination errors if already closed
      }
      this.worker = null;
    }
  }
}
