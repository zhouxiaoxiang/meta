import * as fs from "fs";

// Simple Fast Counter - as recommended by PRACTRAND
const sfc32 = (a: number, b: number, c: number, d: number) => {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
};

const NODE = {
  Literal: 1 as const,
  Field: 2 as const,
  Unary: 3 as const,
  Binary: 4 as const,
  FunctionCall: 5 as const,
  Group: 6 as const,
};

type Node =
  | LiteralNode
  | FieldNode
  | UnaryNode
  | BinaryNode
  | FnNode
  | GroupNode;

interface LiteralNode {
  type: typeof NODE["Literal"];
  value: string;
}

interface FieldNode {
  type: typeof NODE["Field"];
  value: string;
}

interface UnaryNode {
  type: typeof NODE["Unary"];
  op: string;
  child: Node;
}

interface BinaryNode {
  type: typeof NODE["Binary"];
  op: string;
  left: Node;
  right: Node;
}

interface FnNode {
  type: typeof NODE["FunctionCall"];
  value: string;
  params: Node[];
}

interface GroupNode {
  type: typeof NODE["Group"];
  child: Node;
}

export function generateExpression(
  seed: number,
): { tree: Node; expression: string } {
  const u32seed = seed ^ 0xc0fefe;
  const mathRandom = sfc32(0x9e3779b9, 0x243f6a88, 0xb7e15162, u32seed);
  [...Array(15)].forEach(mathRandom);

  const randomInt = (max: number) => Math.floor(max * mathRandom());
  const randomItem = <T>(items: T[]) => items[randomInt(items.length)];
  const oneOf = (functions: Function[]) => () =>
    randomItem(functions).apply(null, []);
  const listOf = (n: number, functions: Function[]) => () =>
    [...Array(n)].map(_ => oneOf(functions)());

  const zero = () => 0;
  const one = () => 1;
  const integer = () => randomInt(1e6);
  const float1 = () => String(integer()) + ".";
  const float2 = () => float1() + String(integer());

  const uppercase = () => String.fromCharCode(65 + randomInt(26)); // A..Z
  const lowercase = () => String.fromCharCode(97 + randomInt(26)); // a..z
  const digit = () => String.fromCharCode(48 + randomInt(10)); // 0..9
  const underscore = () => "_";
  const space = () => " "; // FIXME: more whitespace family

  const characters = () => {
    // FIXME: include double-quote and escape it
    // FIXME: add more punctuations
    const charset = [uppercase, lowercase, digit, underscore, space];
    const len = randomInt(9);
    const start = oneOf(charset)();
    const part = listOf(len, charset)();
    return [start, ...part].join("");
  };

  const literal = () => {
    const exp = () => randomItem(["", "-", "+"]) + randomInt(1e2);
    const number = () => oneOf([zero, one, integer, float1, float2])();
    const sci = () => number() + randomItem(["e", "E"]) + exp();
    const string = () => '"' + characters() + '"';
    return {
      type: NODE.Literal,
      value: oneOf([number, sci, string])(),
    };
  };

  const identifier = (): string => {
    const len = randomInt(7);
    const start = oneOf([uppercase, lowercase, underscore])();
    const part = listOf(len, [uppercase, lowercase, underscore, digit])();
    return [start, ...part].join("");
  };

  const field = (): FieldNode => {
    const fk = () => "[" + identifier() + " → " + identifier() + "]";
    const bracketedName = () => "[" + identifier() + "]";
    const name = oneOf([identifier, fk, bracketedName])();
    return {
      type: NODE.Field,
      value: name,
    };
  };

  const unary = (): UnaryNode => {
    return {
      type: NODE.Unary,
      op: randomItem(["-", "NOT"]),
      child: expression(),
    };
  };

  const binary = (): BinaryNode => {
    return {
      type: NODE.Binary,
      op: randomItem([
        "+",
        "-",
        "*",
        "/",
        "=",
        "!=",
        "<",
        ">",
        "<=",
        ">=",
        "AND",
        "OR",
      ]),
      left: expression(),
      right: expression(),
    };
  };

  const call = (): FnNode => {
    const count = randomInt(5);
    return {
      type: NODE.FunctionCall,
      value: identifier(),
      params: listOf(count, [expression])(),
    };
  };

  const group = (): GroupNode => {
    return {
      type: NODE.Group,
      child: primary(),
    };
  };

  const primary = (): Node => {
    --depth;
    const node = oneOf([field, literal, unary, binary, call, group])();
    ++depth;
    return node;
  };
  const expression = (): Node => (depth <= 0 ? literal() : primary());

  const format = (node: Node): string => {
    const spaces = () => listOf(1, [space, () => ""])().join("");
    const blank = (ch: string) => spaces() + ch + spaces();
    let str = null;
    const { type } = node;
    switch (type) {
      case NODE.Field:
      case NODE.Literal:
        str = node.value;
        break;
      case NODE.Unary:
        str = blank(node.op) + " " + format(node.child);
        break;
      case NODE.Binary:
        str = format(node.left) + blank(node.op) + format(node.right);
        break;
      case NODE.FunctionCall:
        str =
          node.value +
          blank("(") +
          node.params.map(format).join(", ") +
          blank(")");
        break;
      case NODE.Group:
        str = blank("(") + format(node.child) + blank(")");
        break;
    }

    if (str === null) {
      throw new Error(`Unknown AST node ${type}`);
    }
    return str;
  };

  let depth = 17;

  const tree = expression();
  return { tree, expression: format(tree) };
}

export const generateCases = (
  numCases: number = 100,
  multiplier: number = 1000000,
): { seed: number; expr: string }[] => {
  var lines = [];
  for (var i = 0; i < numCases; i++) {
    var seed = Math.floor(Math.random() * multiplier);
    lines.push({ seed: seed, expr: generateExpression(seed).expression });
  }
  return lines;
};

export const generateCasesFile = (
  path: string,
  numCases: number = 100,
  multiplier: number = 1000000,
) => {
  const cases = generateCases(numCases, multiplier);
  fs.writeFileSync(path, JSON.stringify(cases, null, 2), {
    encoding: "utf8",
  });
};
