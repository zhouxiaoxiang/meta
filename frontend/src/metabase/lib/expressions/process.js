import Dimension from "metabase-lib/lib/Dimension";

import { parse, lexify } from "./custom/parser";
import { DEFAULT_PASSES, resolverPass } from "./custom/compiler_passes";
import { compile } from "./custom/compiler";
import { getMBQLName } from "./config";
import { parseMetric, parseSegment, parseDimension } from "./index";

// combine compile/suggest/syntax so we only need to parse once
export function processSource(options) {
  // Lazily load all these parser-related stuff, because parser construction is expensive
  // https://github.com/metabase/metabase/issues/13472

  const { source, startRule, query } = options;

  let expression;
  let compileError;

  const tokens = lexify(source);

  // PARSE
  const { root, errors } = parse(tokens, {
    throwOnError: false,
    ...options,
  });

  function resolveMBQLField(kind, name) {
    if (!query) {
      return [kind, name];
    }
    if (kind === "metric") {
      const metric = parseMetric(name, options);
      if (!metric) {
        throw new Error(`Unknown Metric: ${name}`);
      }
      return ["metric", metric.id];
    } else if (kind === "segment") {
      const segment = parseSegment(name, options);
      if (!segment) {
        throw new Error(`Unknown Segment: ${name}`);
      }
      return ["segment", segment.id];
    } else {
      // fallback
      const dimension = parseDimension(name, options);
      if (!dimension) {
        throw new Error(`Unknown Field: ${name}`);
      }
      const [_, ...field] = dimension.mbql();
      return ["dimension", ...field];
    }
  }

  // COMPILE
  if (errors.length > 0) {
    compileError = errors;
  } else {
    try {
      expression = compile(root, {
        passes: [...DEFAULT_PASSES, resolverPass(startRule)],
        getMBQLName,
        resolve: resolveMBQLField,
      });
    } catch (e) {
      console.warn("compile error", e);
      compileError = e;
    }
  }

  return {
    source,
    expression,
    compileError,
  };
}
