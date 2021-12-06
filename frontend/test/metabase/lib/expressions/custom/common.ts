import { resolve } from "metabase/lib/expressions/resolver";
import { getMBQLName } from "metabase/lib/expressions/config";
import { generateExpression } from "../generator";
import { lexify, parse } from "metabase/lib/expressions/custom/parser";
import { compile as oldCompile } from "metabase/lib/expressions/compile";
import {
  compile as newCompile,
  Expr,
} from "metabase/lib/expressions/custom/compiler";
import {
  DEFAULT_PASSES as passes,
  resolverPass,
} from "metabase/lib/expressions/custom/compiler_passes";

type Type = "expression" | "boolean";

interface Opts {
  throwOnError?: boolean;
  resolverPass?: boolean;
}

export function compile(source: string, type: Type, opts: Opts = {}) {
  const { throwOnError } = opts;
  return newCompile(
    parse(lexify(source), {
      throwOnError,
    }).root,
    {
      passes: opts.resolverPass
        ? [...passes, resolverPass("expression")]
        : passes,
      getMBQLName,
      resolve: (kind, name) => ["dimension", name],
    },
  );
}

export function mockResolve(kind: any, name: string): Expr {
  return ["dimension", name];
}

export function oracle(source: string, type: Type) {
  let mbql = null;
  try {
    mbql = oldCompile({
      source,
      startRule: type,
      resolve: mockResolve,
    } as any);
  } catch (e) {
    let err = e as any;
    if (err.length && err.length > 0) {
      err = err[0];
      if (typeof err.message === "string") {
        err = err.message;
      }
    }
    throw err;
  }
  return resolve(mbql, type);
}

export function compare(
  source: string,
  type: Type,
  opts: Opts = {},
): { oracle: any; compiled: any } {
  const _oracle = oracle(source, type);
  const compiled = compile(source, type, opts);
  return { oracle: _oracle, compiled };
}

export function compareSeed(
  seed: number,
  type: Type,
  opts: Opts = {},
): { oracle: any; compiled: any } {
  const { expression } = generateExpression(seed, type);
  const _oracle = oracle(expression, type);
  const compiled = compile(expression, type, opts);
  return { oracle: _oracle, compiled };
}
