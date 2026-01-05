export type ASTNode =
  | ProgramNode
  | VarDeclNode
  | IfNode
  | ForNode
  | WhileNode
  | LabelNode
  | GotoNode
  | ExitNode
  | BreakNode
  | ContinueNode
  | CommandNode
  | CommentNode
  | ExpressionNode

export type ExpressionNode =
  | BinaryExprNode
  | UnaryExprNode
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | NullLiteralNode
  | IdentifierNode
  | GroupExprNode

export interface ProgramNode {
  type: "Program"
  body: StatementNode[]
}

export type StatementNode =
  | VarDeclNode
  | IfNode
  | ForNode
  | WhileNode
  | LabelNode
  | GotoNode
  | ExitNode
  | BreakNode
  | ContinueNode
  | CommandNode
  | CommentNode

export interface VarDeclNode {
  type: "VarDecl"
  name: string
  value: ExpressionNode
  line: number
}

export interface IfNode {
  type: "If"
  condition: ExpressionNode
  body: StatementNode[]
  elseIfs: { condition: ExpressionNode; body: StatementNode[] }[]
  elseBody: StatementNode[] | null
  line: number
}

export interface ForNode {
  type: "For"
  variable: string
  start: ExpressionNode
  end: ExpressionNode
  body: StatementNode[]
  line: number
}

export interface WhileNode {
  type: "While"
  condition: ExpressionNode
  body: StatementNode[]
  line: number
}

export interface LabelNode {
  type: "Label"
  name: string
  line: number
}

export interface GotoNode {
  type: "Goto"
  label: string
  line: number
}

export interface ExitNode {
  type: "Exit"
  code: ExpressionNode | null
  line: number
}

export interface BreakNode {
  type: "Break"
  line: number
}

export interface ContinueNode {
  type: "Continue"
  line: number
}

export interface CommandNode {
  type: "Command"
  name: string
  args: string
  line: number
}

export interface CommentNode {
  type: "Comment"
  text: string
  line: number
}

export interface BinaryExprNode {
  type: "BinaryExpr"
  operator: string
  left: ExpressionNode
  right: ExpressionNode
}

export interface UnaryExprNode {
  type: "UnaryExpr"
  operator: string
  operand: ExpressionNode
}

export interface NumberLiteralNode {
  type: "NumberLiteral"
  value: number
}

export interface StringLiteralNode {
  type: "StringLiteral"
  value: string
}

export interface BooleanLiteralNode {
  type: "BooleanLiteral"
  value: boolean
}

export interface NullLiteralNode {
  type: "NullLiteral"
}

export interface IdentifierNode {
  type: "Identifier"
  name: string
}

export interface GroupExprNode {
  type: "GroupExpr"
  expression: ExpressionNode
}

type TokenType =
  | "KEYWORD"
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "OPERATOR"
  | "LPAREN"
  | "RPAREN"
  | "EQUALS"
  | "NEWLINE"
  | "EOF"
  | "COMMENT"

interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

const KEYWORDS = [
  "var",
  "if",
  "else",
  "for",
  "while",
  "end",
  "label",
  "goto",
  "exit",
  "break",
  "continue",
  "in",
  "to",
  "true",
  "false",
  "null",
]
const OPERATORS = ["||", "&&", "==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%", "!"]

class Lexer {
  private input: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private tokens: Token[] = []

  constructor(input: string) {
    this.input = input
  }

  tokenize(): Token[] {
    while (this.pos < this.input.length) {
      this.scanToken()
    }

    this.tokens.push({ type: "EOF", value: "", line: this.line, column: this.column })
    return this.tokens
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] ?? ""
  }

  private advance(): string {
    const char = this.input[this.pos++]
    if (char === "\n") {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
    return char
  }

  private scanToken(): void {
    // Skip whitespace (spaces and tabs are purely cosmetic)
    while (this.peek() === " " || this.peek() === "\t") {
      this.advance()
    }

    if (this.pos >= this.input.length) return

    const char = this.peek()

    // Newline
    if (char === "\n" || char === "\r") {
      if (char === "\r" && this.peek(1) === "\n") {
        this.advance()
      }
      this.advance()
      // Only emit newline if last token wasn't a newline
      if (this.tokens.length === 0 || this.tokens[this.tokens.length - 1].type !== "NEWLINE") {
        this.tokens.push({ type: "NEWLINE", value: "\n", line: this.line - 1, column: this.column })
      }
      return
    }

    // Comment
    if (char === "#") {
      this.scanComment()
      return
    }

    // String
    if (char === '"' || char === "'") {
      this.scanString(char)
      return
    }

    // Number
    if (this.isDigit(char) || (char === "-" && this.isDigit(this.peek(1)))) {
      this.scanNumber()
      return
    }

    // Operators (multi-char first)
    for (const op of OPERATORS) {
      if (this.input.slice(this.pos, this.pos + op.length) === op) {
        const token: Token = { type: "OPERATOR", value: op, line: this.line, column: this.column }
        for (let i = 0; i < op.length; i++) this.advance()
        this.tokens.push(token)
        return
      }
    }

    // Parentheses
    if (char === "(") {
      this.tokens.push({ type: "LPAREN", value: "(", line: this.line, column: this.column })
      this.advance()
      return
    }
    if (char === ")") {
      this.tokens.push({ type: "RPAREN", value: ")", line: this.line, column: this.column })
      this.advance()
      return
    }

    // Equals
    if (char === "=") {
      this.tokens.push({ type: "EQUALS", value: "=", line: this.line, column: this.column })
      this.advance()
      return
    }

    // Identifier or keyword
    if (this.isIdentifierStart(char)) {
      this.scanIdentifier()
      return
    }

    // Unknown character - skip it
    this.advance()
  }

  private scanComment(): void {
    const startColumn = this.column
    const startLine = this.line
    this.advance() // skip #
    let text = ""
    while (this.peek() && this.peek() !== "\n" && this.peek() !== "\r") {
      text += this.advance()
    }
    this.tokens.push({ type: "COMMENT", value: text.trim(), line: startLine, column: startColumn })
  }

  private scanString(quote: string): void {
    const startColumn = this.column
    const startLine = this.line
    this.advance() // skip opening quote
    let value = ""
    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === "\\") {
        this.advance()
        const escaped = this.advance()
        switch (escaped) {
          case "n":
            value += "\n"
            break
          case "t":
            value += "\t"
            break
          case "r":
            value += "\r"
            break
          case "\\":
            value += "\\"
            break
          case "$":
            value += "$"
            break
          case '"':
            value += '"'
            break
          case "'":
            value += "'"
            break
          default:
            value += escaped
        }
      } else if (this.peek() === "\n" || this.peek() === "\r") {
        break // Unterminated string
      } else {
        value += this.advance()
      }
    }
    if (this.peek() === quote) {
      this.advance() // skip closing quote
    }
    this.tokens.push({ type: "STRING", value, line: startLine, column: startColumn })
  }

  private scanNumber(): void {
    const startColumn = this.column
    const startLine = this.line
    let value = ""
    if (this.peek() === "-") {
      value += this.advance()
    }
    while (this.isDigit(this.peek())) {
      value += this.advance()
    }
    if (this.peek() === "." && this.isDigit(this.peek(1))) {
      value += this.advance() // decimal point
      while (this.isDigit(this.peek())) {
        value += this.advance()
      }
    }
    this.tokens.push({ type: "NUMBER", value, line: startLine, column: startColumn })
  }

  private scanIdentifier(): void {
    const startColumn = this.column
    const startLine = this.line
    let value = ""
    while (this.isIdentifierChar(this.peek())) {
      value += this.advance()
    }
    const type: TokenType = KEYWORDS.includes(value) ? "KEYWORD" : "IDENTIFIER"
    this.tokens.push({ type, value, line: startLine, column: startColumn })
  }

  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9"
  }

  private isIdentifierStart(char: string): boolean {
    return (
      (char >= "a" && char <= "z") ||
      (char >= "A" && char <= "Z") ||
      char === "_" ||
      char === "$" ||
      char === "&" ||
      char === "-" ||
      char === "#"
    )
  }

  private isIdentifierChar(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char)
  }
}

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
  ) {
    super(`Parse error at line ${line}, column ${column}: ${message}`)
    this.name = "ParseError"
  }
}

class Parser {
  private tokens: Token[]
  private pos: number = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): ProgramNode {
    const body: StatementNode[] = []

    while (!this.isAtEnd()) {
      // Skip newlines at top level
      while (this.check("NEWLINE")) {
        this.advance()
      }
      if (this.isAtEnd()) break

      const stmt = this.parseStatement()
      if (stmt) {
        body.push(stmt)
      }
    }

    return { type: "Program", body }
  }

  private parseStatement(): StatementNode | null {
    // Skip comments as standalone statements
    if (this.check("COMMENT")) {
      const token = this.advance()
      return { type: "Comment", text: token.value, line: token.line }
    }

    // Skip newlines
    while (this.check("NEWLINE")) {
      this.advance()
    }

    if (this.isAtEnd()) return null

    const token = this.peek()

    if (token.type === "KEYWORD") {
      switch (token.value) {
        case "var":
          return this.parseVarDecl()
        case "if":
          return this.parseIf()
        case "for":
          return this.parseFor()
        case "while":
          return this.parseWhile()
        case "label":
          return this.parseLabel()
        case "goto":
          return this.parseGoto()
        case "exit":
          return this.parseExit()
        case "break":
          return this.parseBreak()
        case "continue":
          return this.parseContinue()
      }
    }

    // Must be a command
    if (token.type === "IDENTIFIER" || token.type === "KEYWORD") {
      return this.parseCommand()
    }

    // Skip unknown tokens
    this.advance()
    return null
  }

  private parseVarDecl(): VarDeclNode {
    const varToken = this.expect("KEYWORD", "var")
    const nameToken = this.expect("IDENTIFIER")
    this.expect("EQUALS")
    const value = this.parseExpression()
    this.consumeNewline()

    return {
      type: "VarDecl",
      name: nameToken.value,
      value,
      line: varToken.line,
    }
  }

  private parseIf(): IfNode {
    const ifToken = this.expect("KEYWORD", "if")
    const condition = this.parseExpression()
    this.consumeNewline()

    const body = this.parseBlock()
    const elseIfs: { condition: ExpressionNode; body: StatementNode[] }[] = []
    let elseBody: StatementNode[] | null = null

    // Parse else if / else
    while (this.checkKeyword("else")) {
      this.advance() // consume 'else'

      if (this.checkKeyword("if")) {
        this.advance() // consume 'if'
        const elseIfCondition = this.parseExpression()
        this.consumeNewline()
        const elseIfBody = this.parseBlock()
        elseIfs.push({ condition: elseIfCondition, body: elseIfBody })
      } else {
        this.consumeNewline()
        elseBody = this.parseBlock()
        break
      }
    }

    // Consume 'end' keyword if present
    if (this.checkKeyword("end")) {
      this.advance()
      this.consumeNewline()
    }

    return {
      type: "If",
      condition,
      body,
      elseIfs,
      elseBody,
      line: ifToken.line,
    }
  }

  private parseFor(): ForNode {
    const forToken = this.expect("KEYWORD", "for")
    const varToken = this.expect("IDENTIFIER")
    this.expect("KEYWORD", "in")
    const start = this.parseExpression()
    this.expect("KEYWORD", "to")
    const end = this.parseExpression()
    this.consumeNewline()

    const body = this.parseBlock()

    // Consume 'end' keyword if present
    if (this.checkKeyword("end")) {
      this.advance()
      this.consumeNewline()
    }

    return {
      type: "For",
      variable: varToken.value,
      start,
      end,
      body,
      line: forToken.line,
    }
  }

  private parseWhile(): WhileNode {
    const whileToken = this.expect("KEYWORD", "while")
    const condition = this.parseExpression()
    this.consumeNewline()

    const body = this.parseBlock()

    // Consume 'end' keyword
    if (this.checkKeyword("end")) {
      this.advance()
      this.consumeNewline()
    }

    return {
      type: "While",
      condition,
      body,
      line: whileToken.line,
    }
  }

  private parseLabel(): LabelNode {
    const labelToken = this.expect("KEYWORD", "label")
    const nameToken = this.expect("IDENTIFIER")
    this.consumeNewline()

    return {
      type: "Label",
      name: nameToken.value,
      line: labelToken.line,
    }
  }

  private parseGoto(): GotoNode {
    const gotoToken = this.expect("KEYWORD", "goto")
    const labelToken = this.expect("IDENTIFIER")
    this.consumeNewline()

    return {
      type: "Goto",
      label: labelToken.value,
      line: gotoToken.line,
    }
  }

  private parseExit(): ExitNode {
    const exitToken = this.expect("KEYWORD", "exit")
    let code: ExpressionNode | null = null

    if (!this.check("NEWLINE") && !this.check("EOF")) {
      code = this.parseExpression()
    }
    this.consumeNewline()

    return {
      type: "Exit",
      code,
      line: exitToken.line,
    }
  }

  private parseBreak(): BreakNode {
    const breakToken = this.expect("KEYWORD", "break")
    this.consumeNewline()
    return { type: "Break", line: breakToken.line }
  }

  private parseContinue(): ContinueNode {
    const continueToken = this.expect("KEYWORD", "continue")
    this.consumeNewline()
    return { type: "Continue", line: continueToken.line }
  }

  private parseCommand(): CommandNode {
    const nameToken = this.advance()
    let args = ""

    // Collect rest of line as arguments
    while (!this.check("NEWLINE") && !this.check("EOF") && !this.check("COMMENT")) {
      const token = this.advance()
      if (token.type === "STRING") {
        args += token.value
      } else {
        args += token.value
      }
      // Add space between tokens
      if (!this.check("NEWLINE") && !this.check("EOF") && !this.check("COMMENT")) {
        args += " "
      }
    }

    // Handle inline comment
    if (this.check("COMMENT")) {
      this.advance()
    }

    this.consumeNewline()

    return {
      type: "Command",
      name: nameToken.value,
      args: args.trim(),
      line: nameToken.line,
    }
  }

  private parseBlock(): StatementNode[] {
    const statements: StatementNode[] = []

    // Collect statements until we hit 'end', 'else', or EOF
    while (!this.checkKeyword("end") && !this.checkKeyword("else") && !this.isAtEnd()) {
      // Skip newlines
      while (this.check("NEWLINE")) {
        this.advance()
      }
      if (this.checkKeyword("end") || this.checkKeyword("else") || this.isAtEnd()) break

      const stmt = this.parseStatement()
      if (stmt) {
        statements.push(stmt)
      }
    }

    return statements
  }

  private parseExpression(): ExpressionNode {
    return this.parseOr()
  }

  private parseOr(): ExpressionNode {
    let left = this.parseAnd()

    while (this.checkOperator("||")) {
      const op = this.advance().value
      const right = this.parseAnd()
      left = { type: "BinaryExpr", operator: op, left, right }
    }

    return left
  }

  private parseAnd(): ExpressionNode {
    let left = this.parseEquality()

    while (this.checkOperator("&&")) {
      const op = this.advance().value
      const right = this.parseEquality()
      left = { type: "BinaryExpr", operator: op, left, right }
    }

    return left
  }

  private parseEquality(): ExpressionNode {
    let left = this.parseRelational()

    while (this.checkOperator("==") || this.checkOperator("!=")) {
      const op = this.advance().value
      const right = this.parseRelational()
      left = { type: "BinaryExpr", operator: op, left, right }
    }

    return left
  }

  private parseRelational(): ExpressionNode {
    let left = this.parseAdditive()

    while (this.checkOperator("<") || this.checkOperator(">") || this.checkOperator("<=") || this.checkOperator(">=")) {
      const op = this.advance().value
      const right = this.parseAdditive()
      left = { type: "BinaryExpr", operator: op, left, right }
    }

    return left
  }

  private parseAdditive(): ExpressionNode {
    let left = this.parseMultiplicative()

    while (this.checkOperator("+") || this.checkOperator("-")) {
      const op = this.advance().value
      const right = this.parseMultiplicative()
      left = { type: "BinaryExpr", operator: op, left, right }
    }

    return left
  }

  private parseMultiplicative(): ExpressionNode {
    let left = this.parseUnary()

    while (this.checkOperator("*") || this.checkOperator("/") || this.checkOperator("%")) {
      const op = this.advance().value
      const right = this.parseUnary()
      left = { type: "BinaryExpr", operator: op, left, right }
    }

    return left
  }

  private parseUnary(): ExpressionNode {
    if (this.checkOperator("!")) {
      const op = this.advance().value
      const operand = this.parseUnary()
      return { type: "UnaryExpr", operator: op, operand }
    }

    return this.parsePrimary()
  }

  private parsePrimary(): ExpressionNode {
    const token = this.peek()

    // Number
    if (token.type === "NUMBER") {
      this.advance()
      return { type: "NumberLiteral", value: parseFloat(token.value) }
    }

    // String
    if (token.type === "STRING") {
      this.advance()
      return { type: "StringLiteral", value: token.value }
    }

    // Boolean
    if (token.type === "KEYWORD" && (token.value === "true" || token.value === "false")) {
      this.advance()
      return { type: "BooleanLiteral", value: token.value === "true" }
    }

    // Null
    if (token.type === "KEYWORD" && token.value === "null") {
      this.advance()
      return { type: "NullLiteral" }
    }

    // Grouped expression
    if (token.type === "LPAREN") {
      this.advance() // consume (
      const expr = this.parseExpression()
      this.expect("RPAREN")
      return { type: "GroupExpr", expression: expr }
    }

    // Identifier
    if (token.type === "IDENTIFIER") {
      this.advance()
      return { type: "Identifier", name: token.value }
    }

    throw new ParseError(`Unexpected token: ${token.value}`, token.line, token.column)
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: "EOF", value: "", line: 0, column: 0 }
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      return this.tokens[this.pos++]
    }
    return this.peek()
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type
  }

  private checkKeyword(value: string): boolean {
    const token = this.peek()
    return token.type === "KEYWORD" && token.value === value
  }

  private checkOperator(value: string): boolean {
    const token = this.peek()
    return token.type === "OPERATOR" && token.value === value
  }

  private expect(type: TokenType, value?: string): Token {
    const token = this.peek()
    if (token.type !== type || (value !== undefined && token.value !== value)) {
      throw new ParseError(
        `Expected ${type}${value ? ` '${value}'` : ""}, got ${token.type} '${token.value}'`,
        token.line,
        token.column,
      )
    }
    return this.advance()
  }

  private consumeNewline(): void {
    while (this.check("NEWLINE")) {
      this.advance()
    }
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF"
  }
}

export function parse(input: string): ProgramNode {
  const lexer = new Lexer(input)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens)
  return parser.parse()
}

export function tokenize(input: string): Token[] {
  const lexer = new Lexer(input)
  return lexer.tokenize()
}
