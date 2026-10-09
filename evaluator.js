// Safe mathematical expression evaluator for CalcInk.
// Supports decimal numbers, parentheses, +, -, multiplication, and division.

function tokenize(expression) {
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const start = index;
      let decimalCount = 0;
      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        if (expression[index] === ".") decimalCount += 1;
        index += 1;
      }
      const text = expression.slice(start, index);
      if (decimalCount > 1 || text === ".") {
        return { success: false, error: `Invalid number: ${text}` };
      }
      if (tokens.length && (tokens[tokens.length - 1].type === "number" || tokens[tokens.length - 1].type === "rightParen")) {
        return { success: false, error: "Invalid expression" };
      }
      const value = Number(text);
      if (!Number.isFinite(value)) {
        return { success: false, error: "Result is too large" };
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (char === "×" || char === "*") {
      tokens.push({ type: "operator", value: "*" });
      index += 1;
      continue;
    }
    if (char === "÷" || char === "/") {
      tokens.push({ type: "operator", value: "/" });
      index += 1;
      continue;
    }
    if (char === "+" || char === "-") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }
    if (char === "(") {
      if (tokens.length && (tokens[tokens.length - 1].type === "number" || tokens[tokens.length - 1].type === "rightParen")) {
        return { success: false, error: "Invalid expression" };
      }
      tokens.push({ type: "leftParen", value: char });
      index += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "rightParen", value: char });
      index += 1;
      continue;
    }

    return { success: false, error: `Invalid character: ${char}` };
  }

  return { success: true, tokens };
}

function precedence(operator) {
  if (operator === "u-") return 3;
  return operator === "*" || operator === "/" ? 2 : 1;
}

function toPostfix(tokens) {
  const output = [];
  const operators = [];
  let expectingValue = true;

  for (const token of tokens) {
    if (token.type === "number") {
      if (!expectingValue) return { success: false, error: "Invalid expression" };
      output.push(token);
      expectingValue = false;
      continue;
    }

    if (token.type === "leftParen") {
      if (!expectingValue) return { success: false, error: "Invalid expression" };
      operators.push(token);
      expectingValue = true;
      continue;
    }

    if (token.type === "rightParen") {
      if (expectingValue) return { success: false, error: "Invalid expression" };
      let matched = false;
      while (operators.length) {
        const top = operators.pop();
        if (top.type === "leftParen") {
          matched = true;
          break;
        }
        output.push(top);
      }
      if (!matched) return { success: false, error: "Mismatched parentheses" };
      expectingValue = false;
      continue;
    }

    if (token.type !== "operator") {
      return { success: false, error: "Invalid expression" };
    }

    if (expectingValue) {
      if (token.value === "+") continue;
      if (token.value !== "-") return { success: false, error: "Invalid expression" };
      operators.push({ type: "operator", value: "u-" });
      continue;
    }

    while (operators.length) {
      const top = operators[operators.length - 1];
      if (top.type === "leftParen" || precedence(top.value) < precedence(token.value)) break;
      output.push(operators.pop());
    }
    operators.push(token);
    expectingValue = true;
  }

  if (!tokens.length || expectingValue) return { success: false, error: "Invalid expression" };
  while (operators.length) {
    const operator = operators.pop();
    if (operator.type === "leftParen") return { success: false, error: "Mismatched parentheses" };
    output.push(operator);
  }
  return { success: true, postfix: output };
}

function evaluatePostfix(postfix) {
  const stack = [];
  for (const token of postfix) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }
    if (token.value === "u-") {
      if (!stack.length) return { success: false, error: "Invalid expression" };
      stack.push(-stack.pop());
      continue;
    }
    if (stack.length < 2) return { success: false, error: "Invalid expression" };
    const right = stack.pop();
    const left = stack.pop();
    let result;
    switch (token.value) {
      case "+": result = left + right; break;
      case "-": result = left - right; break;
      case "*": result = left * right; break;
      case "/":
        if (right === 0) return { success: false, result: null, error: "Undefined" };
        result = left / right;
        break;
      default: return { success: false, error: `Unknown operator: ${token.value}` };
    }
    if (!Number.isFinite(result)) {
      return { success: false, result: null, error: "Result is too large" };
    }
    stack.push(result);
  }

  if (stack.length !== 1) return { success: false, error: "Invalid expression" };
  return { success: true, result: stack[0], error: null };
}

export function evaluateExpression(expression) {
  if (!expression || expression.trim() === "") {
    return { success: false, result: null, error: "Empty expression" };
  }
  const tokenResult = tokenize(expression);
  if (!tokenResult.success) {
    return { success: false, result: null, error: tokenResult.error };
  }
  const postfixResult = toPostfix(tokenResult.tokens);
  if (!postfixResult.success) {
    return { success: false, result: null, error: postfixResult.error };
  }
  return evaluatePostfix(postfixResult.postfix);
}
