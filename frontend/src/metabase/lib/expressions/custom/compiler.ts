import {
  /* ALL_ASTYPES */ ADD,
  FIELD,
  LOGICAL_AND,
  CALL,
  EQUALITY,
  NUMBER,
  LOGICAL_OR,
  COMPARISON,
  GROUP,
  MULDIV_OP,
  STRING,
  SUB,
  NEGATIVE,
  LOGICAL_NOT,
  IDENTIFIER,
  ROOT,
  ARG_LIST,
} from "./syntax";
import { assert, NodeType, Token, Node, CompileError } from "./types";

type Expr = number | string | [string, ...Expr[]];

export function compile(node: Node): Expr {
  if (node.Type !== ROOT) {
    throw new CompileError("Must be root node", { node });
  }
  const func = compileUnaryOp(node);
  return func(node.children[0]);
}

// ----------------------------------------------------------------

function compileField(node: Node): Expr {
  assert(node.Type === FIELD, "Invalid Node Type");
  assert(node.token?.text, "Empty field name");
  // Slice off the leading and trailing brackets
  const name = node.token.text.slice(1, node.token.text.length - 1);
  return ["dimension", name];
}

function compileIdentifier(node: Node): Expr {
  assert(node.Type === IDENTIFIER, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  const name = node.token.text;
  return ["dimension", name];
}

function compileGroup(node: Node): Expr {
  assert(node.Type === GROUP, "Invalid Node Type");
  const func = compileUnaryOp(node);
  return func(node.children[0]);
}

function compileString(node: Node): Expr {
  assert(node.Type === STRING, "Invalid Node Type");
  assert(typeof node.token?.text === "string", "No token text");
  // Slice off the leading and trailing quotes
  return node.token.text.slice(1, node.token.text.length - 1);
}

// ----------------------------------------------------------------

function compileLogicalNot(node: Node): Expr {
  assert(node.Type === LOGICAL_NOT, "Invalid Node Type");
  const func = compileUnaryOp(node);
  assert(node.token?.text, "Empty token text");
  const child = node.children[0];
  return ["not", func(child)];
}

function compileLogicalAnd(node: Node): Expr {
  assert(node.Type === LOGICAL_AND, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  const [left, right] = compileInlineInfixOp(node);
  return [node.token?.text.toLowerCase(), ...left, ...right];
}

function compileLogicalOr(node: Node): Expr {
  assert(node.Type === LOGICAL_OR, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  const [left, right] = compileInlineInfixOp(node);
  return [node.token?.text.toLowerCase(), ...left, ...right];
}

function compileComparisonOp(node: Node): Expr {
  assert(node.Type === COMPARISON, "Invalid Node Type");
  const text = node.token?.text;
  assert(text, "Empty token text");
  const [left, right] = compileInlineInfixOp(node);
  return [text, ...left, ...right];
}

function compileEqualityOp(node: Node): Expr {
  assert(node.Type === EQUALITY, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  const [left, right] = compileInlineInfixOp(node);
  return [node.token?.text, ...left, ...right];
}

// ----------------------------------------------------------------

function compileFunctionCall(node: Node): Expr {
  assert(node.Type === CALL, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  assert(
    node.children[0].Type === ARG_LIST,
    "First argument must be an arglist",
  );
  return [node.token?.text, ...compileArgList(node.children[0])];
}

function compileArgList(node: Node): Expr[] {
  assert(node.Type === ARG_LIST, "Invalid Node Type");
  return node.children.map(child => {
    const func = COMPILE.get(child.Type);
    if (!func) {
      throw new CompileError("Invalid node type", { node: child });
    }
    return func(child);
  });
}

// ----------------------------------------------------------------

function compileNumber(node: Node): Expr {
  assert(node.Type === NUMBER, "Invalid Node Type");
  assert(typeof node.token?.text === "string", "No token text");
  try {
    return parseFloat(node.token.text);
  } catch (err) {
    throw new CompileError("Invalid number format", { node });
  }
}

function compileNegative(node: Node): Expr {
  assert(node.Type === NEGATIVE, "Invalid Node Type");
  const func = compileUnaryOp(node);
  assert(node.token?.text, "Empty token text");
  const child = node.children[0];
  if (child.Type === NUMBER) {
    return -func(child);
  }
  return ["-", func(child)];
}

function compileAdditionOp(node: Node): Expr {
  assert(node.Type === ADD, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  const [left, right] = compileInlineInfixOp(node);
  return [node.token?.text, ...left, ...right];
}

function compileMulDivOp(node: Node): Expr {
  assert(node.Type === MULDIV_OP, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  const [left, right] = compileInlineInfixOp(node);
  return [node.token?.text, ...left, ...right];
}

function compileSubtractionOp(node: Node): Expr {
  assert(node.Type === SUB, "Invalid Node Type");
  assert(node.token?.text, "Empty token text");
  const [left, right] = compileInlineInfixOp(node);
  return [node.token?.text, ...left, ...right];
}

// ----------------------------------------------------------------

function compileUnaryOp(node: Node) {
  if (node.children.length > 1) {
    throw new CompileError("Unexpected expression", { node: node.children[1] });
  } else if (node.children.length === 0) {
    throw new CompileError("Expected expression", { node });
  }
  const func = COMPILE.get(node.children[0].Type);
  if (!func) {
    throw new CompileError("Invalid node type", { node: node.children[0] });
  }
  return func;
}

function compileInfixOp(node: Node) {
  if (node.children.length > 2) {
    throw new CompileError("Unexpected expression", { node: node.children[2] });
  } else if (node.children.length === 0) {
    throw new CompileError("Expected expressions", { node });
  }
  const leftFn = COMPILE.get(node.children[0].Type);
  if (!leftFn) {
    throw new CompileError("Invalid node type", { node: node.children[0] });
  }
  const rightFn = COMPILE.get(node.children[1].Type);
  if (!rightFn) {
    throw new CompileError("Invalid node type", { node: node.children[1] });
  }
  return [leftFn, rightFn];
}

function compileInlineInfixOp(node: Node) {
  if (node.children.length > 2) {
    throw new CompileError("Unexpected expression", { node: node.children[2] });
  } else if (node.children.length === 0) {
    throw new CompileError("Expected expressions", { node });
  }
  const leftFn = COMPILE.get(node.children[0].Type);
  if (!leftFn) {
    throw new CompileError("Invalid node type", { node: node.children[0] });
  }
  const rightFn = COMPILE.get(node.children[1].Type);
  if (!rightFn) {
    throw new CompileError("Invalid node type", { node: node.children[1] });
  }

  const text = node.token?.text;
  let left: any = leftFn(node.children[0]);
  if (
    node.Type === node.children[0].Type &&
    Array.isArray(left) &&
    left[0].toUpperCase() === text?.toUpperCase()
  ) {
    const [op, ...args] = left;
    left = args;
  } else {
    left = [left];
  }

  let right: any = rightFn(node.children[1]);
  if (
    node.Type === node.children[1].Type &&
    Array.isArray(right) &&
    right[0].toUpperCase() === text?.toUpperCase()
  ) {
    const [op, ...args] = right;
    right = args;
  } else {
    right = [right];
  }
  return [left, right];
}

// ----------------------------------------------------------------

const COMPILE = new Map([
  [FIELD, compileField],
  [ADD, compileAdditionOp],
  [LOGICAL_AND, compileLogicalAnd],
  [CALL, compileFunctionCall],
  [EQUALITY, compileEqualityOp],
  [NUMBER, compileNumber],
  [LOGICAL_NOT, compileLogicalNot],
  [NEGATIVE, compileNegative],
  [LOGICAL_OR, compileLogicalOr],
  [COMPARISON, compileComparisonOp],
  [GROUP, compileGroup],
  [MULDIV_OP, compileMulDivOp],
  [STRING, compileString],
  [SUB, compileSubtractionOp],
  [IDENTIFIER, compileIdentifier],
]);
