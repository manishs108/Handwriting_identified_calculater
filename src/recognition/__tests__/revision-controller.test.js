import { describe, expect, it } from "vitest";
import { createRevisionController } from "../revision-controller.js";

describe("createRevisionController", () => {
  it("starts at revision 0 and increments with next()", () => {
    const controller = createRevisionController();
    expect(controller.current()).toBe(0);

    const r1 = controller.next();
    expect(r1).toBe(1);
    expect(controller.current()).toBe(1);

    const r2 = controller.next();
    expect(r2).toBe(2);
    expect(controller.current()).toBe(2);
  });

  it("checks whether a revision is current", () => {
    const controller = createRevisionController();
    const r1 = controller.next();
    expect(controller.isCurrent(r1)).toBe(true);

    const r2 = controller.next();
    expect(controller.isCurrent(r1)).toBe(false);
    expect(controller.isCurrent(r2)).toBe(true);
  });

  it("invalidates all pending revisions when invalidate() is called", () => {
    const controller = createRevisionController();
    const r1 = controller.next();
    expect(controller.isCurrent(r1)).toBe(true);

    controller.invalidate();
    expect(controller.isCurrent(r1)).toBe(false);
  });

  it("correctly drops stale out-of-order asynchronous completions", async () => {
    const controller = createRevisionController();
    const responsesAccepted = [];

    // Simulate Request A (Revision 1) - slow (takes longer)
    const revA = controller.next();
    const requestA = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ revision: revA, data: "result_from_A" });
      }, 50);
    });

    // Simulate user editing canvas -> Request B (Revision 2) - fast
    const revB = controller.next();
    const requestB = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ revision: revB, data: "result_from_B" });
      }, 10);
    });

    // Fast request B resolves first
    const resB = await requestB;
    if (controller.isCurrent(resB.revision)) {
      responsesAccepted.push(resB.data);
    }

    // Slow request A resolves later
    const resA = await requestA;
    if (controller.isCurrent(resA.revision)) {
      responsesAccepted.push(resA.data);
    }

    // Only result_from_B should have been accepted
    expect(responsesAccepted).toEqual(["result_from_B"]);
  });

  it("resets revision counter when reset() is called", () => {
    const controller = createRevisionController();
    controller.next();
    controller.next();
    expect(controller.current()).toBe(2);

    controller.reset();
    expect(controller.current()).toBe(0);
  });
});
