// 8085 Assembler
class Assembler {
    constructor() {
        this.labels = {};
        this.machineCode = [];
        this.errors = [];
        this.startAddress = 0x0000;
    }

    // Parse hex value from string
    parseHex(value) {
        value = value.trim().toUpperCase();
        // Remove 'H' suffix if present
        if (value.endsWith('H')) {
            value = value.slice(0, -1);
        }
        // Remove '0x' prefix if present
        if (value.startsWith('0X')) {
            value = value.slice(2);
        }
        const num = parseInt(value, 16);
        if (isNaN(num)) {
            return null;
        }
        return num;
    }

    // Parse decimal value from string
    parseDecimal(value) {
        value = value.trim();
        if (value.endsWith('D')) {
            value = value.slice(0, -1);
        }
        const num = parseInt(value, 10);
        if (isNaN(num)) {
            return null;
        }
        return num;
    }

    // Parse binary value from string
    parseBinary(value) {
        value = value.trim().toUpperCase();
        if (value.endsWith('B')) {
            value = value.slice(0, -1);
        }
        const num = parseInt(value, 2);
        if (isNaN(num)) {
            return null;
        }
        return num;
    }

    // Parse any number format
    parseNumber(value) {
        value = value.trim().toUpperCase();
        
        // Check for binary
        if (value.endsWith('B')) {
            return this.parseBinary(value);
        }
        // Check for decimal
        if (value.endsWith('D')) {
            return this.parseDecimal(value);
        }
        // Check for hex with H suffix
        if (value.endsWith('H')) {
            return this.parseHex(value);
        }
        // Check for hex with 0x prefix
        if (value.startsWith('0X')) {
            return this.parseHex(value);
        }
        // Default: try to parse as hex (for values like FF, 3E, etc)
        // If it contains letters A-F, treat as hex
        if (/[A-F]/.test(value)) {
            return this.parseHex(value);
        }
        // Pure numbers default to hex in assembly context
        return this.parseHex(value);
    }

    // First pass: collect labels
    firstPass(lines) {
        this.labels = {};
        let address = this.startAddress;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            // Remove comments
            const commentIndex = line.indexOf(';');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex).trim();
            }

            if (!line) continue;

            // Check for ORG directive
            if (line.toUpperCase().startsWith('ORG')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                    const addr = this.parseNumber(parts[1]);
                    if (addr !== null) {
                        address = addr;
                        this.startAddress = addr;
                    }
                }
                continue;
            }

            // Check for label
            if (line.includes(':')) {
                const labelParts = line.split(':');
                const labelName = labelParts[0].trim().toUpperCase();
                this.labels[labelName] = address;
                line = labelParts.slice(1).join(':').trim();
            }

            if (!line) continue;

            // Calculate instruction size
            const size = this.getInstructionSize(line);
            address += size;
        }
    }

    // Get instruction size in bytes
    getInstructionSize(line) {
        const parts = line.trim().toUpperCase().split(/[\s,]+/);
        const mnemonic = parts[0];

        // Check for DB (define byte) directive
        if (mnemonic === 'DB') {
            return parts.length - 1;
        }

        // Check for DW (define word) directive
        if (mnemonic === 'DW') {
            return (parts.length - 1) * 2;
        }

        // Build instruction key for lookup
        let key = mnemonic;
        
        // For instructions with register operands
        if (parts.length >= 2) {
            const operand1 = parts[1].replace(',', '');
            
            // Check if it's a register-only instruction
            if (['MOV', 'ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'ORA', 'XRA', 'CMP', 
                 'INR', 'DCR', 'INX', 'DCX', 'DAD', 'PUSH', 'POP', 'LDAX', 'STAX'].includes(mnemonic)) {
                
                if (mnemonic === 'MOV' && parts.length >= 3) {
                    key = `MOV ${operand1},${parts[2]}`;
                } else {
                    key = `${mnemonic} ${operand1}`;
                }
            } else if (['MVI', 'LXI'].includes(mnemonic)) {
                key = `${mnemonic} ${operand1}`;
            } else if (mnemonic === 'RST') {
                key = `RST ${operand1}`;
            }
        }

        // Look up in opcode table
        if (OPCODE_TABLE[key]) {
            // Check if it needs immediate data
            if (IMMEDIATE_8BIT.includes(key)) {
                return 2;
            }
            if (IMMEDIATE_16BIT.includes(key) || IMMEDIATE_16BIT.includes(mnemonic)) {
                return 3;
            }
            return 1;
        }

        // Check by mnemonic alone
        if (OPCODE_TABLE[mnemonic]) {
            if (IMMEDIATE_16BIT.includes(mnemonic)) {
                return 3;
            }
            return 1;
        }

        return 1; // Default
    }

    // Second pass: generate machine code
    secondPass(lines) {
        this.machineCode = [];
        this.errors = [];
        let address = this.startAddress;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            const originalLine = line;
            
            // Remove comments
            const commentIndex = line.indexOf(';');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex).trim();
            }

            if (!line) continue;

            // Check for ORG directive
            if (line.toUpperCase().startsWith('ORG')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                    const addr = this.parseNumber(parts[1]);
                    if (addr !== null) {
                        address = addr;
                    }
                }
                continue;
            }

            // Remove label if present
            if (line.includes(':')) {
                const labelParts = line.split(':');
                line = labelParts.slice(1).join(':').trim();
            }

            if (!line) continue;

            // Parse instruction
            const result = this.parseInstruction(line, address, i + 1);
            
            if (result.error) {
                this.errors.push({ line: i + 1, message: result.error, source: originalLine });
            } else {
                for (const byte of result.bytes) {
                    this.machineCode.push({
                        address: address,
                        byte: byte,
                        source: line
                    });
                    address++;
                }
            }
        }

        return {
            success: this.errors.length === 0,
            machineCode: this.machineCode,
            errors: this.errors
        };
    }

    // Parse a single instruction
    parseInstruction(line, currentAddress, lineNum) {
        const parts = line.toUpperCase().split(/[\s,]+/).filter(p => p);
        const mnemonic = parts[0];
        const bytes = [];

        // Handle DB directive
        if (mnemonic === 'DB') {
            for (let i = 1; i < parts.length; i++) {
                const val = this.parseNumber(parts[i]);
                if (val === null || val > 255 || val < 0) {
                    return { error: `Invalid byte value: ${parts[i]}` };
                }
                bytes.push(val);
            }
            return { bytes };
        }

        // Handle DW directive
        if (mnemonic === 'DW') {
            for (let i = 1; i < parts.length; i++) {
                let val = this.parseNumber(parts[i]);
                if (val === null) {
                    // Check if it's a label
                    if (this.labels[parts[i]] !== undefined) {
                        val = this.labels[parts[i]];
                    } else {
                        return { error: `Invalid word value: ${parts[i]}` };
                    }
                }
                bytes.push(val & 0xFF);        // Low byte
                bytes.push((val >> 8) & 0xFF); // High byte
            }
            return { bytes };
        }

        // Build instruction key
        let key = mnemonic;
        let operand1 = parts.length > 1 ? parts[1] : null;
        let operand2 = parts.length > 2 ? parts[2] : null;

        // Handle MOV instruction
        if (mnemonic === 'MOV') {
            if (!operand1 || !operand2) {
                return { error: 'MOV requires two operands' };
            }
            key = `MOV ${operand1},${operand2}`;
            if (!OPCODE_TABLE[key]) {
                return { error: `Invalid MOV instruction: ${line}` };
            }
            bytes.push(parseInt(OPCODE_TABLE[key], 16));
            return { bytes };
        }

        // Handle MVI instruction
        if (mnemonic === 'MVI') {
            if (!operand1 || !operand2) {
                return { error: 'MVI requires register and data' };
            }
            key = `MVI ${operand1}`;
            if (!OPCODE_TABLE[key]) {
                return { error: `Invalid MVI instruction: ${line}` };
            }
            bytes.push(parseInt(OPCODE_TABLE[key], 16));
            
            const data = this.parseNumber(operand2);
            if (data === null || data > 255 || data < 0) {
                return { error: `Invalid immediate data: ${operand2}` };
            }
            bytes.push(data);
            return { bytes };
        }

        // Handle LXI instruction
        if (mnemonic === 'LXI') {
            if (!operand1 || !operand2) {
                return { error: 'LXI requires register pair and data' };
            }
            key = `LXI ${operand1}`;
            if (!OPCODE_TABLE[key]) {
                return { error: `Invalid LXI instruction: ${line}` };
            }
            bytes.push(parseInt(OPCODE_TABLE[key], 16));
            
            let data = this.parseNumber(operand2);
            if (data === null) {
                // Check if it's a label
                if (this.labels[operand2] !== undefined) {
                    data = this.labels[operand2];
                } else {
                    return { error: `Invalid 16-bit data: ${operand2}` };
                }
            }
            bytes.push(data & 0xFF);        // Low byte first
            bytes.push((data >> 8) & 0xFF); // High byte
            return { bytes };
        }

        // Handle register instructions (ADD, SUB, etc.)
        const regInstructions = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'ORA', 'XRA', 'CMP', 
                                 'INR', 'DCR', 'INX', 'DCX', 'DAD', 'PUSH', 'POP', 
                                 'LDAX', 'STAX'];
        if (regInstructions.includes(mnemonic)) {
            if (!operand1) {
                return { error: `${mnemonic} requires an operand` };
            }
            key = `${mnemonic} ${operand1}`;
            if (!OPCODE_TABLE[key]) {
                return { error: `Invalid ${mnemonic} instruction: ${line}` };
            }
            bytes.push(parseInt(OPCODE_TABLE[key], 16));
            return { bytes };
        }

        // Handle immediate instructions (ADI, SUI, etc.)
        const immInstructions = ['ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'ORI', 'XRI', 'CPI'];
        if (immInstructions.includes(mnemonic)) {
            if (!operand1) {
                return { error: `${mnemonic} requires immediate data` };
            }
            if (!OPCODE_TABLE[mnemonic]) {
                return { error: `Unknown instruction: ${mnemonic}` };
            }
            bytes.push(parseInt(OPCODE_TABLE[mnemonic], 16));
            
            const data = this.parseNumber(operand1);
            if (data === null || data > 255 || data < 0) {
                return { error: `Invalid immediate data: ${operand1}` };
            }
            bytes.push(data);
            return { bytes };
        }

        // Handle I/O instructions
        if (mnemonic === 'IN' || mnemonic === 'OUT') {
            if (!operand1) {
                return { error: `${mnemonic} requires port address` };
            }
            bytes.push(parseInt(OPCODE_TABLE[mnemonic], 16));
            
            const port = this.parseNumber(operand1);
            if (port === null || port > 255 || port < 0) {
                return { error: `Invalid port address: ${operand1}` };
            }
            bytes.push(port);
            return { bytes };
        }

        // Handle jump/call instructions
        const jumpInstructions = ['JMP', 'JC', 'JNC', 'JZ', 'JNZ', 'JP', 'JM', 'JPE', 'JPO',
                                  'CALL', 'CC', 'CNC', 'CZ', 'CNZ', 'CP', 'CM', 'CPE', 'CPO'];
        if (jumpInstructions.includes(mnemonic)) {
            if (!operand1) {
                return { error: `${mnemonic} requires an address` };
            }
            if (!OPCODE_TABLE[mnemonic]) {
                return { error: `Unknown instruction: ${mnemonic}` };
            }
            bytes.push(parseInt(OPCODE_TABLE[mnemonic], 16));
            
            let addr = this.parseNumber(operand1);
            if (addr === null) {
                // Check if it's a label
                if (this.labels[operand1] !== undefined) {
                    addr = this.labels[operand1];
                } else {
                    return { error: `Unknown label: ${operand1}` };
                }
            }
            bytes.push(addr & 0xFF);        // Low byte
            bytes.push((addr >> 8) & 0xFF); // High byte
            return { bytes };
        }

        // Handle LDA, STA, LHLD, SHLD
        const memInstructions = ['LDA', 'STA', 'LHLD', 'SHLD'];
        if (memInstructions.includes(mnemonic)) {
            if (!operand1) {
                return { error: `${mnemonic} requires an address` };
            }
            bytes.push(parseInt(OPCODE_TABLE[mnemonic], 16));
            
            let addr = this.parseNumber(operand1);
            if (addr === null) {
                if (this.labels[operand1] !== undefined) {
                    addr = this.labels[operand1];
                } else {
                    return { error: `Invalid address: ${operand1}` };
                }
            }
            bytes.push(addr & 0xFF);
            bytes.push((addr >> 8) & 0xFF);
            return { bytes };
        }

        // Handle RST instruction
        if (mnemonic === 'RST') {
            if (!operand1) {
                return { error: 'RST requires a number (0-7)' };
            }
            key = `RST ${operand1}`;
            if (!OPCODE_TABLE[key]) {
                return { error: `Invalid RST number: ${operand1}` };
            }
            bytes.push(parseInt(OPCODE_TABLE[key], 16));
            return { bytes };
        }

        // Handle single-byte instructions
        if (OPCODE_TABLE[mnemonic]) {
            bytes.push(parseInt(OPCODE_TABLE[mnemonic], 16));
            return { bytes };
        }

        return { error: `Unknown instruction: ${mnemonic}` };
    }

    // Main assemble function
    assemble(code) {
        const lines = code.split('\n');
        
        // First pass: collect labels
        this.firstPass(lines);
        
        // Second pass: generate machine code
        return this.secondPass(lines);
    }

    // Format machine code output
    formatOutput() {
        const output = [];
        let currentAddr = -1;
        let currentLine = null;

        for (const item of this.machineCode) {
            if (currentAddr === -1 || item.address !== currentAddr + 1 || item.source !== currentLine.source) {
                if (currentLine) {
                    output.push(currentLine);
                }
                currentLine = {
                    address: item.address,
                    bytes: [item.byte],
                    source: item.source
                };
            } else {
                currentLine.bytes.push(item.byte);
            }
            currentAddr = item.address;
        }
        
        if (currentLine) {
            output.push(currentLine);
        }

        return output;
    }
}

// Create global assembler instance
const assembler = new Assembler();
