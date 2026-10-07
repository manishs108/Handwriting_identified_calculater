import { describe, expect, it } from "vitest";
import { parse } from "../parser";

describe("parse", () => {
  it("builds an AST with multiplication before addition", () => {
    const result = parse("2+3×4");

    expect(result.success).toBe(true);
    expect(result.ast).toMatchObject({
      type: "BinaryExpression",
      operator: "+",
      left: { type: "NumberLiteral", value: 2 },
      right: { type: "BinaryExpression", operator: "×" },
    });
  });

  it("uses parentheses to override precedence", () => {
    const result = parse("(2+3)×4");
    expect(result.success).toBe(true);
    expect(result.ast).toMatchObject({
      type: "BinaryExpression",
      operator: "×",
      left: { type: "BinaryExpression", operator: "+" },
    });
  });

  it.each(["-5", "+5", "2×(-3)", "2×-3", "-2×3", "1--2", "1+-2", "-(2+3)", "2×(-3+4)"])("parses unary signs in %s", (expression) => {
    expect(parse(expression).success).toBe(true);
  });

  it.each(["2+", "2××3", "(2+3", "2+3)", "()", "2 3"])("rejects malformed expression %s", (expression) => {
    expect(parse(expression)).toMatchObject({ success: false, error: { type: "ParserError" } });
  });
});
