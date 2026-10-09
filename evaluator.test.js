import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExpression } from "./evaluator.js";
import { normalizeRecognizedExpression } from "./recognitionExpression.js";
import { findHandwrittenEquals } from "./equalsDetection.js";

const validCases = [
  ["2 + 3", 5],
  ["8 - 10", -2],
  ["6 * 7", 42],
  ["6 × 7", 42],
  ["8 / 2", 4],
  ["8 ÷ 2", 4],
  ["2 + 3 * 4", 14],
  ["(2 + 3) * 4", 20],
  ["-5", -5],
  ["2 * -3", -6],
  ["-(2 + 3)", -5],
  ["--3", 3],
  ["1 + -2", -1],
  ["1.5 + 2.25", 3.75],
];

test("evaluates arithmetic, precedence, parentheses, and unary signs", () => {
  for (const [expression, expected] of validCases) {
    assert.deepEqual(evaluateExpression(expression), {
      success: true,
      result: expected,
      error: null,
    }, expression);
  }
});

test("returns Undefined for division by positive or negative zero", () => {
  for (const expression of [
    "1 / 0",
    "0 / 0",
    "-3 / 0",
    "1 / -0",
    "17 + 8.1 / 0",
  ]) {
    assert.deepEqual(evaluateExpression(expression), {
      success: false,
      result: null,
      error: "Undefined",
    }, expression);
  }
});

test("rejects malformed and unsupported expressions", () => {
  for (const expression of [
    "",
    "1 +",
    "1 * / 2",
    "(1 + 2",
    "1 + 2)",
    "1..2",
    "2(3)",
    "1 + abc",
  ]) {
    assert.equal(evaluateExpression(expression).success, false, expression);
  }
});

test("reports arithmetic overflow instead of returning Infinity", () => {
  assert.deepEqual(evaluateExpression(`${"9".repeat(400)} * 2`), {
    success: false,
    result: null,
    error: "Result is too large",
  });
});

test("normalizes recognition output for operators, fractions, and equals", () => {
  const cases = [
    [String.raw`2\times3=`, "2*3="],
    [String.raw`8\div2=`, "8/2="],
    [String.raw`\frac{1}{2}+\frac{3}{4}=`, "((1)/(2))+((3)/(4))="],
    ["4\u22121\uFF1D", "4-1="],
  ];

  for (const [latex, expected] of cases) {
    assert.equal(normalizeRecognizedExpression(latex), expected, latex);
  }
});

test("uses the expression before equals when recognition guesses a right-hand side", () => {
  const recognized = normalizeRecognizedExpression(String.raw`\frac{1}{0}=0`);
  const equalsIndex = recognized.indexOf("=");
  assert.notEqual(equalsIndex, -1);
  assert.deepEqual(evaluateExpression(recognized.slice(0, equalsIndex)), {
    success: false,
    result: null,
    error: "Undefined",
  });
});

test("shows Undefined for a decimal division by zero ending with equals", () => {
  const recognized = normalizeRecognizedExpression("17+8.1/0=");
  const equalsIndex = recognized.indexOf("=");
  assert.equal(recognized, "17+8.1/0=");
  assert.deepEqual(evaluateExpression(recognized.slice(0, equalsIndex)), {
    success: false,
    result: null,
    error: "Undefined",
  });
});

test("detects normal and small equals strokes but ignores a division slash", () => {
  const line = (minX, maxX, minY, maxY) => ({
    points: [],
    width: 1,
    boundingBox: {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  });

  assert.ok(findHandwrittenEquals([line(10, 24, 20, 23), line(11, 25, 29, 32)]));
  assert.ok(findHandwrittenEquals([line(10, 16, 20, 23), line(10, 16, 25, 28)]));
  assert.equal(findHandwrittenEquals([line(10, 22, 10, 22)]), null);
});
