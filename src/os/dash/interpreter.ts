// ============================================================================
// Dash Language Interpreter
// ============================================================================

import {
  parse,
  type ProgramNode,
  type StatementNode,
  type ExpressionNode,
  type VarDeclNode,
  type IfNode,
  type ForNode,
  type WhileNode,
  type LabelNode,
  type GotoNode,
  type ExitNode,
  type CommandNode,
  ParseError,
} from "./parser"

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type DashValue = string | number | boolean | null

export type CommandHandler = (args: string, context: ExecutionContext) => DashValue | void | Promise<DashValue | void>

export interface ExecutionContext {
  /** Print output to terminal */
  print: (text: string) => void
  /** Print output with newline */
  println: (text: string) => void
  /** Print error */
  error: (text: string) => void
  /** Clear terminal */
  clear: () => void
  /** Read input from user (for future use) */
  input?: () => Promise<string>
  /** Get current variables */
  getVariables: () => Map<string, DashValue>
  /** Set a variable */
  setVariable: (name: string, value: DashValue) => void
  /** Signal to stop execution */
  stop: () => void
  /** Check if stopped */
  isStopped: () => boolean
}

export class RuntimeError extends Error {
  constructor(
    message: string,
    public line: number,
  ) {
    super(`Runtime error at line ${line}: ${message}`)
    this.name = "RuntimeError"
  }
}

// Control flow signals
class BreakSignal extends Error {
  constructor() {
    super("break")
    this.name = "BreakSignal"
  }
}

class ContinueSignal extends Error {
  constructor() {
    super("continue")
    this.name = "ContinueSignal"
  }
}

class ExitSignal extends Error {
  constructor(public code: number) {
    super(`exit ${code}`)
    this.name = "ExitSignal"
  }
}

class GotoSignal extends Error {
  constructor(public label: string) {
    super(`goto ${label}`)
    this.name = "GotoSignal"
  }
}

// ----------------------------------------------------------------------------
// Interpreter
// ----------------------------------------------------------------------------

export class Interpreter {
  private variables: Map<string, DashValue> = new Map()
  private commands: Map<string, CommandHandler> = new Map()
  private labels: Map<string, number> = new Map()
  private lastExitCode: number = 0
  private stopped: boolean = false

  constructor() {
    this.registerBuiltinCommands()
  }

  // --------------------------------------------------------------------------
  // Command Registration
  // --------------------------------------------------------------------------

  registerCommand(name: string, handler: CommandHandler): void {
    this.commands.set(name.toLowerCase(), handler)
  }

  unregisterCommand(name: string): void {
    this.commands.delete(name.toLowerCase())
  }

  private registerBuiltinCommands(): void {
    // echo - print text
    this.registerCommand("echo", (args, ctx) => {
      ctx.println(this.interpolateVariables(args))
    })

    // print - print without newline
    this.registerCommand("print", (args, ctx) => {
      ctx.print(this.interpolateVariables(args))
    })

    // clear - clear screen
    this.registerCommand("clear", (_args, ctx) => {
      ctx.clear()
    })

    // date - show current date
    this.registerCommand("date", (_args, ctx) => {
      ctx.println(new Date().toLocaleString())
    })

    // whoami - show current user
    this.registerCommand("whoami", (_args, ctx) => {
      ctx.println("guest")
    })

    // help - show help
    this.registerCommand("help", (_args, ctx) => {
      ctx.println("Dash Shell - Available commands:")
      ctx.println("")
      ctx.println("  help     - Show this help message")
      ctx.println("  echo     - Print text to output")
      ctx.println("  print    - Print text without newline")
      ctx.println("  clear    - Clear the terminal")
      ctx.println("  date     - Show current date and time")
      ctx.println("  whoami   - Display current user")
      ctx.println("  sleep    - Pause execution (ms)")
      ctx.println("  set      - Show all variables")
      ctx.println("  exit     - Exit with optional code")
      ctx.println("")
      ctx.println("Scripting keywords: var, if, else, for, while, label, goto, break, continue")
    })

    // sleep - pause execution
    this.registerCommand("sleep", async (args) => {
      const ms = parseInt(args.trim()) || 0
      await new Promise((resolve) => setTimeout(resolve, ms))
    })

    // set - show variables
    this.registerCommand("set", (_args, ctx) => {
      if (this.variables.size === 0) {
        ctx.println("No variables defined.")
      } else {
        for (const [name, value] of this.variables) {
          ctx.println(`${name}=${JSON.stringify(value)}`)
        }
      }
    })

    // exit - handled specially but also as command
    this.registerCommand("exit", (args) => {
      const code = parseInt(args.trim()) || 0
      throw new ExitSignal(code)
    })
  }

  // --------------------------------------------------------------------------
  // Variable Interpolation
  // --------------------------------------------------------------------------

  private interpolateVariables(text: string): string {
    // Handle ${var} syntax
    text = text.replace(/\$\{([^}]+)\}/g, (_, name) => {
      const value = this.variables.get(name)
      return value !== undefined ? String(value) : ""
    })

    // Handle $var syntax (word boundary)
    text = text.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      if (name === "?") {
        return String(this.lastExitCode)
      }
      const value = this.variables.get(name)
      return value !== undefined ? String(value) : ""
    })

    // Handle $? specially
    text = text.replace(/\$\?/g, String(this.lastExitCode))

    return text
  }

  // --------------------------------------------------------------------------
  // Execution
  // --------------------------------------------------------------------------

  async execute(input: string, context: ExecutionContext): Promise<number> {
    this.stopped = false

    try {
      const ast = parse(input)
      await this.executeProgram(ast, context)
      return this.lastExitCode
    } catch (err) {
      if (err instanceof ExitSignal) {
        this.lastExitCode = err.code
        return err.code
      }
      if (err instanceof ParseError) {
        context.error(`Parse error: ${err.message}`)
        this.lastExitCode = 1
        return 1
      }
      if (err instanceof RuntimeError) {
        context.error(err.message)
        this.lastExitCode = 1
        return 1
      }
      if (err instanceof Error) {
        context.error(`Error: ${err.message}`)
        this.lastExitCode = 1
        return 1
      }
      throw err
    }
  }

  private async executeProgram(program: ProgramNode, context: ExecutionContext): Promise<void> {
    // First pass: collect labels
    this.labels.clear()
    for (let i = 0; i < program.body.length; i++) {
      const stmt = program.body[i]
      if (stmt.type === "Label") {
        this.labels.set(stmt.name, i)
      }
    }

    // Second pass: execute
    let i = 0
    while (i < program.body.length) {
      if (this.stopped || context.isStopped()) {
        break
      }

      try {
        await this.executeStatement(program.body[i], context)
        i++
      } catch (err) {
        if (err instanceof GotoSignal) {
          const labelIndex = this.labels.get(err.label)
          if (labelIndex === undefined) {
            throw new RuntimeError(
              `Undefined label: ${err.label}`,
              program.body[i].type === "Goto" ? (program.body[i] as GotoNode).line : 0,
            )
          }
          i = labelIndex
        } else {
          throw err
        }
      }
    }
  }

  private async executeStatement(stmt: StatementNode, context: ExecutionContext): Promise<void> {
    if (this.stopped || context.isStopped()) return

    switch (stmt.type) {
      case "VarDecl":
        await this.executeVarDecl(stmt, context)
        break
      case "If":
        await this.executeIf(stmt, context)
        break
      case "For":
        await this.executeFor(stmt, context)
        break
      case "While":
        await this.executeWhile(stmt, context)
        break
      case "Label":
        // Labels are handled in executeProgram
        break
      case "Goto":
        throw new GotoSignal(stmt.label)
      case "Exit":
        await this.executeExit(stmt)
        break
      case "Break":
        throw new BreakSignal()
      case "Continue":
        throw new ContinueSignal()
      case "Command":
        await this.executeCommand(stmt, context)
        break
      case "Comment":
        // Comments are ignored
        break
    }
  }

  private async executeVarDecl(stmt: VarDeclNode, _context: ExecutionContext): Promise<void> {
    const value = this.evaluateExpression(stmt.value)
    this.variables.set(stmt.name, value)
  }

  private async executeIf(stmt: IfNode, context: ExecutionContext): Promise<void> {
    // Check main condition
    if (this.isTruthy(this.evaluateExpression(stmt.condition))) {
      await this.executeBlock(stmt.body, context)
      return
    }

    // Check else-ifs
    for (const elseIf of stmt.elseIfs) {
      if (this.isTruthy(this.evaluateExpression(elseIf.condition))) {
        await this.executeBlock(elseIf.body, context)
        return
      }
    }

    // Execute else
    if (stmt.elseBody) {
      await this.executeBlock(stmt.elseBody, context)
    }
  }

  private async executeFor(stmt: ForNode, context: ExecutionContext): Promise<void> {
    const start = this.toNumber(this.evaluateExpression(stmt.start))
    const end = this.toNumber(this.evaluateExpression(stmt.end))

    for (let i = start; i <= end; i++) {
      if (this.stopped || context.isStopped()) break

      this.variables.set(stmt.variable, i)

      try {
        await this.executeBlock(stmt.body, context)
      } catch (err) {
        if (err instanceof BreakSignal) {
          break
        }
        if (err instanceof ContinueSignal) {
          continue
        }
        throw err
      }
    }
  }

  private async executeWhile(stmt: WhileNode, context: ExecutionContext): Promise<void> {
    while (this.isTruthy(this.evaluateExpression(stmt.condition))) {
      if (this.stopped || context.isStopped()) break

      try {
        await this.executeBlock(stmt.body, context)
      } catch (err) {
        if (err instanceof BreakSignal) {
          break
        }
        if (err instanceof ContinueSignal) {
          continue
        }
        throw err
      }
    }
  }

  private async executeExit(stmt: ExitNode): Promise<void> {
    const code = stmt.code ? this.toNumber(this.evaluateExpression(stmt.code)) : 0
    throw new ExitSignal(code)
  }

  private async executeCommand(stmt: CommandNode, context: ExecutionContext): Promise<void> {
    const name = stmt.name.toLowerCase()
    const handler = this.commands.get(name)

    if (!handler) {
      context.error(`Unknown command: ${stmt.name}`)
      this.lastExitCode = 127
      return
    }

    try {
      const result = await handler(stmt.args, context)
      if (typeof result === "number") {
        this.lastExitCode = result
      } else {
        this.lastExitCode = 0
      }
    } catch (err) {
      if (err instanceof ExitSignal || err instanceof GotoSignal) {
        throw err
      }
      if (err instanceof Error) {
        context.error(`Command error: ${err.message}`)
        this.lastExitCode = 1
      }
    }
  }

  private async executeBlock(statements: StatementNode[], context: ExecutionContext): Promise<void> {
    for (const stmt of statements) {
      if (this.stopped || context.isStopped()) break
      await this.executeStatement(stmt, context)
    }
  }

  // --------------------------------------------------------------------------
  // Expression Evaluation
  // --------------------------------------------------------------------------

  private evaluateExpression(expr: ExpressionNode): DashValue {
    switch (expr.type) {
      case "NumberLiteral":
        return expr.value

      case "StringLiteral":
        return this.interpolateVariables(expr.value)

      case "BooleanLiteral":
        return expr.value

      case "NullLiteral":
        return null

      case "Identifier":
        if (expr.name === "$?") {
          return this.lastExitCode
        }
        const value = this.variables.get(expr.name)
        return value !== undefined ? value : null

      case "GroupExpr":
        return this.evaluateExpression(expr.expression)

      case "UnaryExpr":
        return this.evaluateUnary(expr.operator, this.evaluateExpression(expr.operand))

      case "BinaryExpr":
        return this.evaluateBinary(
          expr.operator,
          this.evaluateExpression(expr.left),
          this.evaluateExpression(expr.right),
        )
    }
  }

  private evaluateUnary(operator: string, operand: DashValue): DashValue {
    switch (operator) {
      case "!":
        return !this.isTruthy(operand)
      default:
        return null
    }
  }

  private evaluateBinary(operator: string, left: DashValue, right: DashValue): DashValue {
    switch (operator) {
      // Arithmetic
      case "+":
        if (typeof left === "string" || typeof right === "string") {
          return String(left ?? "") + String(right ?? "")
        }
        return this.toNumber(left) + this.toNumber(right)
      case "-":
        return this.toNumber(left) - this.toNumber(right)
      case "*":
        return this.toNumber(left) * this.toNumber(right)
      case "/":
        const divisor = this.toNumber(right)
        if (divisor === 0) return 0
        return this.toNumber(left) / divisor
      case "%":
        const mod = this.toNumber(right)
        if (mod === 0) return 0
        return this.toNumber(left) % mod

      // Comparison
      case "==":
        return left === right
      case "!=":
        return left !== right
      case "<":
        return this.toNumber(left) < this.toNumber(right)
      case ">":
        return this.toNumber(left) > this.toNumber(right)
      case "<=":
        return this.toNumber(left) <= this.toNumber(right)
      case ">=":
        return this.toNumber(left) >= this.toNumber(right)

      // Logical
      case "&&":
        return this.isTruthy(left) && this.isTruthy(right)
      case "||":
        return this.isTruthy(left) || this.isTruthy(right)

      default:
        return null
    }
  }

  // --------------------------------------------------------------------------
  // Type Coercion
  // --------------------------------------------------------------------------

  private isTruthy(value: DashValue): boolean {
    if (value === null) return false
    if (typeof value === "boolean") return value
    if (typeof value === "number") return value !== 0
    if (typeof value === "string") return value.length > 0
    return true
  }

  private toNumber(value: DashValue): number {
    if (typeof value === "number") return value
    if (typeof value === "boolean") return value ? 1 : 0
    if (typeof value === "string") {
      const num = parseFloat(value)
      return isNaN(num) ? 0 : num
    }
    return 0
  }

  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  reset(): void {
    this.variables.clear()
    this.labels.clear()
    this.lastExitCode = 0
    this.stopped = false
  }

  stop(): void {
    this.stopped = true
  }

  getVariables(): Map<string, DashValue> {
    return new Map(this.variables)
  }

  setVariable(name: string, value: DashValue): void {
    this.variables.set(name, value)
  }

  getLastExitCode(): number {
    return this.lastExitCode
  }
}

// ----------------------------------------------------------------------------
// Convenience function
// ----------------------------------------------------------------------------

export function createInterpreter(): Interpreter {
  return new Interpreter()
}
