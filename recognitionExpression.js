function readLatexGroup(source, startIndex) {
  let index = startIndex;
  while (/\s/.test(source[index] || "")) index += 1;
  if (source[index] !== "{") return null;

  const groupStart = index + 1;
  let depth = 1;
  index += 1;
  while (index < source.length && depth > 0) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    index += 1;
  }
  if (depth !== 0) return null;
  return { value: source.slice(groupStart, index - 1), nextIndex: index };
}

function convertLatexFractions(source) {
  const fractionCommand = /\\(?:dfrac|tfrac|frac)\s*/g;
  let converted = "";
  let cursor = 0;
  let match;

  while ((match = fractionCommand.exec(source)) !== null) {
    const numerator = readLatexGroup(source, fractionCommand.lastIndex);
    const denominator = numerator && readLatexGroup(source, numerator.nextIndex);
    if (!numerator || !denominator) continue;

    converted += source.slice(cursor, match.index);
    converted += `((${convertLatexFractions(numerator.value)})/(${convertLatexFractions(denominator.value)}))`;
    cursor = denominator.nextIndex;
    fractionCommand.lastIndex = cursor;
  }

  return converted + source.slice(cursor);
}

export function normalizeRecognizedExpression(latex) {
  return convertLatexFractions(String(latex ?? ""))
    .replace(/\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\cdot/g, "*")
    .replace(/\\minus/g, "-")
    .replace(/\\(?:equals|equiv)\b/g, "=")
    .replace(/\\text\s*\{\s*=\s*\}/g, "=")
    .replace(/[\u00d7]/g, "*")
    .replace(/[\u00f7]/g, "/")
    .replace(/[\uFF1D\uFE66]/g, "=")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[{}$]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .replace(/={2,}$/, "=");
}
