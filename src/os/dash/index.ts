// Dash - A lightweight scripting and terminal language

export { parse, tokenize, ParseError } from "./parser"
export type {
  ASTNode,
  ProgramNode,
  StatementNode,
  ExpressionNode,
  VarDeclNode,
  IfNode,
  ForNode,
  WhileNode,
  LabelNode,
  GotoNode,
  ExitNode,
  BreakNode,
  ContinueNode,
  CommandNode,
  CommentNode,
  BinaryExprNode,
  UnaryExprNode,
  NumberLiteralNode,
  StringLiteralNode,
  BooleanLiteralNode,
  NullLiteralNode,
  IdentifierNode,
  GroupExprNode,
} from "./parser"

export { Interpreter, createInterpreter, RuntimeError } from "./interpreter"
export type { DashValue, CommandHandler, ExecutionContext } from "./interpreter"
