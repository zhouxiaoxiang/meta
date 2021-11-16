export interface Token {
  Type: NodeType;
  text: string;
  length: number;
  pos: number;
}

export interface Node {
  // For debugging
  _TYPE?: string;
  alwaysEscapes: boolean;
  Type: NodeType;
  children: Node[];
  complete: boolean;
  dropValue: boolean;
  meta: any | null;
  parent: Node | null;
  runType: string;
  token: Token | null;
  isRoot?: boolean;
}

export interface NodeType {
  // For debugging, since node types are represented with objects
  _name?: string;

  // Should the parser ignore this sort of token entirely (whitespace)
  skip: boolean;

  // Number of operands to expect for this node on the left side
  leftOperands: number;
  // Number of operands to expect for this node on the right side
  rightOperands: number;
  // Maximum number of children before this node is considered complete. May be
  // `Infinity` for nodes lik ARG_LIST, or number of left+right operands
  expectedChildCount: number;
  // Check child constraints
  checkChildConstraints: (
    node: Node,
  ) => { position?: number; child?: Node } | null;
  // Check parent constraints
  checkParentConstraints: (node: Node) => boolean;

  // For open expressions, this is the AST type of tokens that close the expression (e.g. GROUP_CLOSE for GROUP).
  requiresTerminator: NodeType | null;
  // For open expressions, this is a list of AST types that should be considered a "separator" (e.g. COMMA for ARG_LIST).
  ignoresTerminator: NodeType[];
  // Does this token type terminate the current expression (unless exempted by .ignoresTerminator)?
  isTerminator: boolean;

  // The precedence to use for operator parsing conflicts. Higher wins.
  precedence: number;
  // This sets the associativity rule for operators with equal precedence - see the precedence tiers docs below.
  rightAssociative: boolean;
}

type HookFn = (token: Token, node: Node) => void;
type HookErrFn = (token: Token, node: Node, err: CompileError) => void;
type NodeErrFn = (node: Node, err: CompileError) => void;
export interface Hooks {
  onIteration?: HookFn;
  onCreateNode?: HookFn;
  onPlaceNode?: (node: Node, parent: Node) => void;
  onSkipToken?: HookFn;
  onReparentNode?: HookFn;
  onCompleteNode?: HookFn;
  onTerminatorToken?: HookFn;
  onBadToken?: HookErrFn;
  onUnexpectedTerminator?: HookErrFn;
  onMissinChildren?: HookErrFn;
  onParentConstraintViolation?: NodeErrFn;
  onChildConstraintViolation?: NodeErrFn;
}

/*
 * This class helps anything that handles parser errors to use instanceof to
 * easily distinguish between compilation error exceptions and exceptions due to
 * bugs
 */
export class CompileError extends Error {
  type: string;
  data: any;

  constructor(type: string, data: any) {
    super(type + "\n");
    this.type = type;
    this.data = data;
  }
}

export class AssertionError extends Error {
  data?: any;

  constructor(message: string, data?: any) {
    super(`Assertion failed: ${message}`);
    this.data = data;
  }
}

export function assert(
  condition: any,
  msg: string,
  data?: any,
): asserts condition {
  // TODO: Check for NODE_ENV so this can be compiled out completely in prod
  if (!condition) {
    throw new AssertionError(msg, data || {});
  }
}
