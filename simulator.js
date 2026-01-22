// 8085 Simulator/Emulator
class Simulator {
    constructor() {
        this.reset();
    }

    reset() {
        // Registers (8-bit)
        this.registers = {
            A: 0, B: 0, C: 0, D: 0, E: 0, H: 0, L: 0
        };

        // Special registers (16-bit)
        this.SP = 0xFFFF; // Stack Pointer
        this.PC = 0x0000; // Program Counter

        // Flags
        this.flags = {
            S: 0,  // Sign flag
            Z: 0,  // Zero flag
            AC: 0, // Auxiliary Carry flag
            P: 0,  // Parity flag
            CY: 0  // Carry flag
        };

        // Memory (64KB)
        this.memory = new Uint8Array(65536);

        // Execution state
        this.halted = false;
        this.running = false;
        this.executionLog = [];
        this.breakpoints = new Set();
    }

    // Load machine code into memory
    loadProgram(machineCode, startAddress = 0x0000) {
        for (const item of machineCode) {
            this.memory[item.address] = item.byte;
        }
        this.PC = startAddress;
    }

    // Get memory value at HL address (M register)
    getM() {
        const addr = (this.registers.H << 8) | this.registers.L;
        return this.memory[addr];
    }

    // Set memory value at HL address (M register)
    setM(value) {
        const addr = (this.registers.H << 8) | this.registers.L;
        this.memory[addr] = value & 0xFF;
    }

    // Get register value by name
    getReg(name) {
        if (name === 'M') return this.getM();
        return this.registers[name];
    }

    // Set register value by name
    setReg(name, value) {
        if (name === 'M') {
            this.setM(value);
        } else {
            this.registers[name] = value & 0xFF;
        }
    }

    // Get register pair value
    getRegPair(pair) {
        switch (pair) {
            case 'B': return (this.registers.B << 8) | this.registers.C;
            case 'D': return (this.registers.D << 8) | this.registers.E;
            case 'H': return (this.registers.H << 8) | this.registers.L;
            case 'SP': return this.SP;
            case 'PSW': return (this.registers.A << 8) | this.getFlagsAsByte();
            default: return 0;
        }
    }

    // Set register pair value
    setRegPair(pair, value) {
        value = value & 0xFFFF;
        switch (pair) {
            case 'B':
                this.registers.B = (value >> 8) & 0xFF;
                this.registers.C = value & 0xFF;
                break;
            case 'D':
                this.registers.D = (value >> 8) & 0xFF;
                this.registers.E = value & 0xFF;
                break;
            case 'H':
                this.registers.H = (value >> 8) & 0xFF;
                this.registers.L = value & 0xFF;
                break;
            case 'SP':
                this.SP = value;
                break;
            case 'PSW':
                this.registers.A = (value >> 8) & 0xFF;
                this.setFlagsFromByte(value & 0xFF);
                break;
        }
    }

    // Get flags as a single byte
    getFlagsAsByte() {
        return (this.flags.S << 7) |
               (this.flags.Z << 6) |
               (this.flags.AC << 4) |
               (this.flags.P << 2) |
               (1 << 1) | // Bit 1 is always 1
               this.flags.CY;
    }

    // Set flags from a byte
    setFlagsFromByte(byte) {
        this.flags.S = (byte >> 7) & 1;
        this.flags.Z = (byte >> 6) & 1;
        this.flags.AC = (byte >> 4) & 1;
        this.flags.P = (byte >> 2) & 1;
        this.flags.CY = byte & 1;
    }

    // Update flags based on result
    updateFlags(result, carry = null, auxCarry = null) {
        result = result & 0xFF;
        
        // Sign flag
        this.flags.S = (result & 0x80) ? 1 : 0;
        
        // Zero flag
        this.flags.Z = (result === 0) ? 1 : 0;
        
        // Parity flag (even parity)
        let bits = 0;
        let temp = result;
        while (temp) {
            bits += temp & 1;
            temp >>= 1;
        }
        this.flags.P = (bits % 2 === 0) ? 1 : 0;

        // Carry flag
        if (carry !== null) {
            this.flags.CY = carry ? 1 : 0;
        }

        // Auxiliary carry flag
        if (auxCarry !== null) {
            this.flags.AC = auxCarry ? 1 : 0;
        }
    }

    // Fetch byte at PC and increment PC
    fetchByte() {
        const byte = this.memory[this.PC];
        this.PC = (this.PC + 1) & 0xFFFF;
        return byte;
    }

    // Fetch 16-bit word (little endian)
    fetchWord() {
        const low = this.fetchByte();
        const high = this.fetchByte();
        return (high << 8) | low;
    }

    // Push value onto stack
    pushStack(value) {
        this.SP = (this.SP - 1) & 0xFFFF;
        this.memory[this.SP] = (value >> 8) & 0xFF;
        this.SP = (this.SP - 1) & 0xFFFF;
        this.memory[this.SP] = value & 0xFF;
    }

    // Pop value from stack
    popStack() {
        const low = this.memory[this.SP];
        this.SP = (this.SP + 1) & 0xFFFF;
        const high = this.memory[this.SP];
        this.SP = (this.SP + 1) & 0xFFFF;
        return (high << 8) | low;
    }

    // Execute single instruction
    step() {
        if (this.halted) {
            return { halted: true, instruction: 'HLT' };
        }

        const startPC = this.PC;
        const opcode = this.fetchByte();
        let instruction = '';
        let details = '';

        switch (opcode) {
            // NOP
            case 0x00:
                instruction = 'NOP';
                break;

            // LXI B, d16
            case 0x01:
                {
                    const data = this.fetchWord();
                    this.setRegPair('B', data);
                    instruction = `LXI B, ${this.formatHex16(data)}`;
                }
                break;

            // STAX B
            case 0x02:
                {
                    const addr = this.getRegPair('B');
                    this.memory[addr] = this.registers.A;
                    instruction = 'STAX B';
                }
                break;

            // INX B
            case 0x03:
                this.setRegPair('B', this.getRegPair('B') + 1);
                instruction = 'INX B';
                break;

            // INR B
            case 0x04:
                {
                    const result = this.registers.B + 1;
                    const auxCarry = ((this.registers.B & 0x0F) + 1) > 0x0F;
                    this.registers.B = result & 0xFF;
                    this.updateFlags(this.registers.B, null, auxCarry);
                    instruction = 'INR B';
                }
                break;

            // DCR B
            case 0x05:
                {
                    const result = this.registers.B - 1;
                    const auxCarry = (this.registers.B & 0x0F) < 1;
                    this.registers.B = result & 0xFF;
                    this.updateFlags(this.registers.B, null, auxCarry);
                    instruction = 'DCR B';
                }
                break;

            // MVI B, d8
            case 0x06:
                {
                    const data = this.fetchByte();
                    this.registers.B = data;
                    instruction = `MVI B, ${this.formatHex8(data)}`;
                }
                break;

            // RLC
            case 0x07:
                {
                    const bit7 = (this.registers.A >> 7) & 1;
                    this.registers.A = ((this.registers.A << 1) | bit7) & 0xFF;
                    this.flags.CY = bit7;
                    instruction = 'RLC';
                }
                break;

            // DAD B
            case 0x09:
                {
                    const hl = this.getRegPair('H');
                    const bc = this.getRegPair('B');
                    const result = hl + bc;
                    this.flags.CY = result > 0xFFFF ? 1 : 0;
                    this.setRegPair('H', result);
                    instruction = 'DAD B';
                }
                break;

            // LDAX B
            case 0x0A:
                {
                    const addr = this.getRegPair('B');
                    this.registers.A = this.memory[addr];
                    instruction = 'LDAX B';
                }
                break;

            // DCX B
            case 0x0B:
                this.setRegPair('B', this.getRegPair('B') - 1);
                instruction = 'DCX B';
                break;

            // INR C
            case 0x0C:
                {
                    const result = this.registers.C + 1;
                    const auxCarry = ((this.registers.C & 0x0F) + 1) > 0x0F;
                    this.registers.C = result & 0xFF;
                    this.updateFlags(this.registers.C, null, auxCarry);
                    instruction = 'INR C';
                }
                break;

            // DCR C
            case 0x0D:
                {
                    const result = this.registers.C - 1;
                    const auxCarry = (this.registers.C & 0x0F) < 1;
                    this.registers.C = result & 0xFF;
                    this.updateFlags(this.registers.C, null, auxCarry);
                    instruction = 'DCR C';
                }
                break;

            // MVI C, d8
            case 0x0E:
                {
                    const data = this.fetchByte();
                    this.registers.C = data;
                    instruction = `MVI C, ${this.formatHex8(data)}`;
                }
                break;

            // RRC
            case 0x0F:
                {
                    const bit0 = this.registers.A & 1;
                    this.registers.A = ((this.registers.A >> 1) | (bit0 << 7)) & 0xFF;
                    this.flags.CY = bit0;
                    instruction = 'RRC';
                }
                break;

            // LXI D, d16
            case 0x11:
                {
                    const data = this.fetchWord();
                    this.setRegPair('D', data);
                    instruction = `LXI D, ${this.formatHex16(data)}`;
                }
                break;

            // STAX D
            case 0x12:
                {
                    const addr = this.getRegPair('D');
                    this.memory[addr] = this.registers.A;
                    instruction = 'STAX D';
                }
                break;

            // INX D
            case 0x13:
                this.setRegPair('D', this.getRegPair('D') + 1);
                instruction = 'INX D';
                break;

            // INR D
            case 0x14:
                {
                    const result = this.registers.D + 1;
                    const auxCarry = ((this.registers.D & 0x0F) + 1) > 0x0F;
                    this.registers.D = result & 0xFF;
                    this.updateFlags(this.registers.D, null, auxCarry);
                    instruction = 'INR D';
                }
                break;

            // DCR D
            case 0x15:
                {
                    const result = this.registers.D - 1;
                    const auxCarry = (this.registers.D & 0x0F) < 1;
                    this.registers.D = result & 0xFF;
                    this.updateFlags(this.registers.D, null, auxCarry);
                    instruction = 'DCR D';
                }
                break;

            // MVI D, d8
            case 0x16:
                {
                    const data = this.fetchByte();
                    this.registers.D = data;
                    instruction = `MVI D, ${this.formatHex8(data)}`;
                }
                break;

            // RAL
            case 0x17:
                {
                    const bit7 = (this.registers.A >> 7) & 1;
                    this.registers.A = ((this.registers.A << 1) | this.flags.CY) & 0xFF;
                    this.flags.CY = bit7;
                    instruction = 'RAL';
                }
                break;

            // DAD D
            case 0x19:
                {
                    const hl = this.getRegPair('H');
                    const de = this.getRegPair('D');
                    const result = hl + de;
                    this.flags.CY = result > 0xFFFF ? 1 : 0;
                    this.setRegPair('H', result);
                    instruction = 'DAD D';
                }
                break;

            // LDAX D
            case 0x1A:
                {
                    const addr = this.getRegPair('D');
                    this.registers.A = this.memory[addr];
                    instruction = 'LDAX D';
                }
                break;

            // DCX D
            case 0x1B:
                this.setRegPair('D', this.getRegPair('D') - 1);
                instruction = 'DCX D';
                break;

            // INR E
            case 0x1C:
                {
                    const result = this.registers.E + 1;
                    const auxCarry = ((this.registers.E & 0x0F) + 1) > 0x0F;
                    this.registers.E = result & 0xFF;
                    this.updateFlags(this.registers.E, null, auxCarry);
                    instruction = 'INR E';
                }
                break;

            // DCR E
            case 0x1D:
                {
                    const result = this.registers.E - 1;
                    const auxCarry = (this.registers.E & 0x0F) < 1;
                    this.registers.E = result & 0xFF;
                    this.updateFlags(this.registers.E, null, auxCarry);
                    instruction = 'DCR E';
                }
                break;

            // MVI E, d8
            case 0x1E:
                {
                    const data = this.fetchByte();
                    this.registers.E = data;
                    instruction = `MVI E, ${this.formatHex8(data)}`;
                }
                break;

            // RAR
            case 0x1F:
                {
                    const bit0 = this.registers.A & 1;
                    this.registers.A = ((this.registers.A >> 1) | (this.flags.CY << 7)) & 0xFF;
                    this.flags.CY = bit0;
                    instruction = 'RAR';
                }
                break;

            // RIM
            case 0x20:
                instruction = 'RIM';
                break;

            // LXI H, d16
            case 0x21:
                {
                    const data = this.fetchWord();
                    this.setRegPair('H', data);
                    instruction = `LXI H, ${this.formatHex16(data)}`;
                }
                break;

            // SHLD addr
            case 0x22:
                {
                    const addr = this.fetchWord();
                    this.memory[addr] = this.registers.L;
                    this.memory[(addr + 1) & 0xFFFF] = this.registers.H;
                    instruction = `SHLD ${this.formatHex16(addr)}`;
                }
                break;

            // INX H
            case 0x23:
                this.setRegPair('H', this.getRegPair('H') + 1);
                instruction = 'INX H';
                break;

            // INR H
            case 0x24:
                {
                    const result = this.registers.H + 1;
                    const auxCarry = ((this.registers.H & 0x0F) + 1) > 0x0F;
                    this.registers.H = result & 0xFF;
                    this.updateFlags(this.registers.H, null, auxCarry);
                    instruction = 'INR H';
                }
                break;

            // DCR H
            case 0x25:
                {
                    const result = this.registers.H - 1;
                    const auxCarry = (this.registers.H & 0x0F) < 1;
                    this.registers.H = result & 0xFF;
                    this.updateFlags(this.registers.H, null, auxCarry);
                    instruction = 'DCR H';
                }
                break;

            // MVI H, d8
            case 0x26:
                {
                    const data = this.fetchByte();
                    this.registers.H = data;
                    instruction = `MVI H, ${this.formatHex8(data)}`;
                }
                break;

            // DAA
            case 0x27:
                {
                    let correction = 0;
                    let setCarry = false;

                    if ((this.registers.A & 0x0F) > 9 || this.flags.AC) {
                        correction += 0x06;
                    }

                    if ((this.registers.A >> 4) > 9 || this.flags.CY || 
                        ((this.registers.A >> 4) >= 9 && (this.registers.A & 0x0F) > 9)) {
                        correction += 0x60;
                        setCarry = true;
                    }

                    const auxCarry = ((this.registers.A & 0x0F) + (correction & 0x0F)) > 0x0F;
                    this.registers.A = (this.registers.A + correction) & 0xFF;
                    this.updateFlags(this.registers.A, setCarry || this.flags.CY, auxCarry);
                    instruction = 'DAA';
                }
                break;

            // DAD H
            case 0x29:
                {
                    const hl = this.getRegPair('H');
                    const result = hl + hl;
                    this.flags.CY = result > 0xFFFF ? 1 : 0;
                    this.setRegPair('H', result);
                    instruction = 'DAD H';
                }
                break;

            // LHLD addr
            case 0x2A:
                {
                    const addr = this.fetchWord();
                    this.registers.L = this.memory[addr];
                    this.registers.H = this.memory[(addr + 1) & 0xFFFF];
                    instruction = `LHLD ${this.formatHex16(addr)}`;
                }
                break;

            // DCX H
            case 0x2B:
                this.setRegPair('H', this.getRegPair('H') - 1);
                instruction = 'DCX H';
                break;

            // INR L
            case 0x2C:
                {
                    const result = this.registers.L + 1;
                    const auxCarry = ((this.registers.L & 0x0F) + 1) > 0x0F;
                    this.registers.L = result & 0xFF;
                    this.updateFlags(this.registers.L, null, auxCarry);
                    instruction = 'INR L';
                }
                break;

            // DCR L
            case 0x2D:
                {
                    const result = this.registers.L - 1;
                    const auxCarry = (this.registers.L & 0x0F) < 1;
                    this.registers.L = result & 0xFF;
                    this.updateFlags(this.registers.L, null, auxCarry);
                    instruction = 'DCR L';
                }
                break;

            // MVI L, d8
            case 0x2E:
                {
                    const data = this.fetchByte();
                    this.registers.L = data;
                    instruction = `MVI L, ${this.formatHex8(data)}`;
                }
                break;

            // CMA
            case 0x2F:
                this.registers.A = (~this.registers.A) & 0xFF;
                instruction = 'CMA';
                break;

            // SIM
            case 0x30:
                instruction = 'SIM';
                break;

            // LXI SP, d16
            case 0x31:
                {
                    const data = this.fetchWord();
                    this.SP = data;
                    instruction = `LXI SP, ${this.formatHex16(data)}`;
                }
                break;

            // STA addr
            case 0x32:
                {
                    const addr = this.fetchWord();
                    this.memory[addr] = this.registers.A;
                    instruction = `STA ${this.formatHex16(addr)}`;
                }
                break;

            // INX SP
            case 0x33:
                this.SP = (this.SP + 1) & 0xFFFF;
                instruction = 'INX SP';
                break;

            // INR M
            case 0x34:
                {
                    const m = this.getM();
                    const result = m + 1;
                    const auxCarry = ((m & 0x0F) + 1) > 0x0F;
                    this.setM(result & 0xFF);
                    this.updateFlags(result & 0xFF, null, auxCarry);
                    instruction = 'INR M';
                }
                break;

            // DCR M
            case 0x35:
                {
                    const m = this.getM();
                    const result = m - 1;
                    const auxCarry = (m & 0x0F) < 1;
                    this.setM(result & 0xFF);
                    this.updateFlags(result & 0xFF, null, auxCarry);
                    instruction = 'DCR M';
                }
                break;

            // MVI M, d8
            case 0x36:
                {
                    const data = this.fetchByte();
                    this.setM(data);
                    instruction = `MVI M, ${this.formatHex8(data)}`;
                }
                break;

            // STC
            case 0x37:
                this.flags.CY = 1;
                instruction = 'STC';
                break;

            // DAD SP
            case 0x39:
                {
                    const hl = this.getRegPair('H');
                    const result = hl + this.SP;
                    this.flags.CY = result > 0xFFFF ? 1 : 0;
                    this.setRegPair('H', result);
                    instruction = 'DAD SP';
                }
                break;

            // LDA addr
            case 0x3A:
                {
                    const addr = this.fetchWord();
                    this.registers.A = this.memory[addr];
                    instruction = `LDA ${this.formatHex16(addr)}`;
                }
                break;

            // DCX SP
            case 0x3B:
                this.SP = (this.SP - 1) & 0xFFFF;
                instruction = 'DCX SP';
                break;

            // INR A
            case 0x3C:
                {
                    const result = this.registers.A + 1;
                    const auxCarry = ((this.registers.A & 0x0F) + 1) > 0x0F;
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, null, auxCarry);
                    instruction = 'INR A';
                }
                break;

            // DCR A
            case 0x3D:
                {
                    const result = this.registers.A - 1;
                    const auxCarry = (this.registers.A & 0x0F) < 1;
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, null, auxCarry);
                    instruction = 'DCR A';
                }
                break;

            // MVI A, d8
            case 0x3E:
                {
                    const data = this.fetchByte();
                    this.registers.A = data;
                    instruction = `MVI A, ${this.formatHex8(data)}`;
                }
                break;

            // CMC
            case 0x3F:
                this.flags.CY = this.flags.CY ? 0 : 1;
                instruction = 'CMC';
                break;

            // MOV B,B to MOV B,A (0x40-0x47)
            case 0x40: this.registers.B = this.registers.B; instruction = 'MOV B,B'; break;
            case 0x41: this.registers.B = this.registers.C; instruction = 'MOV B,C'; break;
            case 0x42: this.registers.B = this.registers.D; instruction = 'MOV B,D'; break;
            case 0x43: this.registers.B = this.registers.E; instruction = 'MOV B,E'; break;
            case 0x44: this.registers.B = this.registers.H; instruction = 'MOV B,H'; break;
            case 0x45: this.registers.B = this.registers.L; instruction = 'MOV B,L'; break;
            case 0x46: this.registers.B = this.getM(); instruction = 'MOV B,M'; break;
            case 0x47: this.registers.B = this.registers.A; instruction = 'MOV B,A'; break;

            // MOV C,B to MOV C,A (0x48-0x4F)
            case 0x48: this.registers.C = this.registers.B; instruction = 'MOV C,B'; break;
            case 0x49: this.registers.C = this.registers.C; instruction = 'MOV C,C'; break;
            case 0x4A: this.registers.C = this.registers.D; instruction = 'MOV C,D'; break;
            case 0x4B: this.registers.C = this.registers.E; instruction = 'MOV C,E'; break;
            case 0x4C: this.registers.C = this.registers.H; instruction = 'MOV C,H'; break;
            case 0x4D: this.registers.C = this.registers.L; instruction = 'MOV C,L'; break;
            case 0x4E: this.registers.C = this.getM(); instruction = 'MOV C,M'; break;
            case 0x4F: this.registers.C = this.registers.A; instruction = 'MOV C,A'; break;

            // MOV D,B to MOV D,A (0x50-0x57)
            case 0x50: this.registers.D = this.registers.B; instruction = 'MOV D,B'; break;
            case 0x51: this.registers.D = this.registers.C; instruction = 'MOV D,C'; break;
            case 0x52: this.registers.D = this.registers.D; instruction = 'MOV D,D'; break;
            case 0x53: this.registers.D = this.registers.E; instruction = 'MOV D,E'; break;
            case 0x54: this.registers.D = this.registers.H; instruction = 'MOV D,H'; break;
            case 0x55: this.registers.D = this.registers.L; instruction = 'MOV D,L'; break;
            case 0x56: this.registers.D = this.getM(); instruction = 'MOV D,M'; break;
            case 0x57: this.registers.D = this.registers.A; instruction = 'MOV D,A'; break;

            // MOV E,B to MOV E,A (0x58-0x5F)
            case 0x58: this.registers.E = this.registers.B; instruction = 'MOV E,B'; break;
            case 0x59: this.registers.E = this.registers.C; instruction = 'MOV E,C'; break;
            case 0x5A: this.registers.E = this.registers.D; instruction = 'MOV E,D'; break;
            case 0x5B: this.registers.E = this.registers.E; instruction = 'MOV E,E'; break;
            case 0x5C: this.registers.E = this.registers.H; instruction = 'MOV E,H'; break;
            case 0x5D: this.registers.E = this.registers.L; instruction = 'MOV E,L'; break;
            case 0x5E: this.registers.E = this.getM(); instruction = 'MOV E,M'; break;
            case 0x5F: this.registers.E = this.registers.A; instruction = 'MOV E,A'; break;

            // MOV H,B to MOV H,A (0x60-0x67)
            case 0x60: this.registers.H = this.registers.B; instruction = 'MOV H,B'; break;
            case 0x61: this.registers.H = this.registers.C; instruction = 'MOV H,C'; break;
            case 0x62: this.registers.H = this.registers.D; instruction = 'MOV H,D'; break;
            case 0x63: this.registers.H = this.registers.E; instruction = 'MOV H,E'; break;
            case 0x64: this.registers.H = this.registers.H; instruction = 'MOV H,H'; break;
            case 0x65: this.registers.H = this.registers.L; instruction = 'MOV H,L'; break;
            case 0x66: this.registers.H = this.getM(); instruction = 'MOV H,M'; break;
            case 0x67: this.registers.H = this.registers.A; instruction = 'MOV H,A'; break;

            // MOV L,B to MOV L,A (0x68-0x6F)
            case 0x68: this.registers.L = this.registers.B; instruction = 'MOV L,B'; break;
            case 0x69: this.registers.L = this.registers.C; instruction = 'MOV L,C'; break;
            case 0x6A: this.registers.L = this.registers.D; instruction = 'MOV L,D'; break;
            case 0x6B: this.registers.L = this.registers.E; instruction = 'MOV L,E'; break;
            case 0x6C: this.registers.L = this.registers.H; instruction = 'MOV L,H'; break;
            case 0x6D: this.registers.L = this.registers.L; instruction = 'MOV L,L'; break;
            case 0x6E: this.registers.L = this.getM(); instruction = 'MOV L,M'; break;
            case 0x6F: this.registers.L = this.registers.A; instruction = 'MOV L,A'; break;

            // MOV M,B to MOV M,L (0x70-0x75)
            case 0x70: this.setM(this.registers.B); instruction = 'MOV M,B'; break;
            case 0x71: this.setM(this.registers.C); instruction = 'MOV M,C'; break;
            case 0x72: this.setM(this.registers.D); instruction = 'MOV M,D'; break;
            case 0x73: this.setM(this.registers.E); instruction = 'MOV M,E'; break;
            case 0x74: this.setM(this.registers.H); instruction = 'MOV M,H'; break;
            case 0x75: this.setM(this.registers.L); instruction = 'MOV M,L'; break;

            // HLT
            case 0x76:
                this.halted = true;
                instruction = 'HLT';
                break;

            // MOV M,A
            case 0x77: this.setM(this.registers.A); instruction = 'MOV M,A'; break;

            // MOV A,B to MOV A,A (0x78-0x7F)
            case 0x78: this.registers.A = this.registers.B; instruction = 'MOV A,B'; break;
            case 0x79: this.registers.A = this.registers.C; instruction = 'MOV A,C'; break;
            case 0x7A: this.registers.A = this.registers.D; instruction = 'MOV A,D'; break;
            case 0x7B: this.registers.A = this.registers.E; instruction = 'MOV A,E'; break;
            case 0x7C: this.registers.A = this.registers.H; instruction = 'MOV A,H'; break;
            case 0x7D: this.registers.A = this.registers.L; instruction = 'MOV A,L'; break;
            case 0x7E: this.registers.A = this.getM(); instruction = 'MOV A,M'; break;
            case 0x7F: this.registers.A = this.registers.A; instruction = 'MOV A,A'; break;

            // ADD B to ADD A (0x80-0x87)
            case 0x80: case 0x81: case 0x82: case 0x83:
            case 0x84: case 0x85: case 0x86: case 0x87:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0x80];
                    const val = this.getReg(reg);
                    const result = this.registers.A + val;
                    const auxCarry = ((this.registers.A & 0x0F) + (val & 0x0F)) > 0x0F;
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result > 0xFF, auxCarry);
                    instruction = `ADD ${reg}`;
                }
                break;

            // ADC B to ADC A (0x88-0x8F)
            case 0x88: case 0x89: case 0x8A: case 0x8B:
            case 0x8C: case 0x8D: case 0x8E: case 0x8F:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0x88];
                    const val = this.getReg(reg);
                    const carry = this.flags.CY;
                    const result = this.registers.A + val + carry;
                    const auxCarry = ((this.registers.A & 0x0F) + (val & 0x0F) + carry) > 0x0F;
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result > 0xFF, auxCarry);
                    instruction = `ADC ${reg}`;
                }
                break;

            // SUB B to SUB A (0x90-0x97)
            case 0x90: case 0x91: case 0x92: case 0x93:
            case 0x94: case 0x95: case 0x96: case 0x97:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0x90];
                    const val = this.getReg(reg);
                    const result = this.registers.A - val;
                    const auxCarry = (this.registers.A & 0x0F) < (val & 0x0F);
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result < 0, auxCarry);
                    instruction = `SUB ${reg}`;
                }
                break;

            // SBB B to SBB A (0x98-0x9F)
            case 0x98: case 0x99: case 0x9A: case 0x9B:
            case 0x9C: case 0x9D: case 0x9E: case 0x9F:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0x98];
                    const val = this.getReg(reg);
                    const carry = this.flags.CY;
                    const result = this.registers.A - val - carry;
                    const auxCarry = (this.registers.A & 0x0F) < ((val & 0x0F) + carry);
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result < 0, auxCarry);
                    instruction = `SBB ${reg}`;
                }
                break;

            // ANA B to ANA A (0xA0-0xA7)
            case 0xA0: case 0xA1: case 0xA2: case 0xA3:
            case 0xA4: case 0xA5: case 0xA6: case 0xA7:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0xA0];
                    const val = this.getReg(reg);
                    this.registers.A = this.registers.A & val;
                    this.updateFlags(this.registers.A, false, true);
                    instruction = `ANA ${reg}`;
                }
                break;

            // XRA B to XRA A (0xA8-0xAF)
            case 0xA8: case 0xA9: case 0xAA: case 0xAB:
            case 0xAC: case 0xAD: case 0xAE: case 0xAF:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0xA8];
                    const val = this.getReg(reg);
                    this.registers.A = this.registers.A ^ val;
                    this.updateFlags(this.registers.A, false, false);
                    instruction = `XRA ${reg}`;
                }
                break;

            // ORA B to ORA A (0xB0-0xB7)
            case 0xB0: case 0xB1: case 0xB2: case 0xB3:
            case 0xB4: case 0xB5: case 0xB6: case 0xB7:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0xB0];
                    const val = this.getReg(reg);
                    this.registers.A = this.registers.A | val;
                    this.updateFlags(this.registers.A, false, false);
                    instruction = `ORA ${reg}`;
                }
                break;

            // CMP B to CMP A (0xB8-0xBF)
            case 0xB8: case 0xB9: case 0xBA: case 0xBB:
            case 0xBC: case 0xBD: case 0xBE: case 0xBF:
                {
                    const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
                    const reg = regs[opcode - 0xB8];
                    const val = this.getReg(reg);
                    const result = this.registers.A - val;
                    const auxCarry = (this.registers.A & 0x0F) < (val & 0x0F);
                    this.updateFlags(result & 0xFF, result < 0, auxCarry);
                    instruction = `CMP ${reg}`;
                }
                break;

            // RNZ
            case 0xC0:
                if (!this.flags.Z) {
                    this.PC = this.popStack();
                }
                instruction = 'RNZ';
                break;

            // POP B
            case 0xC1:
                this.setRegPair('B', this.popStack());
                instruction = 'POP B';
                break;

            // JNZ addr
            case 0xC2:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.Z) {
                        this.PC = addr;
                    }
                    instruction = `JNZ ${this.formatHex16(addr)}`;
                }
                break;

            // JMP addr
            case 0xC3:
                {
                    const addr = this.fetchWord();
                    this.PC = addr;
                    instruction = `JMP ${this.formatHex16(addr)}`;
                }
                break;

            // CNZ addr
            case 0xC4:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.Z) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CNZ ${this.formatHex16(addr)}`;
                }
                break;

            // PUSH B
            case 0xC5:
                this.pushStack(this.getRegPair('B'));
                instruction = 'PUSH B';
                break;

            // ADI d8
            case 0xC6:
                {
                    const data = this.fetchByte();
                    const result = this.registers.A + data;
                    const auxCarry = ((this.registers.A & 0x0F) + (data & 0x0F)) > 0x0F;
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result > 0xFF, auxCarry);
                    instruction = `ADI ${this.formatHex8(data)}`;
                }
                break;

            // RST 0
            case 0xC7:
                this.pushStack(this.PC);
                this.PC = 0x0000;
                instruction = 'RST 0';
                break;

            // RZ
            case 0xC8:
                if (this.flags.Z) {
                    this.PC = this.popStack();
                }
                instruction = 'RZ';
                break;

            // RET
            case 0xC9:
                this.PC = this.popStack();
                instruction = 'RET';
                break;

            // JZ addr
            case 0xCA:
                {
                    const addr = this.fetchWord();
                    if (this.flags.Z) {
                        this.PC = addr;
                    }
                    instruction = `JZ ${this.formatHex16(addr)}`;
                }
                break;

            // CZ addr
            case 0xCC:
                {
                    const addr = this.fetchWord();
                    if (this.flags.Z) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CZ ${this.formatHex16(addr)}`;
                }
                break;

            // CALL addr
            case 0xCD:
                {
                    const addr = this.fetchWord();
                    this.pushStack(this.PC);
                    this.PC = addr;
                    instruction = `CALL ${this.formatHex16(addr)}`;
                }
                break;

            // ACI d8
            case 0xCE:
                {
                    const data = this.fetchByte();
                    const carry = this.flags.CY;
                    const result = this.registers.A + data + carry;
                    const auxCarry = ((this.registers.A & 0x0F) + (data & 0x0F) + carry) > 0x0F;
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result > 0xFF, auxCarry);
                    instruction = `ACI ${this.formatHex8(data)}`;
                }
                break;

            // RST 1
            case 0xCF:
                this.pushStack(this.PC);
                this.PC = 0x0008;
                instruction = 'RST 1';
                break;

            // RNC
            case 0xD0:
                if (!this.flags.CY) {
                    this.PC = this.popStack();
                }
                instruction = 'RNC';
                break;

            // POP D
            case 0xD1:
                this.setRegPair('D', this.popStack());
                instruction = 'POP D';
                break;

            // JNC addr
            case 0xD2:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.CY) {
                        this.PC = addr;
                    }
                    instruction = `JNC ${this.formatHex16(addr)}`;
                }
                break;

            // OUT port
            case 0xD3:
                {
                    const port = this.fetchByte();
                    // I/O not fully implemented - just log it
                    instruction = `OUT ${this.formatHex8(port)}`;
                }
                break;

            // CNC addr
            case 0xD4:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.CY) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CNC ${this.formatHex16(addr)}`;
                }
                break;

            // PUSH D
            case 0xD5:
                this.pushStack(this.getRegPair('D'));
                instruction = 'PUSH D';
                break;

            // SUI d8
            case 0xD6:
                {
                    const data = this.fetchByte();
                    const result = this.registers.A - data;
                    const auxCarry = (this.registers.A & 0x0F) < (data & 0x0F);
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result < 0, auxCarry);
                    instruction = `SUI ${this.formatHex8(data)}`;
                }
                break;

            // RST 2
            case 0xD7:
                this.pushStack(this.PC);
                this.PC = 0x0010;
                instruction = 'RST 2';
                break;

            // RC
            case 0xD8:
                if (this.flags.CY) {
                    this.PC = this.popStack();
                }
                instruction = 'RC';
                break;

            // JC addr
            case 0xDA:
                {
                    const addr = this.fetchWord();
                    if (this.flags.CY) {
                        this.PC = addr;
                    }
                    instruction = `JC ${this.formatHex16(addr)}`;
                }
                break;

            // IN port
            case 0xDB:
                {
                    const port = this.fetchByte();
                    // I/O not fully implemented - return 0
                    this.registers.A = 0;
                    instruction = `IN ${this.formatHex8(port)}`;
                }
                break;

            // CC addr
            case 0xDC:
                {
                    const addr = this.fetchWord();
                    if (this.flags.CY) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CC ${this.formatHex16(addr)}`;
                }
                break;

            // SBI d8
            case 0xDE:
                {
                    const data = this.fetchByte();
                    const carry = this.flags.CY;
                    const result = this.registers.A - data - carry;
                    const auxCarry = (this.registers.A & 0x0F) < ((data & 0x0F) + carry);
                    this.registers.A = result & 0xFF;
                    this.updateFlags(this.registers.A, result < 0, auxCarry);
                    instruction = `SBI ${this.formatHex8(data)}`;
                }
                break;

            // RST 3
            case 0xDF:
                this.pushStack(this.PC);
                this.PC = 0x0018;
                instruction = 'RST 3';
                break;

            // RPO
            case 0xE0:
                if (!this.flags.P) {
                    this.PC = this.popStack();
                }
                instruction = 'RPO';
                break;

            // POP H
            case 0xE1:
                this.setRegPair('H', this.popStack());
                instruction = 'POP H';
                break;

            // JPO addr
            case 0xE2:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.P) {
                        this.PC = addr;
                    }
                    instruction = `JPO ${this.formatHex16(addr)}`;
                }
                break;

            // XTHL
            case 0xE3:
                {
                    const temp = this.getRegPair('H');
                    this.registers.L = this.memory[this.SP];
                    this.registers.H = this.memory[(this.SP + 1) & 0xFFFF];
                    this.memory[this.SP] = temp & 0xFF;
                    this.memory[(this.SP + 1) & 0xFFFF] = (temp >> 8) & 0xFF;
                    instruction = 'XTHL';
                }
                break;

            // CPO addr
            case 0xE4:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.P) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CPO ${this.formatHex16(addr)}`;
                }
                break;

            // PUSH H
            case 0xE5:
                this.pushStack(this.getRegPair('H'));
                instruction = 'PUSH H';
                break;

            // ANI d8
            case 0xE6:
                {
                    const data = this.fetchByte();
                    this.registers.A = this.registers.A & data;
                    this.updateFlags(this.registers.A, false, true);
                    instruction = `ANI ${this.formatHex8(data)}`;
                }
                break;

            // RST 4
            case 0xE7:
                this.pushStack(this.PC);
                this.PC = 0x0020;
                instruction = 'RST 4';
                break;

            // RPE
            case 0xE8:
                if (this.flags.P) {
                    this.PC = this.popStack();
                }
                instruction = 'RPE';
                break;

            // PCHL
            case 0xE9:
                this.PC = this.getRegPair('H');
                instruction = 'PCHL';
                break;

            // JPE addr
            case 0xEA:
                {
                    const addr = this.fetchWord();
                    if (this.flags.P) {
                        this.PC = addr;
                    }
                    instruction = `JPE ${this.formatHex16(addr)}`;
                }
                break;

            // XCHG
            case 0xEB:
                {
                    const temp = this.getRegPair('H');
                    this.setRegPair('H', this.getRegPair('D'));
                    this.setRegPair('D', temp);
                    instruction = 'XCHG';
                }
                break;

            // CPE addr
            case 0xEC:
                {
                    const addr = this.fetchWord();
                    if (this.flags.P) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CPE ${this.formatHex16(addr)}`;
                }
                break;

            // XRI d8
            case 0xEE:
                {
                    const data = this.fetchByte();
                    this.registers.A = this.registers.A ^ data;
                    this.updateFlags(this.registers.A, false, false);
                    instruction = `XRI ${this.formatHex8(data)}`;
                }
                break;

            // RST 5
            case 0xEF:
                this.pushStack(this.PC);
                this.PC = 0x0028;
                instruction = 'RST 5';
                break;

            // RP
            case 0xF0:
                if (!this.flags.S) {
                    this.PC = this.popStack();
                }
                instruction = 'RP';
                break;

            // POP PSW
            case 0xF1:
                this.setRegPair('PSW', this.popStack());
                instruction = 'POP PSW';
                break;

            // JP addr
            case 0xF2:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.S) {
                        this.PC = addr;
                    }
                    instruction = `JP ${this.formatHex16(addr)}`;
                }
                break;

            // DI
            case 0xF3:
                instruction = 'DI';
                break;

            // CP addr
            case 0xF4:
                {
                    const addr = this.fetchWord();
                    if (!this.flags.S) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CP ${this.formatHex16(addr)}`;
                }
                break;

            // PUSH PSW
            case 0xF5:
                this.pushStack(this.getRegPair('PSW'));
                instruction = 'PUSH PSW';
                break;

            // ORI d8
            case 0xF6:
                {
                    const data = this.fetchByte();
                    this.registers.A = this.registers.A | data;
                    this.updateFlags(this.registers.A, false, false);
                    instruction = `ORI ${this.formatHex8(data)}`;
                }
                break;

            // RST 6
            case 0xF7:
                this.pushStack(this.PC);
                this.PC = 0x0030;
                instruction = 'RST 6';
                break;

            // RM
            case 0xF8:
                if (this.flags.S) {
                    this.PC = this.popStack();
                }
                instruction = 'RM';
                break;

            // SPHL
            case 0xF9:
                this.SP = this.getRegPair('H');
                instruction = 'SPHL';
                break;

            // JM addr
            case 0xFA:
                {
                    const addr = this.fetchWord();
                    if (this.flags.S) {
                        this.PC = addr;
                    }
                    instruction = `JM ${this.formatHex16(addr)}`;
                }
                break;

            // EI
            case 0xFB:
                instruction = 'EI';
                break;

            // CM addr
            case 0xFC:
                {
                    const addr = this.fetchWord();
                    if (this.flags.S) {
                        this.pushStack(this.PC);
                        this.PC = addr;
                    }
                    instruction = `CM ${this.formatHex16(addr)}`;
                }
                break;

            // CPI d8
            case 0xFE:
                {
                    const data = this.fetchByte();
                    const result = this.registers.A - data;
                    const auxCarry = (this.registers.A & 0x0F) < (data & 0x0F);
                    this.updateFlags(result & 0xFF, result < 0, auxCarry);
                    instruction = `CPI ${this.formatHex8(data)}`;
                }
                break;

            // RST 7
            case 0xFF:
                this.pushStack(this.PC);
                this.PC = 0x0038;
                instruction = 'RST 7';
                break;

            default:
                instruction = `Unknown opcode: ${this.formatHex8(opcode)}`;
        }

        const logEntry = {
            address: startPC,
            instruction: instruction,
            opcode: opcode,
            registers: { ...this.registers },
            flags: { ...this.flags },
            PC: this.PC,
            SP: this.SP
        };

        this.executionLog.push(logEntry);

        return {
            halted: this.halted,
            instruction: instruction,
            address: startPC
        };
    }

    // Run until HLT or max steps
    run(maxSteps = 10000) {
        this.running = true;
        let steps = 0;
        this.lastInstructions = [];

        while (!this.halted && steps < maxSteps && this.running) {
            const result = this.step();
            steps++;
            
            // Keep track of last 10 instructions for debugging
            this.lastInstructions.push(`${result.address.toString(16).toUpperCase().padStart(4, '0')}: ${result.instruction}`);
            if (this.lastInstructions.length > 10) {
                this.lastInstructions.shift();
            }

            // Check for breakpoints
            if (this.breakpoints.has(this.PC)) {
                break;
            }
        }

        this.running = false;
        return steps;
    }
    
    // Get last executed instructions (for debugging)
    getLastInstructions() {
        return this.lastInstructions || [];
    }

    // Stop execution
    stop() {
        this.running = false;
    }

    // Helper functions for formatting
    formatHex8(value) {
        return value.toString(16).toUpperCase().padStart(2, '0') + 'H';
    }

    formatHex16(value) {
        return value.toString(16).toUpperCase().padStart(4, '0') + 'H';
    }

    // Get memory range
    getMemoryRange(start, end) {
        const result = [];
        for (let addr = start; addr <= end; addr++) {
            result.push({
                address: addr,
                value: this.memory[addr]
            });
        }
        return result;
    }

    // Set memory value
    setMemory(address, value) {
        this.memory[address & 0xFFFF] = value & 0xFF;
    }

    // Get current state
    getState() {
        return {
            registers: { ...this.registers },
            SP: this.SP,
            PC: this.PC,
            flags: { ...this.flags },
            halted: this.halted
        };
    }
}

// Create global simulator instance
const simulator = new Simulator();
