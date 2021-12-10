import { resolve } from "../resolver";
import { OPERATOR as OP } from "../tokenizer";
import { Expr } from "./compiler";

export type CompilerPass = (expr: Expr) => Expr;

const modify = (node: any, transform: (node: any) => any): Expr => {
  if (Array.isArray(node)) {
    const [operator, ...operands] = node;
    return transform([
      operator,
      ...operands.map(sub => modify(sub, transform)),
    ]);
  }
  return transform(node);
};

const NEGATIVE_FILTER_SHORTHANDS = {
  contains: "does-not-contain",
  "is-null": "not-null",
  "is-empty": "not-empty",
};

// ["NOT", ["is-null", 42]] becomes ["not-null",42]
export const useShorthands: CompilerPass = (tree: Expr): Expr =>
  modify(tree, node => {
    if (Array.isArray(node) && node.length === 2) {
      const [operator, operand] = node;
      if (operator === OP.Not && Array.isArray(operand)) {
        const [fn, ...params] = operand;
        const shorthand = (NEGATIVE_FILTER_SHORTHANDS as any)[fn];
        if (shorthand) {
          return [shorthand, ...params];
        }
      }
    }
    return node;
  });

export const adjustCaseExpression: CompilerPass = (tree: Expr): Expr =>
  modify(tree, (node: any) => {
    if (Array.isArray(node)) {
      const [operator, ...operands] = node;
      if (operator === "case") {
        const pairs = [];
        const pairCount = operands.length >> 1;
        for (let i = 0; i < pairCount; ++i) {
          const tst = operands[i * 2];
          const val = operands[i * 2 + 1];
          pairs.push([tst, val]);
        }
        if (operands.length > 2 * pairCount) {
          const defVal = operands[operands.length - 1];
          return [operator, pairs, { default: defVal }];
        }
        return [operator, pairs];
      }
    }
    return node;
  });

export const resolverPass: (
  type: "expression" | "boolean",
  resolveFn?: any,
) => CompilerPass = (type, resolveFn) => expr => resolve(expr, type, resolveFn);

export const DEFAULT_PASSES = [useShorthands, adjustCaseExpression];
