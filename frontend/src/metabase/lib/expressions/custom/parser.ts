import {
  ADD,
  ARG_LIST,
  BAD_TOKEN,
  CALL,
  COMMA,
  COMPARISON,
  END_OF_INPUT,
  EQUALITY,
  FIELD,
  GROUP,
  GROUP_CLOSE,
  IDENTIFIER,
  LOGICAL_AND,
  LOGICAL_NOT,
  LOGICAL_OR,
  MULDIV_OP,
  NEGATIVE,
  NUMBER,
  ROOT,
  STRING,
  SUB,
  WS,
} from "./syntax";
import { assert, CompileError } from "./types";
import type {
  NodeType,
  Token,
  Node,
  Hooks,
} from "./types";

import { tokenize, TOKEN, OPERATOR } from "../tokenizer";

interface ParserOptions {
  hooks?: Hooks;
  maxIterations?: number;
  throwOnError?: boolean;
}

interface ParserResult {
  root: Node;
  errors: CompileError[];
}


export function lexify(expression: string) {
  const lexs: Token[] = [];

  const { tokens, errors } = tokenize(expression);
  if (errors && errors.length > 0) {
    errors.forEach(error => {
      const { pos } = error;
      lexs.push({ Type: BAD_TOKEN, text: expression[pos], length: 1, pos });
    })
  }

  let start = 0;
  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];
    if (start < token.start) {
      lexs.push({
        Type: WS,
        text: expression.slice(start, token.start),
        length: token.start - start,
        pos: start
      });
    }
    start = token.end;
    let text = expression.slice(token.start, token.end);
    const pos = token.start;
    let length = token.end - token.start;
    let Type = BAD_TOKEN;
    switch (token.type) {
      case TOKEN.Number:
        Type = NUMBER;
        break;
      case TOKEN.String:
        Type = STRING;
        break;
      case TOKEN.Identifier:
        Type = text[0] === "[" ? FIELD : IDENTIFIER;
        break;
      case TOKEN.Operator:
        switch (token.op) {
          case OPERATOR.Comma:
            Type = COMMA;
            break;
          case OPERATOR.OpenParenthesis:
            Type = GROUP;
            break;
          case OPERATOR.CloseParenthesis:
            Type = GROUP_CLOSE;
            break;
          case OPERATOR.Plus:
            Type = ADD;
            break;
          case OPERATOR.Minus:
            Type = SUB;
            break;
          case OPERATOR.Star:
          case OPERATOR.Slash:
            Type = MULDIV_OP;
            break;
          case OPERATOR.Equal:
          case OPERATOR.NotEqual:
            Type = EQUALITY;
            break;
          case OPERATOR.LessThan:
          case OPERATOR.GreaterThan:
          case OPERATOR.LessThanEqual:
          case OPERATOR.GreaterThanEqual:
            Type = COMPARISON;
            break;
          case OPERATOR.Not:
            Type = LOGICAL_NOT;
            break;
          case OPERATOR.And:
            Type = LOGICAL_AND;
            break;
          case OPERATOR.Or:
            Type = LOGICAL_OR;
            break;
          default:
            break;
        }
        break;
    }

    if (Type === IDENTIFIER) {
      const next = tokens[i + 1];
      if (next && next.type === TOKEN.Operator && next.op === OPERATOR.OpenParenthesis) {
        Type = CALL;
        length = next.start - token.start;
        text = expression.slice(token.start, next.start);
        start = next.start;
      }
    }

    lexs.push({ Type, text, length, pos });
  }

  // This simplifies the parser
  lexs.push({ Type: END_OF_INPUT, text: "\n", length: 1, pos: expression.length });

  return lexs.sort((a, b) => a.pos - b.pos);
}


export function parse(tokens: Token[], opts: ParserOptions = {}): ParserResult {
  const { maxIterations = 1000000, hooks = {}, throwOnError = false } = opts;
  const errors: CompileError[] = [];
  let counter = 0;
  let root = createASTNode(null, null, ROOT, counter);
  root.isRoot = true;
  
  let node = root;
  hooks.onCreateNode?.(tokens[0], node);
  for (let index = 0; index < tokens.length && counter < maxIterations; index++) {
    let token = tokens[index];
    hooks.onIteration?.(token, node);

    if (token.Type.skip) {
      hooks.onSkipToken?.(token, node);
      continue;
    }
    if (token.Type === BAD_TOKEN) {
      const err = new CompileError(
        `Unknown token: "${token.text}" at position ${token.pos}`,
        { token },
      );
      hooks.onBadToken?.(token, node, err);
      if (throwOnError) { throw err; }
      errors.push(err);
      // If we don't throw on error, we skip the bad token
      continue;
    }

    if (node.complete) {
      // If a node has received all the children it expects, it's time to figure
      // out whether it needs to be reparented. This is the core of the
      // our solution to the predence issue. By default, we can expect the node
      // to go to its parent but if the next token has a higher precedence (like
      // `*` over `+`), it might take the node instead.
      assert(
        node.parent,
        "Marked a node complete without placing it with a parent",
      );
      
      if (shouldReparent(node.parent.Type, token.Type)) {
        const parent = node.parent;
        node.parent = createASTNode(
          token,
          node.parent,
          getASType(token.Type, node.parent.Type),
          counter,
        );
        hooks.onReparentNode?.(token, node);
      } else {
        index--;
      }

      node = place(node, errors, opts); 
      if (node.children.length === node.Type.expectedChildCount) {
        node.complete = true;
        hooks.onCompleteNode?.(token, node);
      }
    } else if (token.Type.isTerminator) {
      hooks.onTerminatorToken?.(token, node);
      if (node.Type.requiresTerminator === token.Type) {
        node.complete = true;
        hooks.onCompleteNode?.(token, node);
      } else if (node.Type.ignoresTerminator.indexOf(token.Type) === -1) {
        const err = new CompileError(
          `Expected terminator for ${node.Type._name}, found token \`${token.text}\` at position ${token.pos}`,
          { node, token },
        );
        hooks.onUnexpectedTerminator?.(token, node, err);
        if (throwOnError) { throw err; }
        errors.push(err);
        if (token.Type === ASTypes.END_OF_INPUT) {
          if (!node.complete) {
            node.complete = true;
            hooks.onCompleteNode?.(token, node);
            index --;
          }
        }
      }
    } else if (token.Type.leftOperands !== 0) {
      if (token.Type === SUB) {
        node = createASTNode(token, node, NEGATIVE, counter); 
        hooks.onCreateNode?.(token, node);
      } else {
        const err = new CompileError(`Missing children for ${token.Type._name}`, {
          token,
        });
        hooks.onMissinChildren?.(token, node, err);
        if (throwOnError) { throw err; }
        errors.push(err);
      }
    } else {
      node = createASTNode(token, node, getASType(token.Type, node.Type), counter);
      hooks.onCreateNode?.(token, node);
    }
    counter += 1;
  }

  if (counter >= maxIterations) {
    throw new Error("Reached max number of iterations");
  }

  let CTCViolation = ROOT.checkChildConstraints(root);
  if (CTCViolation !== null) {
    const err = new CompileError(
      "Unintelligible Syntax (Child Type Constraint Violation)",
      { node: root, ...CTCViolation },
    );
    hooks.onChildConstraintViolation?.(node, err);
    if (throwOnError) { throw err; }
    errors.push(err);
  }
  return { root, errors };
}

function createASTNode(
  token: Token | null,
  parent: Node | null,
  Type: NodeType,
  counter: number,
): Node {
  return {
    _TYPE: Type._name,
    Type,
    children: [],
    complete: Type.expectedChildCount === 0,
    parent,
    token,
    resolvedType: Type.resolvesAs ? Type.resolvesAs : counter,
  };
}

function place(node: Node, errors: CompileError[], opts: ParserOptions) {
  const {hooks = {}, throwOnError = false} = opts;
  let { Type, parent } = node;

  let CTCViolation = Type.checkChildConstraints(node);
  if (CTCViolation !== null) {
    const err = new CompileError(
      "Child Constraint Violation",
      { node, ...CTCViolation },
    );
    hooks.onChildConstraintViolation?.(node, err);
    if (throwOnError) { throw err; }
    errors.push(err);
  } else if (Type.checkParentConstraints(node)) {
    const err = new CompileError(
      "Parent Constraint Violation",
      { node },
    );
    hooks.onParentConstraintViolation?.(node, err);
    if (throwOnError) { throw err; }
    errors.push(err);
  }
  assert(parent, "Tried to place a node without a parent", node);
  parent.children.push(node);
  hooks.onPlaceNode?.(node, parent);
  return parent;
}

function shouldReparent(leftType: NodeType, rightType: NodeType) {
  if (rightType.leftOperands === 0) {
    return false;

  } else if (rightType.rightAssociative) {
    return rightType.precedence >= leftType.precedence;
  } else {
    return rightType.precedence > leftType.precedence;
  }
}

export function getASType(Type: NodeType, parentType: NodeType) {
  if (Type === GROUP) {
    if (parentType === CALL) {
      return ARG_LIST;
    }
  }
  return Type;
}


import * as ASTypes from "./syntax";
for (let [key, value] of Object.entries(ASTypes)) {
  value._name = key;
}

