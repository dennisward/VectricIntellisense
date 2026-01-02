// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ***** Important Debugging Note *****
// If you get a powershell security warning when trying to run or debug the extension,
// just go to source directory (ind cmd.exe, not powershell) and:
// npm run watch - there's an issue with the node.ns mpm.ps1 script not being digitally signed.
// **************************************

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const apiFilePath = path.join(context.extensionPath, 'vectric-api.json');
    const apiData = JSON.parse(fs.readFileSync(apiFilePath, 'utf8'));

    // Completion Provider
    const completionProvider = vscode.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems() {
            const items: vscode.CompletionItem[] = [];

            // Add classes
            apiData.classes.forEach((cls: any) => {
                const item = new vscode.CompletionItem(cls.name, vscode.CompletionItemKind.Class);
                item.detail = cls.detail;
                item.documentation = new vscode.MarkdownString(cls.documentation);
                items.push(item);
            });

            // Add functions
            apiData.functions.forEach((fn: any) => {
                const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                item.detail = fn.detail;
                item.documentation = new vscode.MarkdownString(fn.documentation);
                items.push(item);
            });

            return items;
        }
    });

    // Signature Help Provider
    const signatureProvider = vscode.languages.registerSignatureHelpProvider('lua', {
        provideSignatureHelp() {
            const sigHelp = new vscode.SignatureHelp();

            // Add class constructors
            apiData.classes.forEach((cls: any) => {
                if (cls.signature) {
                    const sig = new vscode.SignatureInformation(cls.signature.label, cls.signature.documentation);
                    sig.parameters = cls.signature.parameters.map((p: any) => new vscode.ParameterInformation(p.label, p.documentation));
                    sigHelp.signatures.push(sig);
                }
            });

            // Add functions
            apiData.functions.forEach((fn: any) => {
                if (fn.signature) {
                    const sig = new vscode.SignatureInformation(fn.signature.label, fn.signature.documentation);
                    sig.parameters = fn.signature.parameters.map((p: any) => new vscode.ParameterInformation(p.label, p.documentation));
                    sigHelp.signatures.push(sig);
                }
            });

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

            const cls = apiData.classes.find((c: any) => c.name === word);
            if (cls) {
                return new vscode.Hover(new vscode.MarkdownString(`### ${cls.name}\n\n${cls.documentation}\n\n**Signature:**\n\`${cls.signature.label}\``));
            }

            const fn = apiData.functions.find((f: any) => f.name === word);
            if (fn) {
                return new vscode.Hover(new vscode.MarkdownString(`### ${fn.name}\n\n${fn.documentation}\n\n**Signature:**\n\`${fn.signature.label}\``));
            }

            return null;
        }
    });

    context.subscriptions.push(completionProvider, signatureProvider, hoverProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
