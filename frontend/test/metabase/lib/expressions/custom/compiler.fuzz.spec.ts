import { lexify, parse } from "metabase/lib/expressions/custom/parser";
import { compile } from "metabase/lib/expressions/custom/compiler";
import { compile as oldCompile } from "metabase/lib/expressions/compile";
import { generateExpression } from "./valid_generator";

function newCompiler(source: string) {
  return compile(
    parse(lexify(source), {
      throwOnError: true,
    }).root,
  );
}
function mockResolve(kind: any, name: any) {
  return [kind, name];
}
function compileSource(source: string) {
  let mbql = null;
  try {
    mbql = oldCompile({
      source,
      startRule: "expression",
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
  return renameSegments(mbql);
}

const renameSegments = (expr: any): any => {
  if (expr === "segment") {
    return "dimension";
  }
  if (Array.isArray(expr)) {
    return expr.map(renameSegments);
  }
  return expr;
};

if (process.env.MB_FUZZ) {
  describe("FUZZ metabase/lib/expressions/compiler", () => {
    const MAX_SEED = 60000;
    for (let seed = 10000; seed < MAX_SEED; ++seed) {
      const { expression } = generateExpression(seed);
      let expected: any;
      try {
        expected = compileSource(expression);
      } catch (err) {
        xit(`should handle generated expression from seed ${seed}: ${expression}`, () => {});
        continue;
      }
      it(`should handle generated expression from seed ${seed}: ${expression}`, () => {
        expect(newCompiler(expression)).toEqual(expected);
      });
    }
  });
}
