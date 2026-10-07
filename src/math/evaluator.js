import { isAstNode } from "./ast.js";
import { parse } from "./parser.js";

function failure(error) {
  return { success: false, result: null, error };
}

function evaluateNode(node) {
  if (node.type === "NumberLiteral") {
    return { success: true, result: node.value, error: null };
  }

  if (node.type === "UnaryExpression") {
    const argument = evaluateNode(node.argument);
    if (!argument.success) return argument;
    if (node.operator === "+") return { success: true, result: argument.result, error: null };
    if (node.operator === "-") return { success: true, result: -argument.result, error: null };
    return failure("Unsupported unary operator");
  }

  if (node.type === "BinaryExpression") {
    const left = evaluateNode(node.left);
    if (!left.success) return left;
    const right = evaluateNode(node.right);
    if (!right.success) return right;

    let result;
    switch (node.operator) {
      case "+":
        result = left.result + right.result;
        break;
      case "-":
        result = left.result - right.result;
        break;
      case "×":
      case "*":
        result = left.result * right.result;
        break;
      case "÷":
      case "/":
        if (right.result === 0) return failure("Undefined");
        result = left.result / right.result;
        break;
      default:
        return failure("Unsupported binary operator");
    }

    return Number.isFinite(result)
      ? { success: true, result, error: null }
      : failure("Result is not finite");
  }

  return failure("Invalid expression");
}

export function evaluateAst(ast) {
  if (!isAstNode(ast)) return failure("Invalid expression");

  try {
    return evaluateNode(ast);
  } catch {
    return failure("Invalid expression");
  }
}

// Compatibility entry point used by App.jsx.
export function evaluateExpression(expression) {
  const parseResult = parse(expression);
  if (!parseResult.success) return failure(parseResult.error.message);
  return evaluateAst(parseResult.ast);
}
