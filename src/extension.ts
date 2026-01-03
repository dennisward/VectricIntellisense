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

/**
 * Load a specific category of global functions (for lazy loading if needed)
 */
function loadGlobalCategory(extensionPath: string, categoryId: string): ApiFunction[] {
    const apiPath = path.join(extensionPath, 'vectric-api');
    const categoryPath = path.join(apiPath, `globals_${categoryId}.json`);
    
    try {
        if (fs.existsSync(categoryPath)) {
            const categoryData: GlobalCategory = JSON.parse(
                fs.readFileSync(categoryPath, 'utf8')
            );
            return categoryData.functions;
        }
        return [];
    } catch (error) {
        console.error(`Error loading global category ${categoryId}:`, error);
        return [];
    }
}

/**
 * Load a specific category of classes (for lazy loading if needed)
 */
function loadClassCategory(extensionPath: string, categoryId: string): ApiClass[] {
    const apiPath = path.join(extensionPath, 'vectric-api');
    const categoryPath = path.join(apiPath, `classes_${categoryId}.json`);
    
    try {
        if (fs.existsSync(categoryPath)) {
            const categoryData: ClassCategory = JSON.parse(
                fs.readFileSync(categoryPath, 'utf8')
            );
            return categoryData.classes;
        }
        return [];
    } catch (error) {
        console.error(`Error loading class category ${categoryId}:`, error);
        return [];
    }
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

            // Add classes
            classes.forEach((cls: ApiClass) => {
                // Add the class itself
                const item = new vscode.CompletionItem(cls.name, vscode.CompletionItemKind.Class);
                item.detail = cls.detail;
                item.documentation = new vscode.MarkdownString(cls.documentation);
                items.push(item);

                // Add class properties
                if (cls.properties) {
                    cls.properties.forEach((prop: ApiProperty) => {
                        const propItem = new vscode.CompletionItem(
                            `${cls.name}.${prop.name}`,
                            vscode.CompletionItemKind.Property
                        );
                        propItem.detail = prop.detail;
                        propItem.documentation = new vscode.MarkdownString(
                            `${prop.documentation}\n\n${prop.readOnly ? '*(Read-only)*' : '*(Read/write)*'}`
                        );
                        items.push(propItem);
                    });
                }

                // Add class methods
                if (cls.methods) {
                    cls.methods.forEach((method: ApiMethod) => {
                        const methodItem = new vscode.CompletionItem(
                            `${cls.name}:${method.name}`,
                            vscode.CompletionItemKind.Method
                        );
                        methodItem.detail = method.detail;
                        methodItem.documentation = new vscode.MarkdownString(method.documentation);
                        
                        if (method.signature) {
                            methodItem.insertText = new vscode.SnippetString(
                                createSnippetFromSignature(method.signature)
                            );
                        }
                        items.push(methodItem);
                    });
                }

                // Add class constants
                if (cls.constants) {
                    cls.constants.forEach((constant: ApiConstant) => {
                        const constItem = new vscode.CompletionItem(
                            `${cls.name}.${constant.name}`,
                            vscode.CompletionItemKind.Constant
                        );
                        constItem.detail = constant.value;
                        constItem.documentation = new vscode.MarkdownString(constant.value);
                        items.push(constItem);
                    });
                }

                // Add class constructors
                if (cls.constructors) {
                    cls.constructors.forEach((constructor: ApiConstructor) => {
                        const ctorItem = new vscode.CompletionItem(
                            cls.name,
                            vscode.CompletionItemKind.Constructor
                        );
                        ctorItem.detail = constructor.label;
                        ctorItem.documentation = new vscode.MarkdownString(constructor.documentation);
                        
                        // Create snippet for constructor
                        if (constructor.parameters.length > 0) {
                            const params = constructor.parameters
                                .map((p, i) => `\${${i + 1}:${p.label}}`)
                                .join(', ');
                            ctorItem.insertText = new vscode.SnippetString(
                                `${cls.name}(${params})$0`
                            );
                        }
                        items.push(ctorItem);
                    });
                }
            });

            return items;
        }
    });

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

// ==================== Helper Functions ====================

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
            markdown += `**Returns:** ${method.signature.returns}\n`;
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