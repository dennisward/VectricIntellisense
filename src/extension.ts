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
function getCompletionContext(document: vscode.TextDocument, position: vscode.Position, classes: ApiClass[]) {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);
    
    // Check if we're typing after a dot (.)
    const dotMatch = textBeforeCursor.match(/(\w+)\.(\w*)$/);
    if (dotMatch) {
        const objectName = dotMatch[1];
        const prefix = dotMatch[2] || '';
        
        // Try to infer the type of this variable
        const inferredType = inferVariableType(document, position, objectName, classes);
        
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
        const inferredType = inferVariableType(document, position, objectName, classes);
        
        return {
            type: 'method-access',
            objectName: objectName,
            className: inferredType || objectName,
            prefix: prefix
        };
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
function inferVariableType(document: vscode.TextDocument, position: vscode.Position, varName: string, classes: ApiClass[]): string | null {
    // Search backwards from current position to find variable declaration/assignment
    const currentLine = position.line;
    
    // Look up to 100 lines back (or start of file)
    const searchStart = Math.max(0, currentLine - 100);
    
    for (let lineNum = currentLine; lineNum >= searchStart; lineNum--) {
        const line = document.lineAt(lineNum).text;
        
        // Pattern 1: local varName = ClassName(...)
        const localAssignment = new RegExp(`local\\s+${varName}\\s*=\\s*(\\w+)\\s*\\(`);
        const localMatch = line.match(localAssignment);
        if (localMatch) {
            const className = localMatch[1];
            // Verify this is actually a known class
            if (classes.find(cls => cls.name === className)) {
                return className;
            }
        }
        
        // Pattern 2: varName = ClassName(...)
        const assignment = new RegExp(`\\b${varName}\\s*=\\s*(\\w+)\\s*\\(`);
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
            const objectType = inferVariableType(document, new vscode.Position(lineNum, 0), objectName, classes);
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
        
        // Pattern 4: for varName in ... or function varName(...) - stop searching
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
            items.push(item);
        });
    }
    
    if (memberType === 'constant' && cls.constants) {
        cls.constants.forEach((constant: ApiConstant) => {
            const item = new vscode.CompletionItem(constant.name, vscode.CompletionItemKind.Constant);
            item.detail = constant.value;
            item.documentation = new vscode.MarkdownString(constant.value);
            item.insertText = constant.name;
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
    
    const completionProvider = vscode.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems(document, position) {
            const items: vscode.CompletionItem[] = [];
            const context = getCompletionContext(document, position, classes);
            
            // CONTEXT 1: Member access (obj.property or ClassName.constant)
            if (context.type === 'member-access' && context.className) {
                const cls = findClassByName(classes, context.className);
                if (cls) {
                    // Add properties and constants
                    items.push(...createMemberCompletions(cls, 'property'));
                    items.push(...createMemberCompletions(cls, 'constant'));
                }
                return items;
            }
            
            // CONTEXT 2: Method access (obj:method)
            if (context.type === 'method-access' && context.className) {
                const cls = findClassByName(classes, context.className);
                if (cls) {
                    // Add methods only
                    items.push(...createMemberCompletions(cls, 'method'));
                }
                return items;
            }
            
            // CONTEXT 3: General identifier (add everything)
            
            // Add global functions
            globalFunctions.forEach((fn: ApiFunction) => {
                const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                item.detail = fn.detail;
                item.documentation = new vscode.MarkdownString(fn.documentation);
                
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
    }, '.', ':');  // Trigger on . and :

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
