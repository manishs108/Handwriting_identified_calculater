import { describe, expect, it } from "vitest";
import { calculateRecognizedExpression } from "../calculation-pipeline.js";

describe("calculateRecognizedExpression", () => {
  describe("successful calculations with terminal '='", () => {
    it.each([
      ["2+3=", 5, "5"],
      ["18+4×3=", 30, "30"],
      ["18+4*3=", 30, "30"],
      ["18+4\\times3=", 30, "30"],
      ["2.5+3.5=", 6, "6"],
      ["-5+10=", 5, "5"],
      ["−5+10=", 5, "5"],
      ["2×3+4=", 10, "10"],
      ["2+3×4=", 14, "14"],
      ["(2+3)×4=", 20, "20"],
      ["2×(-3)=", -6, "-6"],
      ["10÷2=", 5, "5"],
      ["10/2=", 5, "5"],
      ["10\\div2=", 5, "5"],
      ["1--2=", 3, "3"],
      ["1+-2=", -1, "-1"],
      ["2++3=", 5, "5"],
    ])("evaluates %s to %d", (input, expectedResult, expectedDisplay) => {
      const result = calculateRecognizedExpression(input);
      expect(result.status).toBe("ready");
      expect(result.result).toBeCloseTo(expectedResult, 10);
      expect(result.displayResult).toBe(expectedDisplay);
      expect(result.error).toBeNull();
    });

    it("evaluates object input containing latex property", () => {
      const result = calculateRecognizedExpression({
        latex: "18 + 4 \\times 3 =",
      });
      expect(result).toMatchObject({
        status: "ready",
        result: 30,
        displayResult: "30",
        error: null,
      });
    });
  });

  describe("terminal '=' trigger behavior", () => {
    it("returns incomplete when '=' is missing", () => {
      const result = calculateRecognizedExpression("18+4×3");
      expect(result).toEqual({
        status: "incomplete",
        expression: "18+4*3",
        result: null,
        displayResult: null,
        error: null,
      });
    });

    it.each(["2=3=", "2+3==", "=5+2", "1=2+3"])(
      "returns invalid for misplaced or multiple equals in %s",
      (input) => {
        const result = calculateRecognizedExpression(input);
        expect(result.status).toBe("invalid");
        expect(result.result).toBeNull();
        expect(result.displayResult).toBeNull();
        expect(result.error).toBe("Equals sign must appear once at the end");
      }
    );

    it("returns invalid when expression before '=' is empty", () => {
      const result = calculateRecognizedExpression("=");
      expect(result.status).toBe("invalid");
      expect(result.error).toBe("Expression is empty");
    });
  });

  describe("division by zero", () => {
    it.each(["5÷0=", "12÷0=", "10/(5-5)="])(
      "returns undefined status for %s",
      (input) => {
        const result = calculateRecognizedExpression(input);
        expect(result).toMatchObject({
          status: "undefined",
          result: null,
          displayResult: "Undefined",
          error: "Undefined",
        });
      }
    );
  });

  describe("malformed expressions and unsupported symbols", () => {
    it.each(["2+=", "2××3=", "(2+3=", "2..5=", "()+1=", "*3="])(
      "returns invalid status for malformed syntax %s",
      (input) => {
        const result = calculateRecognizedExpression(input);
        expect(result.status).toBe("invalid");
        expect(result.result).toBeNull();
        expect(result.displayResult).toBeNull();
        expect(typeof result.error).toBe("string");
      }
    );

    it.each(["2x+3=", "2^3=", "\\sqrt{16}=", "sin(30)="])(
      "returns invalid status for unsupported symbols in %s",
      (input) => {
        const result = calculateRecognizedExpression(input);
        expect(result.status).toBe("invalid");
        expect(result.result).toBeNull();
        expect(result.displayResult).toBeNull();
        expect(result.error).toBe("Recognition contains unsupported symbols");
      }
    );
  });

  describe("empty or null recognition result", () => {
    it.each([null, undefined, "", "   ", { latex: "" }])(
      "returns empty status for %j",
      (input) => {
        const result = calculateRecognizedExpression(input);
        expect(result).toEqual({
          status: "empty",
          expression: null,
          result: null,
          displayResult: null,
          error: null,
        });
      }
    );
  });
});
