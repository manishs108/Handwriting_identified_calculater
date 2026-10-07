import { describe, expect, it } from "vitest";
import { evaluateAst, evaluateExpression } from "../evaluator";

describe("evaluateExpression", () => {
  it.each([
    ["2+3", 5], ["18+4×3", 30], ["2.5+3.5", 6], ["-5+10", 5],
    ["2×3+4", 10], ["2+3×4", 14], ["(2+3)×4", 20], ["2×(-3)", -6],
    ["2×-3", -6], ["-2×3", -6], ["1--2", 3], ["1+-2", -1], ["-(2+3)", -5],
  ])("evaluates %s", (expression, expected) => {
    const result = evaluateExpression(expression);
    expect(result.success).toBe(true);
    expect(result.result).toBeCloseTo(expected, 10);
  });

  it("returns Undefined for division by zero", () => {
    expect(evaluateExpression("12÷0")).toEqual({ success: false, result: null, error: "Undefined" });
  });

  it.each(["", "2+", "2..5", "2××3", "(2+3", "2+3)"])("returns a safe failure for malformed input %s", (expression) => {
    const result = evaluateExpression(expression);
    expect(result).toMatchObject({ success: false, result: null });
    expect(typeof result.error).toBe("string");
  });

  it("safely rejects malformed AST input", () => {
    expect(evaluateAst({ type: "BinaryExpression", operator: "+" })).toEqual({
      success: false,
      result: null,
      error: "Invalid expression",
    });
  });
});
