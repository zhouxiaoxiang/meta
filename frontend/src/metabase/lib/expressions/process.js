// combine compile/suggest/syntax so we only need to parse once
export function processSource(options) {
  // Lazily load all these parser-related stuff, because parser construction is expensive
  // https://github.com/metabase/metabase/issues/13472
  const { parse, lexify } = require("./custom/parser");
  const { DEFAULT_PASSES, resolverPass } = require("./custom/compiler_passes");
  const compile = require("./custom/compiler").compile;
  const getMBQLName = require("./config").getMBQLName;

  const { source, startRule } = options;

  let expression;
  let compileError;

  const tokens = lexify(source);

  // PARSE
  const { root, errors } = parse(tokens, {
    throwOnError: false,
    ...options,
  });

  // COMPILE
  if (errors.length > 0) {
    compileError = errors;
  } else {
    try {
      expression = compile(root, {
        passes: [...DEFAULT_PASSES, resolverPass(startRule)],
        getMBQLName,
        resolve: (kind, name) => ["dimension", name],
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
