# Dash Scripting and Terminal Language Specification

Dash is a lightweight scripting and terminal language. Programs consist of instructions separated by newlines.

## Comments

```dash
# This is a single-line comment
```

Comments begin with `#` and extend to the end of the line.

## Data Types

| Type    | Description                     | Example              |
| ------- | ------------------------------- | -------------------- |
| number  | Integer or floating-point value | `42`, `-3.14`, `0`   |
| string  | Sequence of characters          | `"hello"`, `'world'` |
| boolean | Logical true or false           | `true`, `false`      |
| null    | Absence of value                | `null`               |

## Variables

Variables are dynamically typed and declared using the `var` keyword.

```dash
var name = "Alice"
var count = 10
var ratio = 3.14
var active = true
```

Variable names must be any combination of letters, digits and specific symbols (\_ , - , $ , & , #).

### Variable Interpolation

Variables can be interpolated in strings using `$`:

```dash
var name = "Alice"
echo "Hello, $name!"     # Output: Hello, Alice!
echo "Value: ${count}"   # Braces for clarity
```

## Operators

### Arithmetic Operators

| Operator | Description    | Example      |
| -------- | -------------- | ------------ |
| `+`      | Addition       | `5 + 3` → 8  |
| `-`      | Subtraction    | `5 - 3` → 2  |
| `*`      | Multiplication | `5 * 3` → 15 |
| `/`      | Division       | `6 / 3` → 2  |
| `%`      | Modulo         | `5 % 3` → 2  |

### Comparison Operators

| Operator | Description              | Example         |
| -------- | ------------------------ | --------------- |
| `==`     | Equal to                 | `5 == 5` → true |
| `!=`     | Not equal to             | `5 != 3` → true |
| `<`      | Less than                | `3 < 5` → true  |
| `>`      | Greater than             | `5 > 3` → true  |
| `<=`     | Less than or equal to    | `3 <= 3` → true |
| `>=`     | Greater than or equal to | `5 >= 5` → true |

### Logical Operators

| Operator | Description | Example                  |
| -------- | ----------- | ------------------------ |
| `&&`     | Logical AND | `true && false` → false  |
| `\|\|`   | Logical OR  | `true \|\| false` → true |
| `!`      | Logical NOT | `!true` → false          |

### String Operators

| Operator | Description   | Example                              |
| -------- | ------------- | ------------------------------------ |
| `+`      | Concatenation | `"hello" + " world"` → "hello world" |

## Keywords

| Keyword    | Description                 |
| ---------- | --------------------------- |
| `var`      | Declare a variable          |
| `if`       | Conditional branch          |
| `else`     | Alternative branch          |
| `for`      | Loop with counter           |
| `while`    | Loop with condition         |
| `label`    | Define a jump target        |
| `goto`     | Jump to a label             |
| `exit`     | Terminate the program       |
| `break`    | Exit the current loop       |
| `continue` | Skip to next loop iteration |

## Control Flow

### Conditional Statements

```dash
if <condition>
    <instruction>
else if <condition>
    <instruction>
else
    <instruction>
```

Instruction can be one line or multiple lines.

**Example:**

```dash
var x = 10

if x > 5
    echo "x is greater than 5"
else if x == 5
    echo "x is exactly 5"
else
    echo "x is less than 5"
```

### For Loop

```dash
for <variable> in <start> to <end>
    <instruction>
```

Iterates `<variable>` from `<start>` to `<end>` (inclusive).

**Example:**

```dash
for i in 1 to 5
    echo "Iteration $i"
```

**Output:**

```
Iteration 1
Iteration 2
Iteration 3
Iteration 4
Iteration 5
```

### While Loop

```dash
while <condition>
    <instruction>
```

Repeats while `<condition>` evaluates to true.

**Example:**

```dash
var count = 0
while count < 3
    echo "Count: $count"
    var count = count + 1
```

### Loop Control

```dash
break       # Exit the innermost loop immediately
continue    # Skip to the next iteration of the innermost loop
```

**Example:**

```dash
for i in 1 to 10
    if i == 5
        break
    echo $i
# Output: 1 2 3 4
```

### Labels and Goto

```dash
label <name>
goto <label_name>
```

Define named jump points and transfer control unconditionally.

**Example:**

```dash
var x = 0

label start
echo $x
var x = x + 1
if x < 3
    goto start
echo "Done"

# Output: 0 1 2 Done
```

> **Warning:** Excessive use of `goto` can lead to unreadable code. Prefer loops when possible.

### Exit

```dash
exit [exit_code]
```

Terminates program execution with an optional exit code (default: 0).

**Example:**

```dash
if error
    exit 1
exit 0
```

## Commands

If a keyword is not recognized, it is treated as a command. Commands can be built-in or custom-defined.

### Command Syntax

```dash
<command_name> <arguments>
```

Everything after the command name (until the newline) is passed to the command as a single string. It is the command's responsibility to parse and interpret its arguments however it sees fit.

```dash
echo Hello, World!
mycommand arg1 arg2 --flag value
somecommand this entire line is passed as one string
```

The command receives the raw argument string and decides how to handle it (split by spaces, parse flags, treat as a single value, etc.).

### Built-in Commands

| Command | Description                     | Example           |
| ------- | ------------------------------- | ----------------- |
| `echo`  | Print text to output            | `echo "Hello"`    |
| `print` | Print without trailing newline  | `print "Enter: "` |
| `input` | Read user input into a variable | `input name`      |
| `sleep` | Pause execution (milliseconds)  | `sleep 1000`      |
| `clear` | Clear the terminal screen       | `clear`           |
| `pwd`   | Print working directory         | `pwd`             |
| `cd`    | Change directory                | `cd /path/to/dir` |
| `ls`    | List directory contents         | `ls`              |

### Command Return Values

Commands may return values or exit codes. The special variable `$?` holds the last command's exit code.

```dash
mycommand
if $? != 0
    echo "Command failed"
```

## Escape Sequences

Within strings, the following escape sequences are recognized:

| Sequence | Meaning         |
| -------- | --------------- |
| `\\`     | Backslash       |
| `\n`     | Newline         |
| `\t`     | Tab             |
| `\r`     | Carriage return |
| `\"`     | Double quote    |
| `\'`     | Single quote    |
| `\$`     | Literal dollar  |

## Expressions

Expressions can be used wherever a value is expected. Parentheses control precedence.

```dash
var result = (5 + 3) * 2    # result = 16
var check = (x > 0) && (y < 10)
```

### Operator Precedence (highest to lowest)

1. `!` (unary NOT)
2. `*`, `/`, `%`
3. `+`, `-`
4. `<`, `>`, `<=`, `>=`
5. `==`, `!=`
6. `&&`
7. `||`

## Scope

All variables are global by default. Variables declared inside loops or conditionals are accessible outside them.

```dash
if true
    var x = 10
echo $x    # Output: 10
```

## Error Handling

If a syntax error or undefined command is encountered, execution halts and an error message is displayed.

```
Error on line 5: Unknown command 'foobar'
Error on line 10: Undefined variable 'count'
```

## Complete Example

```dash
# Dash Example: FizzBuzz

echo "FizzBuzz from 1 to 20"
echo "---"

for i in 1 to 20
    if i % 15 == 0
        echo "FizzBuzz"
    else if i % 3 == 0
        echo "Fizz"
    else if i % 5 == 0
        echo "Buzz"
    else
        echo $i

echo "---"
echo "Done!"
exit 0
```

## Grammar (EBNF)

```ebnf
program      = { statement NEWLINE } ;
statement    = var_decl | if_stmt | for_stmt | while_stmt
             | label_stmt | goto_stmt | exit_stmt
             | break_stmt | continue_stmt | command | comment ;

var_decl     = "var" IDENTIFIER "=" expression ;
if_stmt      = "if" expression NEWLINE statement
               { "else if" expression NEWLINE statement }
               [ "else" NEWLINE statement ] ;
for_stmt     = "for" IDENTIFIER "in" expression "to" expression NEWLINE statement ;
while_stmt   = "while" expression NEWLINE statement ;
label_stmt   = "label" IDENTIFIER ;
goto_stmt    = "goto" IDENTIFIER ;
exit_stmt    = "exit" [ expression ] ;
break_stmt   = "break" ;
continue_stmt = "continue" ;
command      = IDENTIFIER REST_OF_LINE ;
comment      = "#" { ANY_CHAR } ;

REST_OF_LINE = { ANY_CHAR } ;

expression   = or_expr ;
or_expr      = and_expr { "||" and_expr } ;
and_expr     = eq_expr { "&&" eq_expr } ;
eq_expr      = rel_expr { ( "==" | "!=" ) rel_expr } ;
rel_expr     = add_expr { ( "<" | ">" | "<=" | ">=" ) add_expr } ;
add_expr     = mul_expr { ( "+" | "-" ) mul_expr } ;
mul_expr     = unary_expr { ( "*" | "/" | "%" ) unary_expr } ;
unary_expr   = [ "!" ] primary ;
primary      = NUMBER | STRING | BOOLEAN | "null"
             | IDENTIFIER | "(" expression ")" ;

IDENTIFIER   = ( LETTER | DIGIT | "_" | "-" | "$" | "&" | "#" ) { LETTER | DIGIT | "_" | "-" | "$" | "&" | "#" } ;
NUMBER       = [ "-" ] DIGIT { DIGIT } [ "." DIGIT { DIGIT } ] ;
STRING       = '"' { CHAR } '"' | "'" { CHAR } "'" ;
BOOLEAN      = "true" | "false" ;
```
