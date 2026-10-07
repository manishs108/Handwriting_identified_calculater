import { describe, expect, it } from "vitest";
import { tokenize } from "../tokenizer";

describe("tokenize", () => {
  it("tokenizes integers, multi-digit numbers, decimals, and whitespace", () => {
    const result = tokenize(" 18 + 0.25 ");

    expect(result).toMatchObject({ success: true, error: null });
    expect(result.tokens).toEqual([
      { type: "number", lexeme: "18", value: 18, position: 1 },
      { type: "operator", value: "+", position: 4 },
      { type: "number", lexeme: "0.25", value: 0.25, position: 6 },
    ]);
  });

  it("tokenizes supported operators and parentheses", () => {
    const result = tokenize("(2+3)×4÷5*6/7-");

    expect(result.success).toBe(true);
    expect(result.tokens.map((token) => token.type === "operator" ? token.value : token.type)).toEqual([
      "leftParen", "number", "+", "number", "rightParen", "×", "number", "÷", "number", "*", "number", "/", "number", "-",
    ]);
  });

  it.each(["2..5", ".", "2."])("rejects malformed number %s", (expression) => {
    const result = tokenize(expression);
    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({ type: "TokenizerError", message: "Malformed number literal" });
  });

  it("rejects unsupported characters", () => {
    expect(tokenize("2^3")).toMatchObject({
      success: false,
      error: { type: "TokenizerError", message: "Unsupported character: ^", position: 1 },
    });
  });
});
