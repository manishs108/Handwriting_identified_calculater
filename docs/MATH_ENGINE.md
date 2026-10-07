# CalcInk Math Engine

## Overview

The CalcInk Math Engine provides deterministic, client-side arithmetic evaluation for handwritten expressions. It follows a classical compiler front-end architecture:

```
Expression String
       ↓
   tokenize()
       ↓
    Tokens
       ↓
    parse()
       ↓
Abstract Syntax Tree (AST)
       ↓
  evaluateAst()
       ↓
 EvaluationResult
```

The engine runs completely offline with **zero dynamic code execution** (no `eval()`, no `Function()`).

---

## Architecture Components

### 1. AST Definition (`src/math/ast.js`)
Represents parsed mathematical expressions in a structured node hierarchy:
* `NumberLiteral`: Represents finite numerical values (`{ type: "NumberLiteral", value, position }`).
* `UnaryExpression`: Represents unary sign operators (`+` or `-`) applied to an expression (`{ type: "UnaryExpression", operator, argument, position }`).
* `BinaryExpression`: Represents arithmetic operations between two expressions (`{ type: "BinaryExpression", operator, left, right, position }`).
* `isAstNode(node)`: Type-guard to validate that AST nodes conform to expected schemas.

### 2. Tokenizer (`src/math/tokenizer.js`)
Scans raw expression strings and emits typed tokens with character offset positions:
* Supports digits `0–9`, decimal points `.`, multi-digit integers, and floating-point literals.
* Detects operators (`+`, `-`, `×`, `÷`, `*`, `/`) and parentheses (`(`, `)`).
* Detects malformed number literals (e.g., `2..5`, trailing decimal `2.`, lone decimal `.`).
* Safely rejects unsupported characters (e.g., `^`, letters, arbitrary symbols).

### 3. Parser (`src/math/parser.js`)
Implements a deterministic recursive-descent parser producing a standard AST:
* **Precedence (BODMAS / PEMDAS):**
  1. Parentheses: `( ... )`
  2. Unary Signs: `+`, `-`
  3. Multiplicative: `×`, `÷`, `*`, `/` (left-associative)
  4. Additive: `+`, `-` (left-associative)
* Detects mismatched parentheses, unexpected trailing tokens, and syntax errors.
* Returns `{ success: true, ast }` or `{ success: false, error: { type: "ParserError", message, position } }`.

### 4. Evaluator (`src/math/evaluator.js`)
Safely traverses the AST recursively:
* Multi-digit numbers and floating-point arithmetic.
* Unary signs (e.g., `-5`, `2×-3`, `1--2`, `1+-2`).
* Division-by-zero handling: Explicitly returns `{ success: false, result: null, error: "Undefined" }`.
* Finite validation: Checks `Number.isFinite(result)` to prevent overflow or NaN leakage.
* Backward-compatible entry point: `evaluateExpression(expression)` orchestrates parsing and evaluation in a single call.

---

## Public APIs

```javascript
import {
  tokenize,
  parse,
  parseTokens,
  evaluateAst,
  evaluateExpression,
} from "./src/math";
```

| Function | Input | Output | Description |
|---|---|---|---|
| `tokenize(expr)` | `string` | `{ success, tokens, error }` | Converts string into token list |
| `parse(expr)` | `string` | `{ success, ast, error }` | Tokenizes and parses into AST |
| `parseTokens(tokens)` | `Token[]` | `{ success, ast, error }` | Parses pre-tokenized array into AST |
| `evaluateAst(ast)` | `ASTNode` | `{ success, result, error }` | Recursively evaluates AST |
| `evaluateExpression(expr)` | `string` | `{ success, result, error }` | Full parse-and-eval workflow |

---

## Security Guarantees

1. **No `eval()` / `Function()`**: The engine parses tokens into a strictly typed AST and walks the tree directly in JavaScript arithmetic.
2. **Untrusted Input Protection**: Malformed expressions fail gracefully with descriptive error objects rather than crashing or executing arbitrary code.
3. **No Network Access**: Mathematical evaluation is entirely local and synchronous.
