const OPERATORS = new Set(["+", "-", "×", "÷", "*", "/"]);

function failure(message, position) {
  return {
    success: false,
    tokens: [],
    error: { type: "TokenizerError", message, position },
  };
}

export function tokenize(expression) {
  if (typeof expression !== "string") return failure("Expression must be a string", 0);

  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(character)) {
      const position = index;
      let literal = "";
      let decimalCount = 0;
      let digitCount = 0;

      while (index < expression.length && /\d|\./.test(expression[index])) {
        const numericCharacter = expression[index];
        literal += numericCharacter;
        if (numericCharacter === ".") {
          decimalCount += 1;
          if (decimalCount > 1) return failure("Malformed number literal", index);
        } else {
          digitCount += 1;
        }
        index += 1;
      }

      if (digitCount === 0 || literal.endsWith(".")) {
        return failure("Malformed number literal", position);
      }

      tokens.push({ type: "number", lexeme: literal, value: Number(literal), position });
      continue;
    }

    if (OPERATORS.has(character)) {
      tokens.push({ type: "operator", value: character, position: index });
      index += 1;
      continue;
    }

    if (character === "(") {
      tokens.push({ type: "leftParen", value: character, position: index });
      index += 1;
      continue;
    }

    if (character === ")") {
      tokens.push({ type: "rightParen", value: character, position: index });
      index += 1;
      continue;
    }

    return failure(`Unsupported character: ${character}`, index);
  }

  return { success: true, tokens, error: null };
}
