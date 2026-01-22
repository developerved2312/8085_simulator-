# 8085 Microprocessor Simulator

A comprehensive web-based 8085 microprocessor simulator that allows you to write, assemble, and execute 8085 assembly language programs.

![8085 Simulator](https://img.shields.io/badge/8085-Simulator-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## Features

- ✅ **Code Editor** - Write 8085 assembly code with syntax support
- ✅ **Assembler** - Convert assembly code to machine code
- ✅ **Simulator** - Execute programs step-by-step or run completely
- ✅ **Register View** - Real-time display of all registers (A, B, C, D, E, H, L, M)
- ✅ **Flag Display** - View all flags (S, Z, AC, P, CY)
- ✅ **Memory Editor** - View and edit memory locations directly
- ✅ **Number Converter** - Convert between Hex, Decimal, Binary, and Octal
- ✅ **Complete Instruction Set** - All 246 instructions with search and filter

## Getting Started

1. Open `index.html` in any modern web browser
2. Write your assembly code in the editor
3. Click **Assemble** to convert to machine code
4. Click **Run** to execute or **Step** to execute one instruction at a time

## Memory Map

| Address Range | Size | Description |
|---------------|------|-------------|
| 0000H - FFFFH | 64 KB | Total Addressable Memory |
| 0000H - 00FFH | 256 bytes | Default Program Area |
| 0100H - 1FFFH | ~8 KB | User Program Space |
| 2000H - 2FFFH | 4 KB | Data Storage Area |
| 3000H - FEFFH | ~52 KB | General Purpose Memory |
| FF00H - FFFEH | 255 bytes | Stack Area (grows downward) |
| FFFFH | 1 byte | Initial Stack Pointer |

### Memory Specifications

- **Total Memory**: 64 KB (65,536 bytes)
- **Address Bus**: 16-bit (A0-A15)
- **Data Bus**: 8-bit (D0-D7)
- **Stack Pointer (SP)**: Initializes at FFFFH
- **Program Counter (PC)**: Starts at 0000H (or ORG address)

---

## Registers

### General Purpose Registers (8-bit)

| Register | Description |
|----------|-------------|
| A | Accumulator - Primary register for arithmetic/logic operations |
| B | General purpose register, pairs with C |
| C | General purpose register, pairs with B |
| D | General purpose register, pairs with E |
| E | General purpose register, pairs with D |
| H | High-order register, pairs with L for memory addressing |
| L | Low-order register, pairs with H for memory addressing |

### Special Registers

| Register | Size | Description |
|----------|------|-------------|
| PC | 16-bit | Program Counter - Address of next instruction |
| SP | 16-bit | Stack Pointer - Top of stack address |
| M | 8-bit | Memory reference at address in HL pair |

### Register Pairs

| Pair | Registers | Description |
|------|-----------|-------------|
| BC | B and C | General purpose 16-bit register |
| DE | D and E | General purpose 16-bit register |
| HL | H and L | Memory pointer, used with M |
| PSW | A and Flags | Processor Status Word |

### Flags Register

| Flag | Bit | Description |
|------|-----|-------------|
| S | D7 | Sign Flag - Set if result is negative (bit 7 = 1) |
| Z | D6 | Zero Flag - Set if result is zero |
| AC | D4 | Auxiliary Carry - Set if carry from bit 3 to bit 4 |
| P | D2 | Parity Flag - Set if result has even parity |
| CY | D0 | Carry Flag - Set if carry/borrow occurs |

---

## Complete Instruction Set

### Data Transfer Instructions

| Mnemonic | Opcode | Bytes | Description |
|----------|--------|-------|-------------|
| MOV r1, r2 | Various | 1 | Move register to register |
| MOV r, M | Various | 1 | Move memory to register |
| MOV M, r | Various | 1 | Move register to memory |
| MVI r, data | Various | 2 | Move immediate to register |
| MVI M, data | 36 | 2 | Move immediate to memory |
| LXI B, data16 | 01 | 3 | Load immediate to BC |
| LXI D, data16 | 11 | 3 | Load immediate to DE |
| LXI H, data16 | 21 | 3 | Load immediate to HL |
| LXI SP, data16 | 31 | 3 | Load immediate to SP |
| LDA addr | 3A | 3 | Load A from memory address |
| STA addr | 32 | 3 | Store A to memory address |
| LHLD addr | 2A | 3 | Load HL from memory |
| SHLD addr | 22 | 3 | Store HL to memory |
| LDAX B | 0A | 1 | Load A indirect from BC |
| LDAX D | 1A | 1 | Load A indirect from DE |
| STAX B | 02 | 1 | Store A indirect to BC |
| STAX D | 12 | 1 | Store A indirect to DE |
| XCHG | EB | 1 | Exchange HL with DE |

### Arithmetic Instructions

| Mnemonic | Opcode | Bytes | Description |
|----------|--------|-------|-------------|
| ADD r | 80-87 | 1 | Add register to A |
| ADD M | 86 | 1 | Add memory to A |
| ADI data | C6 | 2 | Add immediate to A |
| ADC r | 88-8F | 1 | Add register with carry to A |
| ADC M | 8E | 1 | Add memory with carry to A |
| ACI data | CE | 2 | Add immediate with carry to A |
| SUB r | 90-97 | 1 | Subtract register from A |
| SUB M | 96 | 1 | Subtract memory from A |
| SUI data | D6 | 2 | Subtract immediate from A |
| SBB r | 98-9F | 1 | Subtract register with borrow |
| SBB M | 9E | 1 | Subtract memory with borrow |
| SBI data | DE | 2 | Subtract immediate with borrow |
| INR r | Various | 1 | Increment register |
| INR M | 34 | 1 | Increment memory |
| DCR r | Various | 1 | Decrement register |
| DCR M | 35 | 1 | Decrement memory |
| INX rp | Various | 1 | Increment register pair |
| DCX rp | Various | 1 | Decrement register pair |
| DAD rp | Various | 1 | Add register pair to HL |
| DAA | 27 | 1 | Decimal adjust accumulator |

### Logical Instructions

| Mnemonic | Opcode | Bytes | Description |
|----------|--------|-------|-------------|
| ANA r | A0-A7 | 1 | AND register with A |
| ANA M | A6 | 1 | AND memory with A |
| ANI data | E6 | 2 | AND immediate with A |
| ORA r | B0-B7 | 1 | OR register with A |
| ORA M | B6 | 1 | OR memory with A |
| ORI data | F6 | 2 | OR immediate with A |
| XRA r | A8-AF | 1 | XOR register with A |
| XRA M | AE | 1 | XOR memory with A |
| XRI data | EE | 2 | XOR immediate with A |
| CMP r | B8-BF | 1 | Compare register with A |
| CMP M | BE | 1 | Compare memory with A |
| CPI data | FE | 2 | Compare immediate with A |
| RLC | 07 | 1 | Rotate A left |
| RRC | 0F | 1 | Rotate A right |
| RAL | 17 | 1 | Rotate A left through carry |
| RAR | 1F | 1 | Rotate A right through carry |
| CMA | 2F | 1 | Complement A |
| CMC | 3F | 1 | Complement carry flag |
| STC | 37 | 1 | Set carry flag |

### Branch Instructions

| Mnemonic | Opcode | Bytes | Description |
|----------|--------|-------|-------------|
| JMP addr | C3 | 3 | Jump unconditionally |
| JC addr | DA | 3 | Jump if carry |
| JNC addr | D2 | 3 | Jump if no carry |
| JZ addr | CA | 3 | Jump if zero |
| JNZ addr | C2 | 3 | Jump if not zero |
| JP addr | F2 | 3 | Jump if positive |
| JM addr | FA | 3 | Jump if minus |
| JPE addr | EA | 3 | Jump if parity even |
| JPO addr | E2 | 3 | Jump if parity odd |
| CALL addr | CD | 3 | Call subroutine |
| CC addr | DC | 3 | Call if carry |
| CNC addr | D4 | 3 | Call if no carry |
| CZ addr | CC | 3 | Call if zero |
| CNZ addr | C4 | 3 | Call if not zero |
| CP addr | F4 | 3 | Call if positive |
| CM addr | FC | 3 | Call if minus |
| CPE addr | EC | 3 | Call if parity even |
| CPO addr | E4 | 3 | Call if parity odd |
| RET | C9 | 1 | Return from subroutine |
| RC | D8 | 1 | Return if carry |
| RNC | D0 | 1 | Return if no carry |
| RZ | C8 | 1 | Return if zero |
| RNZ | C0 | 1 | Return if not zero |
| RP | F0 | 1 | Return if positive |
| RM | F8 | 1 | Return if minus |
| RPE | E8 | 1 | Return if parity even |
| RPO | E0 | 1 | Return if parity odd |
| PCHL | E9 | 1 | Jump to address in HL |
| RST n | Various | 1 | Restart (n = 0-7) |

### Stack Instructions

| Mnemonic | Opcode | Bytes | Description |
|----------|--------|-------|-------------|
| PUSH B | C5 | 1 | Push BC to stack |
| PUSH D | D5 | 1 | Push DE to stack |
| PUSH H | E5 | 1 | Push HL to stack |
| PUSH PSW | F5 | 1 | Push A and flags to stack |
| POP B | C1 | 1 | Pop BC from stack |
| POP D | D1 | 1 | Pop DE from stack |
| POP H | E1 | 1 | Pop HL from stack |
| POP PSW | F1 | 1 | Pop A and flags from stack |
| XTHL | E3 | 1 | Exchange HL with top of stack |
| SPHL | F9 | 1 | Move HL to SP |

### I/O Instructions

| Mnemonic | Opcode | Bytes | Description |
|----------|--------|-------|-------------|
| IN port | DB | 2 | Input from port to A |
| OUT port | D3 | 2 | Output from A to port |

### Control Instructions

| Mnemonic | Opcode | Bytes | Description |
|----------|--------|-------|-------------|
| NOP | 00 | 1 | No operation |
| HLT | 76 | 1 | Halt processor |
| DI | F3 | 1 | Disable interrupts |
| EI | FB | 1 | Enable interrupts |
| RIM | 20 | 1 | Read interrupt mask |
| SIM | 30 | 1 | Set interrupt mask |

---

## Assembler Directives

| Directive | Example | Description |
|-----------|---------|-------------|
| ORG | ORG 2000H | Set origin address |
| DB | DB 45H, 32H | Define byte(s) |
| DW | DW 1234H | Define word (16-bit) |
| Labels | LOOP: | Define label for address |

---

## Number Formats

| Format | Example | Description |
|--------|---------|-------------|
| Hexadecimal | 3EH, 0x3E | Hex value (default) |
| Decimal | 62D | Decimal value |
| Binary | 00111110B | Binary value |

---

## Sample Programs

### 1. Add Two Numbers
```assembly
; Add two numbers and store result
ORG 0000H

MVI A, 05H    ; Load 5 into A
MVI B, 03H    ; Load 3 into B
ADD B         ; A = A + B (result: 08H)
STA 2050H     ; Store result at 2050H
HLT           ; Halt
```

### 2. Multiply Two Numbers (Repeated Addition)
```assembly
; Multiply 5 x 3 using repeated addition
ORG 0000H

MVI B, 05H    ; First number
MVI C, 03H    ; Second number (counter)
MVI A, 00H    ; Clear accumulator

LOOP: ADD B   ; Add B to A
DCR C         ; Decrement counter
JNZ LOOP      ; Repeat if not zero

STA 2050H     ; Store result
HLT
```

### 3. Find Larger of Two Numbers
```assembly
; Compare two numbers and store larger
ORG 0000H

LDA 2000H     ; Load first number
MOV B, A      ; Save in B
LDA 2001H     ; Load second number
CMP B         ; Compare with B
JNC SECOND    ; If A >= B, jump
MOV A, B      ; Else, A = B (B is larger)

SECOND:
STA 2002H     ; Store larger number
HLT
```

### 4. Sum of Array Elements
```assembly
; Sum of 5 numbers stored from 2000H
ORG 0000H

LXI H, 2000H  ; Point to array start
MVI C, 05H    ; Counter = 5
MVI A, 00H    ; Clear sum

LOOP: ADD M   ; Add memory to A
INX H         ; Next location
DCR C         ; Decrement counter
JNZ LOOP      ; Repeat if not zero

STA 2050H     ; Store sum
HLT
```

### 5. Block Data Transfer
```assembly
; Copy 10 bytes from 2000H to 3000H
ORG 0000H

LXI H, 2000H  ; Source address
LXI D, 3000H  ; Destination address
MVI C, 0AH    ; Count = 10

LOOP: MOV A, M    ; Load from source
STAX D            ; Store to destination
INX H             ; Next source
INX D             ; Next destination
DCR C             ; Decrement counter
JNZ LOOP          ; Repeat if not zero

HLT
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Switch between tabs |
| Enter | Execute step (in Step mode) |

---

## Browser Compatibility

- ✅ Google Chrome (recommended)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari
- ✅ Opera

---

## File Structure

```
8085-simulator/
├── index.html      # Main HTML file
├── styles.css      # CSS styling
├── instructions.js # Instruction set definitions
├── assembler.js    # Assembler logic
├── simulator.js    # CPU simulator/emulator
├── app.js          # Main application logic
└── README.md       # This file
```

---

## License

This project is open source and available for educational purposes.

---

## Author

Created for learning 8085 microprocessor programming.

---

## Quick Reference Card

### Common Opcodes

| Instruction | Opcode | Instruction | Opcode |
|-------------|--------|-------------|--------|
| NOP | 00 | HLT | 76 |
| MVI A | 3E | MVI B | 06 |
| MOV A,B | 78 | MOV B,A | 47 |
| ADD B | 80 | SUB B | 90 |
| INR A | 3C | DCR A | 3D |
| JMP | C3 | JZ | CA |
| JNZ | C2 | CALL | CD |
| RET | C9 | PUSH B | C5 |
| POP B | C1 | LDA | 3A |
| STA | 32 | LXI H | 21 |

### Flag Conditions

| Condition | Flag State | Jump | Call | Return |
|-----------|------------|------|------|--------|
| Carry | CY = 1 | JC | CC | RC |
| No Carry | CY = 0 | JNC | CNC | RNC |
| Zero | Z = 1 | JZ | CZ | RZ |
| Not Zero | Z = 0 | JNZ | CNZ | RNZ |
| Plus | S = 0 | JP | CP | RP |
| Minus | S = 1 | JM | CM | RM |
| Parity Even | P = 1 | JPE | CPE | RPE |
| Parity Odd | P = 0 | JPO | CPO | RPO |
