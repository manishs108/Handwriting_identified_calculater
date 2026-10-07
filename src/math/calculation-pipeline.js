import { evaluateExpression } from "./evaluator.js";
import { normalizeRecognitionOutput } from "./normalize.js";

function response(status, fields = {}) {
  return {
    status,
    expression: null,
    result: null,
    displayResult: null,
    error: null,
    ...fields,
  };
}

export function calculateRecognizedExpression(recognitionResult) {
  if (!recognitionResult) {
    return response("empty");
  }

  const raw =
    typeof recognitionResult === "string"
      ? recognitionResult
      : recognitionResult.latex ??
        recognitionResult.text ??
        recognitionResult.expression;

  if (typeof raw !== "string" || raw.trim() === "") {
    return response("empty");
  }

  const normalized = normalizeRecognitionOutput(recognitionResult);
  if (!normalized.success) {
    return response("invalid", { error: normalized.error });
  }

  const { expression } = normalized;
  const equalsCount = [...expression].filter((character) => character === "=").length;

  if (equalsCount === 0) {
    return response("incomplete", { expression });
  }

  if (equalsCount !== 1 || !expression.endsWith("=")) {
    return response("invalid", {
      expression,
      error: "Equals sign must appear once at the end",
    });
  }

  const arithmeticExpression = expression.slice(0, -1);
  if (!arithmeticExpression) {
    return response("invalid", {
      expression,
      error: "Expression is empty",
    });
  }

  const evaluation = evaluateExpression(arithmeticExpression);
  if (!evaluation.success) {
    if (evaluation.error === "Undefined") {
      return response("undefined", {
        expression: arithmeticExpression,
        result: null,
        displayResult: "Undefined",
        error: evaluation.error,
      });
    }

    return response("invalid", {
      expression: arithmeticExpression,
      error: evaluation.error,
    });
  }

  return response("ready", {
    expression: arithmeticExpression,
    result: evaluation.result,
    displayResult: String(evaluation.result),
  });
}
