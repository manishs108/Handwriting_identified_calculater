import { describe, expect, it } from "vitest";
import { normalizeRecognitionOutput } from "../normalize.js";

describe("normalizeRecognitionOutput", () => {
  it("normalizes standard numbers and operators", () => {
    const result = normalizeRecognitionOutput("18+4*3");
    expect(result).toEqual({
      success: true,
      expression: "18+4*3",
      error: null,
    });
  });

  it("normalizes LaTeX operator commands", () => {
    expect(normalizeRecognitionOutput("18+4\\times3")).toMatchObject({
      success: true,
      expression: "18+4*3",
    });

    expect(normalizeRecognitionOutput("18+4\\cdot3")).toMatchObject({
      success: true,
      expression: "18+4*3",
    });

    expect(normalizeRecognitionOutput("10\\div2")).toMatchObject({
      success: true,
      expression: "10/2",
    });

    expect(normalizeRecognitionOutput("5\\minus3")).toMatchObject({
      success: true,
      expression: "5-3",
    });

    expect(normalizeRecognitionOutput("5+2\\equals")).toMatchObject({
      success: true,
      expression: "5+2=",
    });
  });

  it("normalizes Unicode operators and dashes", () => {
    expect(normalizeRecognitionOutput("18+4×3=")).toMatchObject({
      success: true,
      expression: "18+4*3=",
    });

    expect(normalizeRecognitionOutput("5÷2=")).toMatchObject({
      success: true,
      expression: "5/2=",
    });

    expect(normalizeRecognitionOutput("−5+10=")).toMatchObject({
      success: true,
      expression: "-5+10=",
    });

    expect(normalizeRecognitionOutput("5–3=")).toMatchObject({
      success: true,
      expression: "5-3=",
    });

    expect(normalizeRecognitionOutput("5—3=")).toMatchObject({
      success: true,
      expression: "5-3=",
    });
  });

  it("strips whitespace and LaTeX formatting characters", () => {
    expect(normalizeRecognitionOutput("  1 8 + 4 \\times 3 =  ")).toMatchObject({
      success: true,
      expression: "18+4*3=",
    });

    expect(normalizeRecognitionOutput("${18}+{4}=")).toMatchObject({
      success: true,
      expression: "18+4=",
    });
  });

  it("accepts object inputs containing latex, text, or expression properties", () => {
    expect(normalizeRecognitionOutput({ latex: "18+4\\times3=" })).toMatchObject({
      success: true,
      expression: "18+4*3=",
    });

    expect(normalizeRecognitionOutput({ text: "5÷2=" })).toMatchObject({
      success: true,
      expression: "5/2=",
    });

    expect(normalizeRecognitionOutput({ expression: "2+3=" })).toMatchObject({
      success: true,
      expression: "2+3=",
    });
  });

  it("safely rejects empty or whitespace-only inputs", () => {
    expect(normalizeRecognitionOutput("")).toEqual({
      success: false,
      expression: null,
      error: "Recognition did not return an expression",
    });

    expect(normalizeRecognitionOutput("   ")).toEqual({
      success: false,
      expression: null,
      error: "Recognition did not return an expression",
    });

    expect(normalizeRecognitionOutput(null)).toEqual({
      success: false,
      expression: null,
      error: "Recognition did not return an expression",
    });

    expect(normalizeRecognitionOutput({})).toEqual({
      success: false,
      expression: null,
      error: "Recognition did not return an expression",
    });
  });

  it("safely rejects unsupported characters and letters", () => {
    expect(normalizeRecognitionOutput("2x+3=")).toEqual({
      success: false,
      expression: null,
      error: "Recognition contains unsupported symbols",
    });

    expect(normalizeRecognitionOutput("2^3=")).toEqual({
      success: false,
      expression: null,
      error: "Recognition contains unsupported symbols",
    });

    expect(normalizeRecognitionOutput("\\sqrt{9}=")).toEqual({
      success: false,
      expression: null,
      error: "Recognition contains unsupported symbols",
    });

    expect(normalizeRecognitionOutput("\\alpha+\\beta=")).toEqual({
      success: false,
      expression: null,
      error: "Recognition contains unsupported symbols",
    });
  });
});
