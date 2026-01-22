// Main Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Code Editor Elements
    const codeInput = document.getElementById('code-input');
    const assembleBtn = document.getElementById('assemble-btn');
    const runBtn = document.getElementById('run-btn');
    const stepBtn = document.getElementById('step-btn');
    const resetBtn = document.getElementById('reset-btn');
    const clearBtn = document.getElementById('clear-btn');
    const machineCodeOutput = document.getElementById('machine-code');
    const executionLog = document.getElementById('execution-log');

    // Register Elements
    const regElements = {
        A: document.getElementById('reg-a'),
        B: document.getElementById('reg-b'),
        C: document.getElementById('reg-c'),
        D: document.getElementById('reg-d'),
        E: document.getElementById('reg-e'),
        H: document.getElementById('reg-h'),
        L: document.getElementById('reg-l'),
        M: document.getElementById('reg-m'),
        SP: document.getElementById('reg-sp'),
        PC: document.getElementById('reg-pc')
    };

    const flagElements = {
        S: document.getElementById('flag-s'),
        Z: document.getElementById('flag-z'),
        AC: document.getElementById('flag-ac'),
        P: document.getElementById('flag-p'),
        CY: document.getElementById('flag-cy')
    };

    // Update display
    function updateDisplay() {
        const state = simulator.getState();
        
        // Update registers
        for (const [reg, el] of Object.entries(regElements)) {
            if (reg === 'SP' || reg === 'PC') {
                el.textContent = state[reg].toString(16).toUpperCase().padStart(4, '0');
            } else if (reg === 'M') {
                const addr = (state.registers.H << 8) | state.registers.L;
                el.textContent = simulator.memory[addr].toString(16).toUpperCase().padStart(2, '0');
            } else {
                el.textContent = state.registers[reg].toString(16).toUpperCase().padStart(2, '0');
            }
        }

        // Update flags
        for (const [flag, el] of Object.entries(flagElements)) {
            el.textContent = state.flags[flag];
            if (state.flags[flag]) {
                el.classList.add('set');
            } else {
                el.classList.remove('set');
            }
        }

        // Update memory view
        updateMemoryView();
    }

    // Log message
    function log(message, type = '') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        executionLog.appendChild(entry);
        executionLog.scrollTop = executionLog.scrollHeight;
    }

    // Clear log
    function clearLog() {
        executionLog.innerHTML = '';
    }

    // Assemble code
    assembleBtn.addEventListener('click', () => {
        const code = codeInput.value;
        clearLog();
        machineCodeOutput.innerHTML = '';

        if (!code.trim()) {
            log('Error: No code to assemble', 'error');
            return;
        }

        const result = assembler.assemble(code);

        if (!result.success) {
            log('Assembly failed with errors:', 'error');
            result.errors.forEach(err => {
                log(`Line ${err.line}: ${err.message}`, 'error');
            });
            return;
        }

        // Display machine code
        const formatted = assembler.formatOutput();
        formatted.forEach(line => {
            const div = document.createElement('div');
            div.className = 'machine-code-line';
            
            const addrSpan = document.createElement('span');
            addrSpan.className = 'address';
            addrSpan.textContent = line.address.toString(16).toUpperCase().padStart(4, '0');
            
            const bytesSpan = document.createElement('span');
            bytesSpan.className = 'bytes';
            bytesSpan.textContent = line.bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
            
            const instrSpan = document.createElement('span');
            instrSpan.className = 'instruction';
            instrSpan.textContent = line.source;
            
            div.appendChild(addrSpan);
            div.appendChild(bytesSpan);
            div.appendChild(instrSpan);
            machineCodeOutput.appendChild(div);
        });

        // Load into simulator
        simulator.reset();
        simulator.loadProgram(result.machineCode, assembler.startAddress);
        updateDisplay();

        log(`Assembly successful! ${result.machineCode.length} bytes generated.`, 'success');
        log(`Program loaded at address ${assembler.startAddress.toString(16).toUpperCase().padStart(4, '0')}H`, 'info');
        
        // Show resolved labels for debugging
        const labels = Object.entries(assembler.labels);
        if (labels.length > 0) {
            log(`Labels: ${labels.map(([name, addr]) => `${name}=${addr.toString(16).toUpperCase().padStart(4, '0')}H`).join(', ')}`, 'info');
        }
    });

    // Run program
    runBtn.addEventListener('click', () => {
        if (simulator.halted) {
            log('Program halted. Reset to run again.', 'info');
            return;
        }

        const startPC = simulator.PC;
        log(`Running from ${startPC.toString(16).toUpperCase().padStart(4, '0')}H...`, 'info');
        
        const steps = simulator.run();
        
        updateDisplay();

        if (simulator.halted) {
            log(`Program halted after ${steps} instructions.`, 'success');
        } else {
            const state = simulator.getState();
            log(`Stopped after ${steps} instructions (max limit reached).`, 'warning');
            log(`Last PC: ${state.PC.toString(16).toUpperCase().padStart(4, '0')}H, ` +
                `A=${state.registers.A.toString(16).toUpperCase().padStart(2, '0')} ` +
                `B=${state.registers.B.toString(16).toUpperCase().padStart(2, '0')} ` +
                `C=${state.registers.C.toString(16).toUpperCase().padStart(2, '0')} ` +
                `H=${state.registers.H.toString(16).toUpperCase().padStart(2, '0')} ` +
                `L=${state.registers.L.toString(16).toUpperCase().padStart(2, '0')} ` +
                `Z=${state.flags.Z} CY=${state.flags.CY}`, 'info');
            
            // Show last 10 instructions for debugging
            const lastInstr = simulator.getLastInstructions();
            if (lastInstr.length > 0) {
                log('Last 10 instructions:', 'info');
                lastInstr.forEach(instr => log(`  ${instr}`, 'info'));
            }
        }
    });

    // Step through code
    stepBtn.addEventListener('click', () => {
        if (simulator.halted) {
            log('Program halted. Reset to continue.', 'info');
            return;
        }

        const result = simulator.step();
        updateDisplay();

        log(`${result.address.toString(16).toUpperCase().padStart(4, '0')}: ${result.instruction}`, 'info');

        if (result.halted) {
            log('Program halted.', 'success');
        }
    });

    // Reset simulator
    resetBtn.addEventListener('click', () => {
        simulator.reset();
        
        // Reload program if assembled
        if (assembler.machineCode.length > 0) {
            simulator.loadProgram(assembler.machineCode, assembler.startAddress);
        }
        
        updateDisplay();
        clearLog();
        log('Simulator reset.', 'info');
    });

    // Clear code
    clearBtn.addEventListener('click', () => {
        codeInput.value = '';
        machineCodeOutput.innerHTML = '';
        clearLog();
        simulator.reset();
        updateDisplay();
    });

    // Memory View
    const viewStartAddr = document.getElementById('view-start-addr');
    const viewMemoryBtn = document.getElementById('view-memory-btn');
    const memoryView = document.getElementById('memory-view');

    function updateMemoryView() {
        const start = parseInt(viewStartAddr.value, 16) || 0;
        memoryView.innerHTML = '';

        for (let i = 0; i < 64; i++) {
            const addr = (start + i) & 0xFFFF;
            const cell = document.createElement('div');
            cell.className = 'memory-cell';
            
            if (addr === simulator.PC) {
                cell.classList.add('pc-highlight');
            }
            
            const addrSpan = document.createElement('span');
            addrSpan.className = 'addr';
            addrSpan.textContent = addr.toString(16).toUpperCase().padStart(4, '0');
            
            const dataSpan = document.createElement('span');
            dataSpan.className = 'data';
            dataSpan.textContent = simulator.memory[addr].toString(16).toUpperCase().padStart(2, '0');
            
            cell.appendChild(addrSpan);
            cell.appendChild(dataSpan);
            memoryView.appendChild(cell);
        }
    }

    viewMemoryBtn.addEventListener('click', updateMemoryView);

    // Instructions Tab
    const instructionSearch = document.getElementById('instruction-search');
    const instructionList = document.getElementById('instruction-list');
    const categoryBtns = document.querySelectorAll('.cat-btn');

    function renderInstructions(filter = '', category = 'all') {
        instructionList.innerHTML = '';
        
        const filtered = INSTRUCTIONS.filter(instr => {
            const matchesSearch = filter === '' || 
                instr.mnemonic.toLowerCase().includes(filter.toLowerCase()) ||
                instr.description.toLowerCase().includes(filter.toLowerCase()) ||
                instr.opcode.toLowerCase().includes(filter.toLowerCase());
            
            const matchesCategory = category === 'all' || instr.category === category;
            
            return matchesSearch && matchesCategory;
        });

        filtered.forEach(instr => {
            const card = document.createElement('div');
            card.className = 'instruction-card';
            
            card.innerHTML = `
                <div class="mnemonic">${instr.mnemonic}</div>
                <div class="opcode">Opcode: ${instr.opcode} | ${instr.bytes} byte(s)</div>
                <div class="description">${instr.description}</div>
                <span class="category-tag">${instr.category}</span>
            `;
            
            instructionList.appendChild(card);
        });
    }

    instructionSearch.addEventListener('input', (e) => {
        const activeCategory = document.querySelector('.cat-btn.active').dataset.category;
        renderInstructions(e.target.value, activeCategory);
    });

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderInstructions(instructionSearch.value, btn.dataset.category);
        });
    });

    // Converter Tab
    const hexInput = document.getElementById('hex-input');
    const decInput = document.getElementById('dec-input');
    const binInput = document.getElementById('bin-input');
    const octInput = document.getElementById('oct-input');
    const convertClearBtn = document.getElementById('convert-clear');

    function convertFromHex(value) {
        const num = parseInt(value, 16);
        if (!isNaN(num)) {
            decInput.value = num;
            binInput.value = num.toString(2);
            octInput.value = num.toString(8);
        }
    }

    function convertFromDec(value) {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            hexInput.value = num.toString(16).toUpperCase();
            binInput.value = num.toString(2);
            octInput.value = num.toString(8);
        }
    }

    function convertFromBin(value) {
        const num = parseInt(value, 2);
        if (!isNaN(num)) {
            hexInput.value = num.toString(16).toUpperCase();
            decInput.value = num;
            octInput.value = num.toString(8);
        }
    }

    function convertFromOct(value) {
        const num = parseInt(value, 8);
        if (!isNaN(num)) {
            hexInput.value = num.toString(16).toUpperCase();
            decInput.value = num;
            binInput.value = num.toString(2);
        }
    }

    hexInput.addEventListener('input', (e) => {
        if (e.target.value) convertFromHex(e.target.value);
    });

    decInput.addEventListener('input', (e) => {
        if (e.target.value) convertFromDec(e.target.value);
    });

    binInput.addEventListener('input', (e) => {
        if (e.target.value) convertFromBin(e.target.value);
    });

    octInput.addEventListener('input', (e) => {
        if (e.target.value) convertFromOct(e.target.value);
    });

    convertClearBtn.addEventListener('click', () => {
        hexInput.value = '';
        decInput.value = '';
        binInput.value = '';
        octInput.value = '';
    });

    // Memory Editor Tab
    const memStartAddr = document.getElementById('mem-start-addr');
    const memEndAddr = document.getElementById('mem-end-addr');
    const loadMemoryBtn = document.getElementById('load-memory-btn');
    const clearMemoryBtn = document.getElementById('clear-memory-btn');
    const memAddrInput = document.getElementById('mem-addr-input');
    const memDataInput = document.getElementById('mem-data-input');
    const setMemoryBtn = document.getElementById('set-memory-btn');
    const bulkStartAddr = document.getElementById('bulk-start-addr');
    const bulkData = document.getElementById('bulk-data');
    const bulkLoadBtn = document.getElementById('bulk-load-btn');
    const memoryTableBody = document.getElementById('memory-table-body');

    function updateMemoryTable() {
        const start = parseInt(memStartAddr.value, 16) || 0;
        const end = parseInt(memEndAddr.value, 16) || 0xFF;
        
        memoryTableBody.innerHTML = '';
        
        // Round start to nearest 16
        const alignedStart = Math.floor(start / 16) * 16;
        const alignedEnd = Math.ceil((end + 1) / 16) * 16 - 1;

        for (let addr = alignedStart; addr <= alignedEnd; addr += 16) {
            const row = document.createElement('tr');
            
            const addrCell = document.createElement('td');
            addrCell.textContent = addr.toString(16).toUpperCase().padStart(4, '0');
            row.appendChild(addrCell);

            for (let i = 0; i < 16; i++) {
                const cell = document.createElement('td');
                const cellAddr = addr + i;
                
                if (cellAddr <= 0xFFFF) {
                    cell.textContent = simulator.memory[cellAddr].toString(16).toUpperCase().padStart(2, '0');
                    
                    if (cellAddr === simulator.PC) {
                        cell.classList.add('pc-highlight');
                    }
                    
                    // Make cells editable
                    cell.contentEditable = true;
                    cell.dataset.address = cellAddr;
                    
                    cell.addEventListener('blur', (e) => {
                        const newValue = parseInt(e.target.textContent, 16);
                        if (!isNaN(newValue) && newValue >= 0 && newValue <= 255) {
                            simulator.setMemory(cellAddr, newValue);
                            e.target.textContent = newValue.toString(16).toUpperCase().padStart(2, '0');
                        } else {
                            e.target.textContent = simulator.memory[cellAddr].toString(16).toUpperCase().padStart(2, '0');
                        }
                    });

                    cell.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.target.blur();
                        }
                    });
                }
                
                row.appendChild(cell);
            }
            
            memoryTableBody.appendChild(row);
        }
    }

    loadMemoryBtn.addEventListener('click', updateMemoryTable);

    clearMemoryBtn.addEventListener('click', () => {
        const start = parseInt(memStartAddr.value, 16) || 0;
        const end = parseInt(memEndAddr.value, 16) || 0xFF;
        
        for (let addr = start; addr <= end; addr++) {
            simulator.memory[addr] = 0;
        }
        
        updateMemoryTable();
        updateDisplay();
    });

    setMemoryBtn.addEventListener('click', () => {
        const addr = parseInt(memAddrInput.value, 16);
        const data = parseInt(memDataInput.value, 16);
        
        if (!isNaN(addr) && !isNaN(data) && addr >= 0 && addr <= 0xFFFF && data >= 0 && data <= 0xFF) {
            simulator.setMemory(addr, data);
            updateMemoryTable();
            updateDisplay();
            memAddrInput.value = (addr + 1).toString(16).toUpperCase().padStart(4, '0');
            memDataInput.value = '';
            memDataInput.focus();
        }
    });

    bulkLoadBtn.addEventListener('click', () => {
        const start = parseInt(bulkStartAddr.value, 16) || 0;
        const dataStr = bulkData.value.trim();
        
        if (!dataStr) return;
        
        // Parse hex bytes
        const bytes = dataStr.split(/[\s,]+/).map(b => parseInt(b, 16)).filter(b => !isNaN(b));
        
        bytes.forEach((byte, i) => {
            const addr = (start + i) & 0xFFFF;
            simulator.setMemory(addr, byte);
        });
        
        updateMemoryTable();
        updateDisplay();
        
        log(`Loaded ${bytes.length} bytes at ${start.toString(16).toUpperCase().padStart(4, '0')}H`, 'success');
    });

    // Sample program
    codeInput.value = `; 8085 Sample Program
; Add two numbers

ORG 0000H

MVI A, 05H    ; Load 5 into A
MVI B, 03H    ; Load 3 into B
ADD B         ; A = A + B
STA 2050H     ; Store result at 2050H
HLT           ; Halt`;

    // Initialize
    renderInstructions();
    updateDisplay();
    updateMemoryTable();
});
