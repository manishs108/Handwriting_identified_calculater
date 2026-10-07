const REPLACEMENTS = [
  [/\\times|\\cdot/g, "*"],
  [/\\div/g, "/"],
  [/\\minus/g, "-"],
  [/\\equals/g, "="],
  [/[×]/g, "*"],
  [/[÷]/g, "/"],
  [/[−–—]/g, "-"],
];

function failure(error) {
  return { success: false, expression: null, error };
}

export function normalizeRecognitionOutput(recognitionResult) {
  if (!recognitionResult) {
    return failure("Recognition did not return an expression");
  }

  const raw =
    typeof recognitionResult === "string"
      ? recognitionResult
      : recognitionResult.latex ??
        recognitionResult.text ??
        recognitionResult.expression;

  if (typeof raw !== "string" || raw.trim() === "") {
    return failure("Recognition did not return an expression");
  }

  let expression = raw;
  for (const [pattern, replacement] of REPLACEMENTS) {
    expression = expression.replace(pattern, replacement);
  }

  // Remove LaTeX formatting characters
  expression = expression.replace(/[{}$]/g, "");

  // Remove all whitespace
  expression = expression.replace(/\s+/g, "");

  if (expression.length === 0) {
    return failure("Expression is empty");
  }

  if (!/^[0-9+\-*/.()=]+$/.test(expression)) {
    return failure("Recognition contains unsupported symbols");
  }

  return { success: true, expression, error: null };
}
