export function createNumberLiteral(value, position) {
  return { type: "NumberLiteral", value, position };
}

export function createUnaryExpression(operator, argument, position) {
  return { type: "UnaryExpression", operator, argument, position };
}

export function createBinaryExpression(operator, left, right, position) {
  return { type: "BinaryExpression", operator, left, right, position };
}

export function isAstNode(node) {
  if (!node || typeof node !== "object") return false;

  if (node.type === "NumberLiteral") {
    return typeof node.value === "number" && Number.isFinite(node.value);
  }

  if (node.type === "UnaryExpression") {
    return ["+", "-"].includes(node.operator) && isAstNode(node.argument);
  }

  if (node.type === "BinaryExpression") {
    return (
      ["+", "-", "×", "÷", "*", "/"].includes(node.operator) &&
      isAstNode(node.left) &&
      isAstNode(node.right)
    );
  }

  return false;
}
