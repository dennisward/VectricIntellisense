// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ***** Important Debugging Note *****
// If you get a powershell security warning when trying to run or debug the extension,
// just go to source directory (in cmd.exe, not powershell) and:
// npm run watch - there's an issue with the node.js npm.ps1 script not being digitally signed.
// **************************************

// ==================== Type Definitions ====================

interface ApiParameter {
    label: string;
    documentation: string;
}

interface ApiSignature {
    label: string;
    documentation: string;
    parameters: ApiParameter[];
    returns?: string;
}

interface ApiProperty {
    name: string;
    kind: string;
    detail: string;
    documentation: string;
    readOnly: boolean;
}

interface ApiMethod {
    name: string;
    kind: string;
    detail: string;
    documentation: string;
    signature: ApiSignature;
}

interface ApiConstructor {
    label: string;
    documentation: string;
    parameters: ApiParameter[];
}

interface ApiConstant {
    name: string;
    value: string;
}

interface ApiClass {
    name: string;
    kind: string;
    detail: string;
    documentation: string;
    constructors?: ApiConstructor[];
    properties?: ApiProperty[];
    methods?: ApiMethod[];
    constants?: ApiConstant[];
    operators?: string[];
}

interface ApiFunction {
    name: string;
    kind: string;
    detail: string;
    documentation: string;
    signature: ApiSignature;
}

interface GlobalCategory {
    version: string;
    category: string;
    functions: ApiFunction[];
}

interface ClassCategory {
    version: string;
    category: string;
    description: string;
    classes: ApiClass[];
}

interface ApiIndex {
    version: string;
    date: string;
    description: string;
    globals: {
        categories: Array<{
            id: string;
            name: string;
            file: string;
            count: number;
            description: string;
        }>;
        total_functions: number;
    };
    classes: {
        categories: Array<{
            id: string;
            name: string;
            file: string;
            count: number;
            description: string;
        }>;
        total_classes: number;
    };
}

// ==================== API Loading Functions ====================

/**
 * Load all global functions from categorized JSON files
 */
function loadGlobalFunctions(extensionPath: string): ApiFunction[] {
    const apiPath = path.join(extensionPath, 'vectric-api');
    const indexPath = path.join(apiPath, 'index.json');
    
    try {
        const indexData: ApiIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const allFunctions: ApiFunction[] = [];
        
        // Load each global category
        for (const category of indexData.globals.categories) {
            const categoryPath = path.join(apiPath, category.file);
            if (fs.existsSync(categoryPath)) {
                const categoryData: GlobalCategory = JSON.parse(
                    fs.readFileSync(categoryPath, 'utf8')
                );
                allFunctions.push(...categoryData.functions);
            }
        }
        
        console.log(`Loaded ${allFunctions.length} global functions from ${indexData.globals.categories.length} categories`);
        return allFunctions;
    } catch (error) {
        console.error('Error loading global functions:', error);
        return [];
    }
}

/**
 * Load all classes from categorized JSON files
 */
function loadClasses(extensionPath: string): ApiClass[] {
    const apiPath = path.join(extensionPath, 'vectric-api');
    const indexPath = path.join(apiPath, 'index.json');
    
    try {
        const indexData: ApiIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const allClasses: ApiClass[] = [];
        
        // Load each class category
        for (const category of indexData.classes.categories) {
            const categoryPath = path.join(apiPath, category.file);
            if (fs.existsSync(categoryPath)) {
                const categoryData: ClassCategory = JSON.parse(
                    fs.readFileSync(categoryPath, 'utf8')
                );
                allClasses.push(...categoryData.classes);
            }
        }
        
        console.log(`Loaded ${allClasses.length} classes from ${indexData.classes.categories.length} categories`);
        return allClasses;
    } catch (error) {
        console.error('Error loading classes:', error);
        return [];
    }
}

// ==================== Helper Functions ====================

/**
 * Get the context of what's being typed (class name vs variable)
 */
function getCompletionContext(document: vscode.TextDocument, position: vscode.Position, classes: ApiClass[], globalFunctions: ApiFunction[]) {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);
    
    // Get the word being typed
    const wordRange = document.getWordRangeAtPosition(position);
    const currentWord = wordRange ? document.getText(wordRange) : '';
    
    // List of Lua built-in types - don't provide completions when typing these
    // These are more common in code than keywords, so check first
    const luaBuiltInTypes = [
        'boolean', 'number', 'string', 'function', 'userdata', 'thread', 'table'
    ];
    
    // List of Lua keywords - don't provide completions when typing these
    const luaKeywords = [
        'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
        'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
        'true', 'until', 'while'
    ];
    
    // Check built-in types first (more common in code)
    if (luaBuiltInTypes.includes(currentWord.toLowerCase())) {
        return {
            type: 'keyword',
            objectName: null,
            className: null,
            prefix: ''
        };
    }
    
    // Check if we're typing a Lua keyword
    if (luaKeywords.includes(currentWord.toLowerCase())) {
        return {
            type: 'keyword',
            objectName: null,
            className: null,
            prefix: ''
        };
    }
    
    // Check if we just typed 'local' - don't show completions for variable names
    if (/\blocal\s+\w*$/.test(textBeforeCursor)) {
        return {
            type: 'keyword',
            objectName: null,
            className: null,
            prefix: ''
        };
    }
    
    // Check if we're in a context where a keyword is likely next
    // Pattern: after comparison operators, logical operators, or numbers
    const keywordContextPatterns = [
        /[=<>!]=?\s*\d+\s+\w*$/,           // After comparison with number: "!= 2 t"
        /[=<>!]=?\s*["'][^"']*["']\s+\w*$/, // After comparison with string: "== 'test' t"
        /[=<>!]=?\s*\w+\s+\w*$/,           // After comparison with variable: "== var t"
        /\b(and|or|not)\s+\w*$/,           // After logical operators: "and t"
        /\)\s+\w*$/,                       // After closing paren: ") t"
    ];
    
    // Check if current context matches any keyword-likely pattern
    for (const pattern of keywordContextPatterns) {
        if (pattern.test(textBeforeCursor)) {
            // We're likely typing a keyword, so don't show completions
            return {
                type: 'keyword',
                objectName: null,
                className: null,
                prefix: ''
            };
        }
    }
    
    // Check if we're typing after a dot (.)
    const dotMatch = textBeforeCursor.match(/(\w+)\.(\w*)$/);
    if (dotMatch) {
        const objectName = dotMatch[1];
        const prefix = dotMatch[2] || '';
        
        // Try to infer the type of this variable
        const inferredType = inferVariableType(document, position, objectName, classes, globalFunctions);
        
        return {
            type: 'member-access',
            objectName: objectName,
            className: inferredType || objectName, // Use inferred type or assume it's a class name
            prefix: prefix
        };
    }
    
    // Check if we're typing after a colon (:)
    const colonMatch = textBeforeCursor.match(/(\w+):(\w*)$/);
    if (colonMatch) {
        const objectName = colonMatch[1];
        const prefix = colonMatch[2] || '';
        
        // Try to infer the type of this variable
        const inferredType = inferVariableType(document, position, objectName, classes, globalFunctions);
        
        return {
            type: 'method-access',
            objectName: objectName,
            className: inferredType || objectName,
            prefix: prefix
        };
    }
    
    // Check if we're inside function call parentheses
    // We need to find the INNERMOST unclosed function call
    // Pattern: FunctionName( or FunctionName(arg1, 
    // Handle nested calls like: OuterFunc(InnerFunc(
    
    console.log(`[Detection] Checking for function call, text before cursor: "${textBeforeCursor}"`);
    
    // Find the last unmatched opening parenthesis
    let depth = 0;
    let lastFunctionStart = -1;
    
    for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
        if (textBeforeCursor[i] === ')') {
            depth++;
        } else if (textBeforeCursor[i] === '(') {
            if (depth === 0) {
                // This is an unclosed paren - find the function name before it
                lastFunctionStart = i;
                console.log(`[Detection] Found unclosed ( at position ${i}`);
                break;
            }
            depth--;
        }
    }
    
    console.log(`[Detection] lastFunctionStart = ${lastFunctionStart}`);
    
    if (lastFunctionStart >= 0) {
        // Extract function name before the (
        const beforeParen = textBeforeCursor.substring(0, lastFunctionStart);
        const functionNameMatch = beforeParen.match(/(\w+)$/);
        
        if (functionNameMatch) {
            const functionName = functionNameMatch[1];
            const afterParen = textBeforeCursor.substring(lastFunctionStart + 1);
            
            console.log(`[Function Call] Detected: ${functionName}, text after paren: "${afterParen}"`);
            
            // First check if it's a global function
            const func = globalFunctions.find(f => f.name === functionName);
            if (func && func.signature && func.signature.parameters) {
                // Count how many commas we have to determine which parameter we're on
                const commaCount = (afterParen.match(/,/g) || []).length;
                
                console.log(`[Global Function] ${functionName}, commas: ${commaCount}`);
                
                // Get the expected parameter type
                if (commaCount < func.signature.parameters.length) {
                    const param = func.signature.parameters[commaCount];
                    // Extract type from parameter documentation (e.g., "vec: Vector2D - description")
                    const typeMatch = param.documentation.match(/:\s*(\w+)/);
                    if (typeMatch) {
                        const expectedType = typeMatch[1];
                        console.log(`[Global Function] Expected type: ${expectedType}`);
                        return {
                            type: 'function-parameter',
                            objectName: null,
                            className: expectedType,
                            prefix: '',
                            functionName: functionName,
                            parameterIndex: commaCount
                        };
                    }
                }
            }
            
            // Also check if it's a class constructor
            const cls = classes.find(c => c.name === functionName);
            if (cls && cls.constructors && cls.constructors.length > 0) {
                // Count how many commas we have to determine which parameter we're on
                const commaCount = (afterParen.match(/,/g) || []).length;
            
            console.log(`[Constructor] Function: ${functionName}, commaCount: ${commaCount}`);
            console.log(`[Constructor] Available constructors: ${cls.constructors.map(c => c.label).join(', ')}`);
            
            // Find the best matching constructor based on parameter count
            // Try to find one that has at least commaCount+1 parameters
            let constructor = cls.constructors.find(c => c.parameters.length > commaCount);
            
            // If no match, use the first one (fallback)
            if (!constructor) {
                constructor = cls.constructors[0];
            }
            
            console.log(`[Constructor] Selected: ${constructor.label}`);
            
            if (constructor.parameters && commaCount < constructor.parameters.length) {
                const param = constructor.parameters[commaCount];
                
                let expectedType = null;
                
                // First try to extract type from the constructor label
                // e.g., "Vector2D(x: number, y: number)" or "Point2D(pt: Point2D)"
                const labelMatch = constructor.label.match(/\([^)]*\)/);
                if (labelMatch) {
                    const paramsSignature = labelMatch[0].slice(1, -1); // Remove parentheses
                    const paramsList = paramsSignature.split(',').map(p => p.trim());
                    
                    console.log(`[Constructor] Params list:`, paramsList);
                    
                    if (commaCount < paramsList.length) {
                        const paramSignature = paramsList[commaCount];
                        console.log(`[Constructor] Param ${commaCount}: ${paramSignature}`);
                        // Extract type from "x: number" or "pt: Point2D"
                        const typeMatch = paramSignature.match(/:\s*(\w+)/);
                        if (typeMatch) {
                            expectedType = typeMatch[1];
                            console.log(`[Constructor] Extracted type from label: ${expectedType}`);
                        }
                    }
                }
                
                // If we didn't find it in the label, try the parameter itself
                if (!expectedType) {
                    console.log(`[Constructor] No type from label, trying parameter object`);
                    // Try parameter label: "x: number" or "pt: Point2D"
                    const labelTypeMatch = param.label.match(/:\s*(\w+)/);
                    if (labelTypeMatch) {
                        expectedType = labelTypeMatch[1];
                    } else {
                        // Try documentation: "pt: Point2D - description" or "Point2D - description"
                        const docTypeMatch = param.documentation.match(/(?::\s*)?(\w+)(?:\s*-|$)/);
                        if (docTypeMatch) {
                            const candidate = docTypeMatch[1];
                            // Only use if it starts with capital (likely a class name) or is "number"
                            if (/^[A-Z]/.test(candidate) || candidate === 'number' || candidate === 'string' || candidate === 'boolean') {
                                expectedType = candidate;
                            }
                        }
                    }
                }
                
                console.log(`[Constructor] Final expected type: ${expectedType}`);
                
                if (expectedType) {
                    return {
                        type: 'function-parameter',
                        objectName: null,
                        className: expectedType,
                        prefix: '',
                        functionName: functionName,
                        parameterIndex: commaCount
                    };
                }
            }
        }
    }
    }
    
    // Default: typing a new identifier
    return {
        type: 'identifier',
        objectName: null,
        className: null,
        prefix: ''
    };
}

/**
 * Infer the type of a variable by looking for its assignment
 */
function inferVariableType(document: vscode.TextDocument, position: vscode.Position, varName: string, classes: ApiClass[], globalFunctions: ApiFunction[]): string | null {
    // Search backwards from current position to find variable declaration/assignment
    const currentLine = position.line;
    
    // Look up to 100 lines back (or start of file)
    const searchStart = Math.max(0, currentLine - 100);
    
    for (let lineNum = currentLine; lineNum >= searchStart; lineNum--) {
        const line = document.lineAt(lineNum).text;
        
        // Pattern 1: local varName = ClassName(...)
        // Also handles: local var1, var2 = ClassName(...)
        // IMPORTANT: Only infers type if varName is the FIRST variable in the assignment
        
        // First check if varName appears after a comma (meaning it's NOT the first variable)
        const notFirstVarLocal = new RegExp(`local\\s+\\w+\\s*,\\s*.*\\b${varName}\\b.*=`);
        if (notFirstVarLocal.test(line)) {
            // varName is not the first variable, skip this pattern
            continue;
        }
        
        // Now check if varName is the first variable in a local constructor assignment
        const localAssignment = new RegExp(`local\\s+${varName}\\s*(?:,\\s*\\w+)?\\s*=\\s*(\\w+)\\s*\\(`);
        const localMatch = line.match(localAssignment);
        if (localMatch) {
            const className = localMatch[1];
            // Verify this is actually a known class
            if (classes.find(cls => cls.name === className)) {
                return className;
            }
        }
        
        // Pattern 2: varName = ClassName(...)
        // Also handles: var1, var2 = ClassName(...)
        // IMPORTANT: Only infers type if varName is the FIRST variable in the assignment
        
        // First check if varName appears after a comma (meaning it's NOT the first variable)
        const notFirstVarAssign = new RegExp(`\\w+\\s*,\\s*.*\\b${varName}\\b.*=`);
        if (notFirstVarAssign.test(line)) {
            // varName is not the first variable, skip this pattern
            continue;
        }
        
        // Now check if varName is the first variable in an assignment
        const assignment = new RegExp(`\\b${varName}\\s*(?:,\\s*\\w+)?\\s*=\\s*(\\w+)\\s*\\(`);
        const assignMatch = line.match(assignment);
        if (assignMatch) {
            const className = assignMatch[1];
            // Verify this is actually a known class
            if (classes.find(cls => cls.name === className)) {
                return className;
            }
        }
        
        // Pattern 3: varName = otherVar.PropertyName (property access)
        const propertyAssignment = new RegExp(`\\b${varName}\\s*=\\s*(\\w+)\\.(\\w+)`);
        const propMatch = line.match(propertyAssignment);
        if (propMatch) {
            const objectName = propMatch[1];
            const propertyName = propMatch[2];
            
            // First, try to infer the type of the object being accessed
            const objectType = inferVariableType(document, new vscode.Position(lineNum, 0), objectName, classes, globalFunctions);
            if (objectType) {
                // Find the class and check the property's type
                const cls = classes.find(c => c.name === objectType);
                if (cls && cls.properties) {
                    const property = cls.properties.find(p => p.name === propertyName);
                    if (property) {
                        // Extract class name from property detail (e.g., "SelectionList" from "SelectionList")
                        // Check if the property type is a known class
                        if (classes.find(c => c.name === property.detail)) {
                            return property.detail;
                        }
                    }
                }
            }
        }
        
        // Pattern 4: varName = FunctionName(...) (function return type)
        // Also handles: local var1, var2 = FunctionName(...)
        // IMPORTANT: Only infers type if varName is the FIRST variable in the assignment
        
        // First check if varName appears after a comma (meaning it's NOT the first variable)
        const notFirstVarFunc = new RegExp(`(?:local\\s+)?\\w+\\s*,\\s*.*\\b${varName}\\b.*=`);
        if (notFirstVarFunc.test(line)) {
            // varName is not the first variable, skip this pattern
            continue;
        }
        
        // Now check if varName is the first variable in a function assignment
        const functionAssignment = new RegExp(`(?:local\\s+)?\\b${varName}\\s*(?:,\\s*\\w+)?\\s*=\\s*(\\w+)\\s*\\(`);
        const funcMatch = line.match(functionAssignment);
        if (funcMatch) {
            const functionName = funcMatch[1];
            
            // Check if this is a global function with a known return type
            const globalFunc = globalFunctions.find(f => f.name === functionName);
            if (globalFunc && globalFunc.signature && globalFunc.signature.returns) {
                const returnType = globalFunc.signature.returns;
                // Handle multiple return values - take first return type
                const firstReturnType = returnType.split(',')[0].trim();
                // Check if the return type is a known class
                const foundClass = classes.find(c => c.name === firstReturnType);
                if (foundClass) {
                    return firstReturnType;
                }
            }
        }
        
        // Pattern 4b: varName = object:MethodName(...) (method return type)
        // Also handles: local var1, var2 = object:MethodName(...)
        // IMPORTANT: Only infers type if varName is the FIRST variable in the assignment
        
        // First check if varName appears after a comma (meaning it's NOT the first variable)
        const notFirstVar = new RegExp(`(?:local\\s+)?\\w+\\s*,\\s*.*\\b${varName}\\b.*=`);
        if (notFirstVar.test(line)) {
            // varName is not the first variable, skip this pattern
            continue;
        }
        
        // Now check if varName is the first variable in a method assignment
        const methodAssignment = new RegExp(`(?:local\\s+)?\\b${varName}\\s*(?:,\\s*\\w+)?\\s*=\\s*(\\w+):(\\w+)\\s*\\(`);
        const methodMatch = line.match(methodAssignment);
        if (methodMatch) {
            const objectName = methodMatch[1];
            const methodName = methodMatch[2];
            
            // First, infer the type of the object
            const objectType = inferVariableType(document, new vscode.Position(lineNum, 0), objectName, classes, globalFunctions);
            
            if (objectType) {
                // Find the class and look up the method
                const cls = classes.find(c => c.name === objectType);
                
                if (cls && cls.methods) {
                    const method = cls.methods.find(m => m.name === methodName);
                    
                    if (method && method.signature && method.signature.returns) {
                        const returnType = method.signature.returns;
                        
                        // Handle multiple return values (e.g., "CadObject, POSITION")
                        // Take the first return type
                        const firstReturnType = returnType.split(',')[0].trim();
                        
                        // Check if it's a known class
                        const foundClass = classes.find(c => c.name === firstReturnType);
                        
                        if (foundClass) {
                            return firstReturnType;
                        }
                    }
                }
            }
        }
        
        // Pattern 5: for varName in ... or function varName(...) - stop searching
        const declarationPattern = new RegExp(`\\b(for|function)\\s+${varName}\\b`);
        if (declarationPattern.test(line)) {
            break; // Different kind of declaration, stop searching
        }
    }
    
    return null;
}

/**
 * Find class by name
 */
function findClassByName(classes: ApiClass[], name: string): ApiClass | undefined {
    return classes.find(cls => cls.name === name);
}

/**
 * Get all members of a class including inherited members from base classes
 */
function getClassWithInheritance(cls: ApiClass, classes: ApiClass[]): ApiClass {
    // Check if this class extends another class
    const extendsMatch = cls.detail.match(/extends\s+(\w+)/);
    if (!extendsMatch) {
        // No inheritance, return as-is
        return cls;
    }
    
    const baseClassName = extendsMatch[1];
    const baseClass = findClassByName(classes, baseClassName);
    
    if (!baseClass) {
        // Base class not found, return as-is
        return cls;
    }
    
    // Recursively get base class with its inheritance
    const baseWithInheritance = getClassWithInheritance(baseClass, classes);
    
    // Merge properties, methods, and constants
    return {
        ...cls,
        properties: [
            ...(baseWithInheritance.properties || []),
            ...(cls.properties || [])
        ],
        methods: [
            ...(baseWithInheritance.methods || []),
            ...(cls.methods || [])
        ],
        constants: [
            ...(baseWithInheritance.constants || []),
            ...(cls.constants || [])
        ]
    };
}

/**
 * Create a snippet string from a function signature
 */
function createSnippetFromSignature(signature: ApiSignature): string {
    if (signature.parameters.length === 0) {
        return `${signature.label.split('(')[0]}()$0`;
    }
    
    const params = signature.parameters.map((p, i) => `\${${i + 1}:${p.label}}`).join(', ');
    const funcName = signature.label.split('(')[0];
    return `${funcName}(${params})$0`;
}

/**
 * Create member completion items (properties, methods) without class prefix
 */
function createMemberCompletions(cls: ApiClass, memberType: 'property' | 'method' | 'constant'): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    
    if (memberType === 'property' && cls.properties) {
        cls.properties.forEach((prop: ApiProperty) => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            item.detail = prop.detail;
            item.documentation = new vscode.MarkdownString(
                `${prop.documentation}\n\n${prop.readOnly ? '*(Read-only)*' : '*(Read/write)*'}`
            );
            item.insertText = prop.name;
            item.sortText = `~${prop.name}`; // ~ sorts after normal items
            item.preselect = false; // Never auto-select
            items.push(item);
        });
    }
    
    if (memberType === 'method' && cls.methods) {
        cls.methods.forEach((method: ApiMethod) => {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            item.detail = method.detail;
            item.documentation = new vscode.MarkdownString(method.documentation);
            
            // For methods, create snippet with parameters
            if (method.signature && method.signature.parameters.length > 0) {
                const params = method.signature.parameters
                    .map((p, i) => `\${${i + 1}:${p.label}}`)
                    .join(', ');
                item.insertText = new vscode.SnippetString(`${method.name}(${params})$0`);
            } else {
                item.insertText = new vscode.SnippetString(`${method.name}()$0`);
            }
            item.sortText = `~${method.name}`; // ~ sorts after normal items
            item.preselect = false; // Never auto-select
            items.push(item);
        });
    }
    
    if (memberType === 'constant' && cls.constants) {
        cls.constants.forEach((constant: ApiConstant) => {
            const item = new vscode.CompletionItem(constant.name, vscode.CompletionItemKind.Constant);
            item.detail = constant.value;
            item.documentation = new vscode.MarkdownString(constant.value);
            item.insertText = constant.name;
            item.sortText = `~${constant.name}`; // ~ sorts after normal items
            item.preselect = false; // Never auto-select
            items.push(item);
        });
    }
    
    return items;
}

// ==================== Extension Activation ====================

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Vectric Lua extension is now active!');
    
    // Load all API data
    const globalFunctions = loadGlobalFunctions(context.extensionPath);
    const classes = loadClasses(context.extensionPath);
    
    console.log(`Total API loaded: ${globalFunctions.length} functions, ${classes.length} classes`);

    // ==================== Completion Provider ====================
    
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'lua',
        {
            provideCompletionItems(document, position) {
            const items: vscode.CompletionItem[] = [];
            const context = getCompletionContext(document, position, classes, globalFunctions);
            
            // CONTEXT 0: Lua keyword - don't provide any completions
            if (context.type === 'keyword') {
                return [];
            }
            
            // CONTEXT 1: Member access (obj.property or ClassName.constant)
            if (context.type === 'member-access' && context.className) {
                const cls = findClassByName(classes, context.className);
                if (cls) {
                    // Get class with inherited members
                    const clsWithInheritance = getClassWithInheritance(cls, classes);
                    // Add properties and constants
                    items.push(...createMemberCompletions(clsWithInheritance, 'property'));
                    items.push(...createMemberCompletions(clsWithInheritance, 'constant'));
                }
                return items;
            }
            
            // CONTEXT 2: Method access (obj:method)
            if (context.type === 'method-access' && context.className) {
                const cls = findClassByName(classes, context.className);
                if (cls) {
                    // Get class with inherited members
                    const clsWithInheritance = getClassWithInheritance(cls, classes);
                    // Add methods only
                    items.push(...createMemberCompletions(clsWithInheritance, 'method'));
                }
                return items;
            }
            
            // CONTEXT 2.5: Inside function call - filter by expected parameter type
            if (context.type === 'function-parameter' && context.className) {
                const expectedType = context.className;
                
                console.log(`[Completion Handler] Function parameter context, expected type: ${expectedType}`);
                
                // If expected type is a primitive (number, string, boolean), return empty list
                const primitiveTypes = ['number', 'string', 'boolean', 'double', 'int', 'float'];
                if (primitiveTypes.includes(expectedType.toLowerCase())) {
                    console.log(`[Completion Handler] Primitive type detected, returning empty completion list`);
                    
                    // Return a CompletionList (not just array) to have more control
                    const completionList = new vscode.CompletionList([], false); // false = isIncomplete
                    return completionList;
                }
                
                console.log(`[Completion Handler] Looking for class: ${expectedType}`);
                
                // Add constructors for the expected type
                const expectedClass = findClassByName(classes, expectedType);
                console.log(`[Completion Handler] Class found:`, expectedClass ? expectedClass.name : 'NOT FOUND');
                
                if (expectedClass && expectedClass.constructors && expectedClass.constructors.length > 0) {
                    console.log(`[Completion Handler] Adding constructor for ${expectedClass.name}`);
                    const item = new vscode.CompletionItem(expectedClass.name, vscode.CompletionItemKind.Class);
                    item.detail = `${expectedClass.detail} (constructor)`;
                    item.documentation = new vscode.MarkdownString(
                        `Expected type: **${expectedType}**\n\n${expectedClass.documentation}`
                    );
                    
                    // Add constructor snippet
                    if (expectedClass.constructors[0].parameters.length > 0) {
                        const params = expectedClass.constructors[0].parameters
                            .map((p, i) => `\${${i + 1}:${p.label}}`)
                            .join(', ');
                        item.insertText = new vscode.SnippetString(`${expectedClass.name}(${params})$0`);
                    } else {
                        item.insertText = new vscode.SnippetString(`${expectedClass.name}()$0`);
                    }
                    item.sortText = `!${expectedClass.name}`; // ! sorts first
                    item.preselect = true; // Auto-select expected type
                    items.push(item);
                }
                
                // Add global functions that return the expected type
                globalFunctions.forEach((fn: ApiFunction) => {
                    if (fn.signature && fn.signature.returns) {
                        const returnType = fn.signature.returns.split(',')[0].trim();
                        if (returnType === expectedType) {
                            const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                            item.detail = `${fn.detail} → ${expectedType}`;
                            item.documentation = new vscode.MarkdownString(
                                `Expected type: **${expectedType}**\n\n${fn.documentation}`
                            );
                            if (fn.signature) {
                                item.insertText = new vscode.SnippetString(
                                    createSnippetFromSignature(fn.signature)
                                );
                            }
                            item.sortText = `!${fn.name}`; // ! sorts first
                            item.preselect = true;
                            items.push(item);
                        }
                    }
                });
                
                // Also show all variables of the expected type (look backwards for variable declarations)
                // This would require searching the document, so we'll skip it for now
                // Just return the filtered items
                console.log(`[Completion Handler] Returning ${items.length} items for type ${expectedType}`);
                return items;
            }
            
            // CONTEXT 3: General identifier (add everything)
            
            // Add global functions
            globalFunctions.forEach((fn: ApiFunction) => {
                const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                item.detail = fn.detail;
                item.documentation = new vscode.MarkdownString(fn.documentation);
                item.sortText = `~${fn.name}`; // ~ sorts after normal items
                item.preselect = false; // Never auto-select
                
                if (fn.signature) {
                    item.insertText = new vscode.SnippetString(
                        createSnippetFromSignature(fn.signature)
                    );
                }
                items.push(item);
            });

            // Add classes (for constructors)
            classes.forEach((cls: ApiClass) => {
                const item = new vscode.CompletionItem(cls.name, vscode.CompletionItemKind.Class);
                item.detail = cls.detail;
                item.documentation = new vscode.MarkdownString(cls.documentation);
                item.sortText = `~${cls.name}`; // ~ sorts after normal items
                item.preselect = false; // Never auto-select
                
                // If class has constructors, create snippet for the most common one
                if (cls.constructors && cls.constructors.length > 0) {
                    const constructor = cls.constructors[0];
                    if (constructor.parameters.length > 0) {
                        const params = constructor.parameters
                            .map((p, i) => `\${${i + 1}:${p.label}}`)
                            .join(', ');
                        item.insertText = new vscode.SnippetString(`${cls.name}(${params})$0`);
                    } else {
                        item.insertText = new vscode.SnippetString(`${cls.name}()$0`);
                    }
                }
                items.push(item);
            });

            return items;
        }
    }, '.', ':', '(', ',');  // Trigger on ., :, ( and ,

    // ==================== Signature Help Provider ====================
    
    const signatureProvider = vscode.languages.registerSignatureHelpProvider('lua', {
        provideSignatureHelp(document, position) {
            const sigHelp = new vscode.SignatureHelp();

            // Add global function signatures
            globalFunctions.forEach((fn: ApiFunction) => {
                if (fn.signature) {
                    const sig = new vscode.SignatureInformation(
                        fn.signature.label,
                        fn.signature.documentation
                    );
                    sig.parameters = fn.signature.parameters.map(
                        (p: ApiParameter) => new vscode.ParameterInformation(p.label, p.documentation)
                    );
                    sigHelp.signatures.push(sig);
                }
            });

            // Add class constructor signatures
            classes.forEach((cls: ApiClass) => {
                if (cls.constructors) {
                    cls.constructors.forEach((constructor: ApiConstructor) => {
                        const sig = new vscode.SignatureInformation(
                            constructor.label,
                            constructor.documentation
                        );
                        sig.parameters = constructor.parameters.map(
                            (p: ApiParameter) => new vscode.ParameterInformation(p.label, p.documentation)
                        );
                        sigHelp.signatures.push(sig);
                    });
                }

                // Add method signatures
                if (cls.methods) {
                    cls.methods.forEach((method: ApiMethod) => {
                        if (method.signature) {
                            const sig = new vscode.SignatureInformation(
                                method.signature.label,
                                method.signature.documentation
                            );
                            sig.parameters = method.signature.parameters.map(
                                (p: ApiParameter) => new vscode.ParameterInformation(p.label, p.documentation)
                            );
                            sigHelp.signatures.push(sig);
                        }
                    });
                }
            });

            sigHelp.activeSignature = 0;
            sigHelp.activeParameter = 0;
            return sigHelp;
        }
    }, '(', ',');

    // ==================== Hover Provider ====================
    
    const hoverProvider = vscode.languages.registerHoverProvider('lua', {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);

            // Check for global functions
            const globalFn = globalFunctions.find((f: ApiFunction) => f.name === word);
            if (globalFn) {
                return createFunctionHover(globalFn);
            }

            // Check for classes
            const cls = classes.find((c: ApiClass) => c.name === word);
            if (cls) {
                return createClassHover(cls);
            }

            // Check for class methods and properties
            for (const cls of classes) {
                // Check methods
                if (cls.methods) {
                    const method = cls.methods.find((m: ApiMethod) => m.name === word);
                    if (method) {
                        return createMethodHover(cls.name, method);
                    }
                }

                // Check properties
                if (cls.properties) {
                    const prop = cls.properties.find((p: ApiProperty) => p.name === word);
                    if (prop) {
                        return createPropertyHover(cls.name, prop);
                    }
                }

                // Check constants
                if (cls.constants) {
                    const constant = cls.constants.find((c: ApiConstant) => c.name === word);
                    if (constant) {
                        return createConstantHover(cls.name, constant);
                    }
                }
            }

            return null;
        }
    });

    // Register all providers
    context.subscriptions.push(completionProvider, signatureProvider, hoverProvider);
}

// ==================== Hover Helper Functions ====================

/**
 * Create hover information for a function
 */
function createFunctionHover(fn: ApiFunction): vscode.Hover {
    let markdown = `### ${fn.name}\n\n${fn.documentation}\n\n`;
    
    if (fn.signature) {
        markdown += `**Signature:**\n\`\`\`lua\n${fn.signature.label}\n\`\`\`\n\n`;
        
        if (fn.signature.parameters.length > 0) {
            markdown += `**Parameters:**\n`;
            fn.signature.parameters.forEach(p => {
                markdown += `- \`${p.label}\`: ${p.documentation}\n`;
            });
            markdown += '\n';
        }
        
        if (fn.signature.returns) {
            markdown += `**Returns:** ${fn.signature.returns}\n`;
        }
    }
    
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

/**
 * Create hover information for a class
 */
function createClassHover(cls: ApiClass): vscode.Hover {
    let markdown = `### ${cls.name}\n\n${cls.documentation}\n\n`;
    
    if (cls.constructors && cls.constructors.length > 0) {
        markdown += `**Constructors:**\n`;
        cls.constructors.forEach(ctor => {
            markdown += `\`\`\`lua\n${ctor.label}\n\`\`\`\n${ctor.documentation}\n\n`;
        });
    }
    
    if (cls.properties && cls.properties.length > 0) {
        markdown += `**Properties:** ${cls.properties.length}\n\n`;
    }
    
    if (cls.methods && cls.methods.length > 0) {
        markdown += `**Methods:** ${cls.methods.length}\n\n`;
    }

    if (cls.constants && cls.constants.length > 0) {
        markdown += `**Constants:** ${cls.constants.length}\n\n`;
    }
    
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

/**
 * Create hover information for a method
 */
function createMethodHover(className: string, method: ApiMethod): vscode.Hover {
    let markdown = `### ${className}:${method.name}\n\n${method.documentation}\n\n`;
    
    if (method.signature) {
        markdown += `**Signature:**\n\`\`\`lua\n${method.signature.label}\n\`\`\`\n\n`;
        
        if (method.signature.parameters.length > 0) {
            markdown += `**Parameters:**\n`;
            method.signature.parameters.forEach(p => {
                markdown += `- \`${p.label}\`: ${p.documentation}\n`;
            });
            markdown += '\n';
        }
        
        if (method.signature.returns) {
            markdown += `**Returns:** ${method.signature.returns}\n\n`;
            
            // Check if method returns multiple values and add usage example
            const hasMultipleReturns = method.signature.returns.includes(',');
            if (hasMultipleReturns) {
                markdown += `**Usage Example:**\n\`\`\`lua\n`;
                
                // Generate example based on common patterns
                if (method.name === 'GetNext') {
                    const varName = className === 'SelectionList' ? 'obj' : 
                                   className === 'CadObjectGroup' ? 'member' :
                                   className === 'CadObjectList' ? 'object' : 'item';
                    markdown += `local ${varName}, pos = ${className.toLowerCase()}:GetNext(pos)\n`;
                    markdown += `-- ${varName} is the object at current position\n`;
                    markdown += `-- pos is the new position (or nil if at end)\n`;
                } else if (method.name === 'GetPrev') {
                    const varName = className === 'SelectionList' ? 'obj' : 'item';
                    markdown += `local ${varName}, pos = ${className.toLowerCase()}:GetPrev(pos)\n`;
                    markdown += `-- ${varName} is the object at current position\n`;
                    markdown += `-- pos is the new position (or nil if at start)\n`;
                } else {
                    // Generic example for other multi-return methods
                    const returns = method.signature.returns.split(',').map(r => r.trim());
                    const varNames = returns.map((r, i) => `val${i + 1}`).join(', ');
                    markdown += `local ${varNames} = ${className.toLowerCase()}:${method.name}(...)\n`;
                }
                
                markdown += `\`\`\`\n`;
            }
        }
    }
    
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

/**
 * Create hover information for a property
 */
function createPropertyHover(className: string, prop: ApiProperty): vscode.Hover {
    const readWrite = prop.readOnly ? 'Read-only' : 'Read/write';
    const markdown = `### ${className}.${prop.name}\n\n${prop.documentation}\n\n**Type:** ${prop.detail}\n\n**Access:** ${readWrite}`;
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

/**
 * Create hover information for a constant
 */
function createConstantHover(className: string, constant: ApiConstant): vscode.Hover {
    const markdown = `### ${className}.${constant.name}\n\n${constant.value}`;
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
    console.log('Vectric Lua extension deactivated');
}
