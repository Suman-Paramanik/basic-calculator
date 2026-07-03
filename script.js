// Mathematical Evaluator and Calculator Logic

class Calculator {
    constructor() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.isRadian = true;
        this.history = [];
        this.shouldResetScreen = false;
        this.isError = false;

        this.currentOperandElement = document.getElementById('currentOperand');
        this.previousOperandElement = document.getElementById('previousOperand');
        this.historyListElement = document.getElementById('historyList');
        
        this.init();
    }

    init() {
        const savedHistory = localStorage.getItem('calcHistory');
        if (savedHistory) {
            this.history = JSON.parse(savedHistory);
            this.renderHistory();
        }
        this.updateDisplay();
    }

    clear() {
        this.currentOperand = '0';
        this.shouldResetScreen = false;
        this.isError = false;
        this.updateDisplay();
    }

    allClear() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.shouldResetScreen = false;
        this.isError = false;
        this.updateDisplay();
    }

    delete() {
        if (this.shouldResetScreen || this.isError) {
            this.clear();
            return;
        }
        
        if (this.currentOperand.length === 1 || (this.currentOperand.length === 2 && this.currentOperand.startsWith('-'))) {
            this.currentOperand = '0';
        } else {
            this.currentOperand = this.currentOperand.slice(0, -1);
        }
        this.updateDisplay();
    }

    appendNumber(number) {
        if (this.isError) this.clear();
        if (this.shouldResetScreen) {
            this.currentOperand = '';
            this.shouldResetScreen = false;
        }
        
        // Prevent multiple leading zeros
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number;
            this.updateDisplay();
            return;
        }
        
        this.currentOperand = this.currentOperand.toString() + number.toString();
        this.updateDisplay();
    }

    appendDecimal() {
        if (this.isError) this.clear();
        if (this.shouldResetScreen) {
            this.currentOperand = '0';
            this.shouldResetScreen = false;
        }
        
        this.currentOperand += '.';
        this.updateDisplay();
    }

    appendOperator(operator) {
        if (this.isError) this.clear();
        if (this.shouldResetScreen) {
            this.shouldResetScreen = false;
        }
        this.currentOperand += operator;
        this.updateDisplay();
    }

    appendFunction(fnName) {
        if (this.isError) this.clear();
        if (this.shouldResetScreen) {
            this.currentOperand = '';
            this.shouldResetScreen = false;
        }
        
        if (this.currentOperand === '0') {
            this.currentOperand = fnName + '(';
        } else {
            // Check if we need implicit multiplication
            const lastChar = this.currentOperand.slice(-1);
            if (/[0-9\)]/.test(lastChar)) {
                this.currentOperand += '×' + fnName + '(';
            } else {
                this.currentOperand += fnName + '(';
            }
        }
        this.updateDisplay();
    }

    toggleAngleUnit() {
        this.isRadian = !this.isRadian;
        const btn = document.getElementById('degRadBtn');
        if(btn) btn.innerText = this.isRadian ? 'RAD' : 'DEG';
    }

    // Helper functions for safe evaluation
    static factorial(n) {
        if (n < 0 || !Number.isInteger(n)) return NaN;
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    evaluate() {
        if (this.isError || this.currentOperand === '0' || this.currentOperand === '') return;
        
        let expression = this.currentOperand;
        this.previousOperand = expression + ' =';
        
        try {
            let result = this.calculate(expression);
            
            // Format result to avoid very long decimals
            result = this.formatResult(result);
            
            if (!isFinite(result) || isNaN(result)) {
                throw new Error("Invalid");
            }
            
            this.addToHistory(expression, result);
            this.currentOperand = result.toString();
            this.shouldResetScreen = true;
        } catch (e) {
            this.currentOperand = 'Error';
            this.isError = true;
            this.shouldResetScreen = true;
        }
        
        this.updateDisplay();
    }

    formatResult(number) {
        const result = parseFloat(number);
        if (result.toString().length > 12) {
            if (Math.abs(result) > 1e10 || Math.abs(result) < 1e-10) {
                return result.toExponential(6);
            }
            return parseFloat(result.toFixed(8));
        }
        return result;
    }

    calculate(expr) {
        let parsed = expr;

        // Replace constants
        parsed = parsed.replace(/π/g, 'Math.PI');
        parsed = parsed.replace(/e(?!x)/g, 'Math.E'); // e but not exp

        // Replace operators
        parsed = parsed.replace(/×/g, '*');
        parsed = parsed.replace(/÷/g, '/');
        parsed = parsed.replace(/\^/g, '**');

        // Handle functions
        const functions = {
            'sin⁻¹': this.isRadian ? 'Math.asin' : 'asind',
            'cos⁻¹': this.isRadian ? 'Math.acos' : 'acosd',
            'tan⁻¹': this.isRadian ? 'Math.atan' : 'atand',
            'sin': this.isRadian ? 'Math.sin' : 'sind',
            'cos': this.isRadian ? 'Math.cos' : 'cosd',
            'tan': this.isRadian ? 'Math.tan' : 'tand',
            'log': 'Math.log10',
            'ln': 'Math.log',
            'sqrt': 'Math.sqrt',
            'abs': 'Math.abs'
        };

        const funcKeys = Object.keys(functions).sort((a, b) => b.length - a.length);
        
        for (const key of funcKeys) {
            const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            parsed = parsed.replace(new RegExp(escapedKey, 'g'), functions[key]);
        }

        parsed = parsed.replace(/(\([^)]+\)|\d+(?:\.\d+)?)\s*x²/g, 'Math.pow($1, 2)');
        parsed = parsed.replace(/x²/g, '**2'); // fallback
        parsed = parsed.replace(/x\^y/g, '**'); 
        parsed = parsed.replace(/10\^/g, '10**');
        parsed = parsed.replace(/EXP/g, '*10**');
        parsed = parsed.replace(/E/g, '*10**');

        // Handle percent
        parsed = parsed.replace(/%/g, '/100');

        // Handle inverse
        parsed = parsed.replace(/1\/x/g, '1/');
        
        // Handle √ representation that didn't have parentheses
        parsed = parsed.replace(/√/g, 'Math.sqrt');

        // Handle factorial e.g., 5! -> factorial(5)
        parsed = parsed.replace(/(\d+(?:\.\d+)?)!/g, 'Calculator.factorial($1)');
        
        const evaluateFunc = new Function(
            'Math', 'Calculator', 'sind', 'cosd', 'tand', 'asind', 'acosd', 'atand',
            `return eval(${JSON.stringify(parsed)})`
        );
        
        const sind = x => Math.sin(x * Math.PI / 180);
        const cosd = x => Math.cos(x * Math.PI / 180);
        const tand = x => Math.tan(x * Math.PI / 180);
        const asind = x => Math.asin(x) * 180 / Math.PI;
        const acosd = x => Math.acos(x) * 180 / Math.PI;
        const atand = x => Math.atan(x) * 180 / Math.PI;

        return evaluateFunc(Math, Calculator, sind, cosd, tand, asind, acosd, atand);
    }

    addToHistory(equation, result) {
        this.history.unshift({ equation, result });
        if (this.history.length > 50) this.history.pop();
        localStorage.setItem('calcHistory', JSON.stringify(this.history));
        this.renderHistory();
    }

    clearHistory() {
        this.history = [];
        localStorage.removeItem('calcHistory');
        this.renderHistory();
    }

    renderHistory() {
        if (!this.historyListElement) return;
        this.historyListElement.innerHTML = '';
        if (this.history.length === 0) {
            this.historyListElement.innerHTML = '<div class="history-empty">No history yet</div>';
            return;
        }

        this.history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            historyItem.innerHTML = `
                <div class="history-equation">${item.equation} =</div>
                <div class="history-result">${item.result}</div>
            `;
            historyItem.addEventListener('click', () => {
                this.currentOperand = item.result.toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
            });
            this.historyListElement.appendChild(historyItem);
        });
    }

    updateDisplay() {
        if (this.currentOperandElement) {
            this.currentOperandElement.innerText = this.currentOperand;
            this.currentOperandElement.scrollLeft = this.currentOperandElement.scrollWidth;
        }
        if (this.previousOperandElement) {
            this.previousOperandElement.innerText = this.previousOperand;
        }
    }
}

const calculator = new Calculator();

// Event Listeners for UI
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;

        // Add animation class
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);

        if (btn.classList.contains('num') && !btn.dataset.action) {
            calculator.appendNumber(btn.dataset.number);
            return;
        }

        const action = btn.dataset.action;
        
        switch(action) {
            case 'add': calculator.appendOperator('+'); break;
            case 'subtract': calculator.appendOperator('-'); break;
            case 'multiply': calculator.appendOperator('×'); break;
            case 'divide': calculator.appendOperator('÷'); break;
            case 'decimal': calculator.appendDecimal(); break;
            case 'clear': calculator.clear(); break;
            case 'all-clear': calculator.allClear(); break;
            case 'backspace': calculator.delete(); break;
            case 'equals': calculator.evaluate(); break;
            case 'deg-rad': calculator.toggleAngleUnit(); break;
            case 'open-paren': calculator.appendNumber('('); break;
            case 'close-paren': calculator.appendNumber(')'); break;
            case 'percent': calculator.appendOperator('%'); break;
            case 'pow': calculator.appendOperator('^'); break;
            case 'square': calculator.appendOperator('^2'); break;
            case 'factorial': calculator.appendOperator('!'); break;
            case 'pi': calculator.appendNumber('π'); break;
            case 'e': calculator.appendNumber('e'); break;
            case 'inv': calculator.appendNumber('1/'); break;
            case '10pow': calculator.appendNumber('10^'); break;
            case 'exp': calculator.appendOperator('E'); break;
            case 'sin': case 'cos': case 'tan':
            case 'asin': case 'acos': case 'atan':
            case 'log': case 'ln': case 'abs':
                const displayFnName = action === 'asin' ? 'sin⁻¹' :
                                      action === 'acos' ? 'cos⁻¹' :
                                      action === 'atan' ? 'tan⁻¹' : action;
                calculator.appendFunction(displayFnName);
                break;
            case 'sqrt':
                calculator.appendFunction('√');
                break;
        }
    });
});

// History Toggle
const toggleBtn = document.getElementById('toggleHistoryBtn');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        document.getElementById('historyPanel').classList.toggle('hidden');
    });
}

// Clear History
const clearBtn = document.getElementById('clearHistoryBtn');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        calculator.clearHistory();
    });
}

// Copy to Clipboard
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const text = calculator.currentOperand;
        if (text && text !== 'Error') {
            navigator.clipboard.writeText(text).then(() => {
                const msg = document.getElementById('copyMsg');
                if (msg) {
                    msg.classList.add('show');
                    setTimeout(() => msg.classList.remove('show'), 2000);
                }
            }).catch(err => {
                console.error('Failed to copy!', err);
            });
        }
    });
}

// Keyboard Support
document.addEventListener('keydown', (e) => {
    // Only allow if no modifier keys are pressed (except shift)
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    // Numbers
    if (/^[0-9]$/.test(e.key)) {
        calculator.appendNumber(e.key);
        e.preventDefault();
    }
    
    // Operators
    switch(e.key) {
        case '+': calculator.appendOperator('+'); e.preventDefault(); break;
        case '-': calculator.appendOperator('-'); e.preventDefault(); break;
        case '*': calculator.appendOperator('×'); e.preventDefault(); break;
        case '/': calculator.appendOperator('÷'); e.preventDefault(); break;
        case '.': calculator.appendDecimal(); e.preventDefault(); break;
        case '(': calculator.appendNumber('('); e.preventDefault(); break;
        case ')': calculator.appendNumber(')'); e.preventDefault(); break;
        case '%': calculator.appendOperator('%'); e.preventDefault(); break;
        case '^': calculator.appendOperator('^'); e.preventDefault(); break;
        case '!': calculator.appendOperator('!'); e.preventDefault(); break;
        case 'Enter':
        case '=': 
            calculator.evaluate(); 
            e.preventDefault(); 
            break;
        case 'Backspace': 
            calculator.delete(); 
            e.preventDefault(); 
            break;
        case 'Escape': 
            calculator.allClear(); 
            e.preventDefault(); 
            break;
    }
});
