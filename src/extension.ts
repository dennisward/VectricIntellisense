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
    operators?: any[];
}

interface ApiFunction {
    name: string;
    kind: string;
    detail: string;
    documentation: string;
    signature: ApiSignature;
}

interface ApiData {
    version?: string;
    date?: string;
    globals?: {
        functions: ApiFunction[];
        constants: any[];
    };
    classes: ApiClass[];
    functions?: ApiFunction[];
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const apiFilePath = path.join(context.extensionPath, 'vectric-api.json');
    const apiData: ApiData = JSON.parse(fs.readFileSync(apiFilePath, 'utf8'));

    // Completion Provider
    const completionProvider = vscode.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems(document, position) {
            const items: vscode.CompletionItem[] = [];

            // Add global functions
            if (apiData.globals?.functions) {
                apiData.globals.functions.forEach((fn: ApiFunction) => {
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
            }

            // Add classes
            apiData.classes.forEach((cls: ApiClass) => {
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
                        constItem.documentation = new vscode.MarkdownString(constant.value);
                        items.push(constItem);
                    });
                }
            });

            // Add legacy functions if present (for backwards compatibility)
            if (apiData.functions) {
                apiData.functions.forEach((fn: ApiFunction) => {
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
            }

            return items;
        }
    });

    // Signature Help Provider
    const signatureProvider = vscode.languages.registerSignatureHelpProvider('lua', {
        provideSignatureHelp(document, position) {
            const sigHelp = new vscode.SignatureHelp();

            // Add global function signatures
            if (apiData.globals?.functions) {
                apiData.globals.functions.forEach((fn: ApiFunction) => {
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
            }

            // Add class constructor signatures
            apiData.classes.forEach((cls: ApiClass) => {
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

            // Add legacy function signatures (backwards compatibility)
            if (apiData.functions) {
                apiData.functions.forEach((fn: ApiFunction) => {
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
            }

            sigHelp.activeSignature = 0;
            sigHelp.activeParameter = 0;
            return sigHelp;
        }
    }, '(', ',');

    // Hover Provider
    const hoverProvider = vscode.languages.registerHoverProvider('lua', {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);

            // Check for global functions
            if (apiData.globals?.functions) {
                const globalFn = apiData.globals.functions.find((f: ApiFunction) => f.name === word);
                if (globalFn) {
                    return createFunctionHover(globalFn);
                }
            }

            // Check for classes
            const cls = apiData.classes.find((c: ApiClass) => c.name === word);
            if (cls) {
                return createClassHover(cls);
            }

            // Check for class methods and properties
            for (const cls of apiData.classes) {
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

            // Check legacy functions
            if (apiData.functions) {
                const fn = apiData.functions.find((f: ApiFunction) => f.name === word);
                if (fn) {
                    return createFunctionHover(fn);
                }
            }

            return null;
        }
    });

    context.subscriptions.push(completionProvider, signatureProvider, hoverProvider);
}

// Helper function to create snippet from signature
function createSnippetFromSignature(signature: ApiSignature): string {
    if (signature.parameters.length === 0) {
        return `${signature.label.split('(')[0]}()$0`;
    }
    
    const params = signature.parameters.map((p, i) => `\${${i + 1}:${p.label}}`).join(', ');
    const funcName = signature.label.split('(')[0];
    return `${funcName}(${params})$0`;
}

// Helper function to create hover for functions
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

// Helper function to create hover for classes
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
    
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

// Helper function to create hover for methods
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

// Helper function to create hover for properties
function createPropertyHover(className: string, prop: ApiProperty): vscode.Hover {
    const readWrite = prop.readOnly ? 'Read-only' : 'Read/write';
    const markdown = `### ${className}.${prop.name}\n\n${prop.documentation}\n\n**Type:** ${prop.detail}\n\n**Access:** ${readWrite}`;
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

// Helper function to create hover for constants
function createConstantHover(className: string, constant: ApiConstant): vscode.Hover {
    const markdown = `### ${className}.${constant.name}\n\n${constant.value}`;
    return new vscode.Hover(new vscode.MarkdownString(markdown));
}

// This method is called when your extension is deactivated
export function deactivate() {}