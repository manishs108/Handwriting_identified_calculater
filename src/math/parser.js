import { createBinaryExpression, createNumberLiteral, createUnaryExpression } from "./ast.js";
import { tokenize } from "./tokenizer.js";

function failure(message, position) {
  return { success: false, ast: null, error: { type: "ParserError", message, position } };
}

class Parser {
  constructor(tokens, endPosition) {
    this.tokens = tokens;
    this.index = 0;
    this.endPosition = endPosition;
  }

  current() {
    return this.tokens[this.index] ?? null;
  }

  consume() {
    const token = this.current();
    this.index += 1;
    return token;
  }

  parse() {
    if (this.tokens.length === 0) return failure("Expression is empty", 0);

    const expression = this.parseAdditive();
    if (!expression.success) return expression;

    const extra = this.current();
    if (extra) return failure("Unexpected token", extra.position);

    return { success: true, ast: expression.ast, error: null };
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    if (!left.success) return left;

    while (this.current()?.type === "operator" && ["+", "-"].includes(this.current().value)) {
      const operator = this.consume();
      const right = this.parseMultiplicative();
      if (!right.success) return right;
      left = {
        success: true,
        ast: createBinaryExpression(operator.value, left.ast, right.ast, operator.position),
      };
    }

    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    if (!left.success) return left;

    while (this.current()?.type === "operator" && ["×", "÷", "*", "/"].includes(this.current().value)) {
      const operator = this.consume();
      const right = this.parseUnary();
      if (!right.success) return right;
      left = {
        success: true,
        ast: createBinaryExpression(operator.value, left.ast, right.ast, operator.position),
      };
    }

    return left;
  }

  parseUnary() {
    const token = this.current();
    if (token?.type === "operator" && ["+", "-"].includes(token.value)) {
      this.consume();
      const argument = this.parseUnary();
      if (!argument.success) return argument;
      return {
        success: true,
        ast: createUnaryExpression(token.value, argument.ast, token.position),
      };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.current();
    if (!token) return failure("Expected a number or parenthesized expression", this.endPosition);

    if (token.type === "number") {
      this.consume();
      return { success: true, ast: createNumberLiteral(token.value, token.position) };
    }

    if (token.type === "leftParen") {
      this.consume();
      const expression = this.parseAdditive();
      if (!expression.success) return expression;

      const closing = this.current();
      if (!closing || closing.type !== "rightParen") {
        return failure("Expected closing parenthesis", closing?.position ?? this.endPosition);
      }
      this.consume();
      return expression;
    }

    if (token.type === "rightParen") return failure("Unexpected closing parenthesis", token.position);
    return failure("Expected a number or parenthesized expression", token.position);
  }
}

export function parseTokens(tokens, endPosition = 0) {
  if (!Array.isArray(tokens)) return failure("Tokens must be an array", 0);
  return new Parser(tokens, endPosition).parse();
}

export function parse(expression) {
  const tokenResult = tokenize(expression);
  if (!tokenResult.success) {
    return { success: false, ast: null, error: tokenResult.error };
  }
  return parseTokens(tokenResult.tokens, expression.length);
}
