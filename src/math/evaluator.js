// Safe mathematical expression evaluator for CalcInk
// No eval() or Function() is used.

function tokenize(expression) {
  const tokens = [];

  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    // Ignore spaces
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number: integer or decimal
    if (/[0-9.]/.test(char)) {
      let number = "";
      let decimalCount = 0;

      while (
        i < expression.length &&
        /[0-9.]/.test(expression[i])
      ) {
        if (expression[i] === ".") {
          decimalCount++;
        }

        number += expression[i];
        i++;
      }

      // Invalid number such as 2.3.4
      if (decimalCount > 1 || number === ".") {
        return {
          success: false,
          error: `Invalid number: ${number}`,
        };
      }

      tokens.push({
        type: "number",
        value: Number(number),
      });

      continue;
    }

    // Operators
    if (
      char === "+" ||
      char === "-" ||
      char === "×" ||
      char === "÷" ||
      char === "*" ||
      char === "/"
    ) {
      tokens.push({
        type: "operator",
        value: char,
      });

      i++;
      continue;
    }

    // Opening parenthesis
    if (char === "(") {
      tokens.push({
        type: "leftParen",
        value: "(",
      });

      i++;
      continue;
    }

    // Closing parenthesis
    if (char === ")") {
      tokens.push({
        type: "rightParen",
        value: ")",
      });

      i++;
      continue;
    }

    return {
      success: false,
      error: `Invalid character: ${char}`,
    };
  }

  return {
    success: true,
    tokens,
  };
}


/*
 * ----------------------------------------------------
 * OPERATOR PRECEDENCE
 * ----------------------------------------------------
 */

function precedence(operator) {
  if (
    operator === "×" ||
    operator === "÷" ||
    operator === "*" ||
    operator === "/"
  ) {
    return 2;
  }

  if (
    operator === "+" ||
    operator === "-"
  ) {
    return 1;
  }

  return 0;
}


/*
 * ----------------------------------------------------
 * SHUNTING-YARD ALGORITHM
 * Converts infix expression to postfix
 * ----------------------------------------------------
 */

function toPostfix(tokens) {
  const output = [];
  const operators = [];

  let expectingValue = true;

  for (const token of tokens) {

    /*
     * NUMBER
     */

    if (token.type === "number") {
      output.push(token);
      expectingValue = false;
      continue;
    }


    /*
     * LEFT PARENTHESIS
     */

    if (token.type === "leftParen") {

      operators.push(token);

      expectingValue = true;

      continue;
    }


    /*
     * RIGHT PARENTHESIS
     */

    if (token.type === "rightParen") {

      let foundLeftParen = false;

      while (operators.length > 0) {

        const top =
          operators[operators.length - 1];

        if (top.type === "leftParen") {
          operators.pop();
          foundLeftParen = true;
          break;
        }

        output.push(
          operators.pop()
        );
      }

      if (!foundLeftParen) {
        return {
          success: false,
          error: "Mismatched parentheses",
        };
      }

      expectingValue = false;

      continue;
    }


    /*
     * OPERATOR
     */

    if (token.type === "operator") {

      /*
       * Unary minus
       *
       * Example:
       * -5
       * 2 × (-3)
       */

      if (
        token.value === "-" &&
        expectingValue
      ) {
        output.push({
          type: "number",
          value: 0,
        });
      }

      /*
       * Unary plus
       */

      if (
        token.value === "+" &&
        expectingValue
      ) {
        continue;
      }

      while (operators.length > 0) {

        const top =
          operators[operators.length - 1];

        if (top.type === "leftParen") {
          break;
        }

        if (
          precedence(top.value) >=
          precedence(token.value)
        ) {
          output.push(
            operators.pop()
          );
        } else {
          break;
        }
      }

      operators.push(token);

      expectingValue = true;

      continue;
    }
  }


  /*
   * Move remaining operators
   */

  while (operators.length > 0) {

    const operator =
      operators.pop();

    if (
      operator.type === "leftParen" ||
      operator.type === "rightParen"
    ) {
      return {
        success: false,
        error: "Mismatched parentheses",
      };
    }

    output.push(operator);
  }

  return {
    success: true,
    postfix: output,
  };
}


/*
 * ----------------------------------------------------
 * EVALUATE POSTFIX
 * ----------------------------------------------------
 */

function evaluatePostfix(postfix) {
  const stack = [];

  for (const token of postfix) {

    /*
     * NUMBER
     */

    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }


    /*
     * OPERATOR
     */

    if (token.type === "operator") {

      if (stack.length < 2) {
        return {
          success: false,
          error: "Invalid expression",
        };
      }

      const b = stack.pop();
      const a = stack.pop();

      let result;

      switch (token.value) {

        case "+":
          result = a + b;
          break;

        case "-":
          result = a - b;
          break;

        case "×":
        case "*":
          result = a * b;
          break;

        case "÷":
        case "/":

          if (b === 0) {
            return {
              success: false,
              error: "Undefined",
            };
          }

          result = a / b;
          break;

        default:
          return {
            success: false,
            error: `Unknown operator: ${token.value}`,
          };
      }

      stack.push(result);
    }
  }


  if (stack.length !== 1) {
    return {
      success: false,
      error: "Invalid expression",
    };
  }

  return {
    success: true,
    result: stack[0],
    error: null,
  };
}


/*
 * ----------------------------------------------------
 * MAIN CALCULATOR FUNCTION
 * ----------------------------------------------------
 */

export function evaluateExpression(expression) {

  if (
    !expression ||
    expression.trim() === ""
  ) {
    return {
      success: false,
      result: null,
      error: "Empty expression",
    };
  }


  /*
   * Tokenize
   */

  const tokenResult =
    tokenize(expression);

  if (!tokenResult.success) {
    return {
      success: false,
      result: null,
      error: tokenResult.error,
    };
  }


  /*
   * Convert to postfix
   */

  const postfixResult =
    toPostfix(tokenResult.tokens);

  if (!postfixResult.success) {
    return {
      success: false,
      result: null,
      error: postfixResult.error,
    };
  }


  /*
   * Evaluate
   */

  return evaluatePostfix(
    postfixResult.postfix
  );
}