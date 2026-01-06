import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Type Inference Test Suite', () => {
    
    // Helper function to get completions at a specific position
    async function getCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
        const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
            'vscode.executeCompletionItemProvider',
            document.uri,
            position
        );
        return completions ? completions.items : [];
    }

    // Helper to create a test document with content
    async function createTestDocument(content: string): Promise<vscode.TextDocument> {
        const doc = await vscode.workspace.openTextDocument({
            language: 'lua',
            content: content
        });
        return doc;
    }

    test('Pattern 1: Constructor call with local', async () => {
        const content = 'local job = VectricJob()\njob.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(1, 4); // After "job."
        
        const completions = await getCompletions(doc, position);
        
        // Should show VectricJob properties
        const hasSelection = completions.some(c => c.label === 'Selection');
        assert.strictEqual(hasSelection, true, 'Should show Selection property from VectricJob');
    });

    test('Pattern 2: Constructor call without local', async () => {
        const content = 'job = VectricJob()\njob.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(1, 4);
        
        const completions = await getCompletions(doc, position);
        const hasSelection = completions.some(c => c.label === 'Selection');
        assert.strictEqual(hasSelection, true, 'Should show VectricJob properties without local keyword');
    });

    test('Pattern 3: Property access type inference', async () => {
        const content = 'local job = VectricJob()\nlocal selection = job.Selection\nselection.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(2, 10); // After "selection."
        
        const completions = await getCompletions(doc, position);
        const hasCount = completions.some(c => c.label === 'Count');
        assert.strictEqual(hasCount, true, 'Should show SelectionList properties');
    });

    test('Pattern 4: Global function return type', async () => {
        const content = 'local obj = selection:GetHead()\nlocal contour = CastCadObjectToCadContour(obj)\ncontour.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(2, 8); // After "contour."
        
        const completions = await getCompletions(doc, position);
        const hasClassName = completions.some(c => c.label === 'ClassName');
        assert.strictEqual(hasClassName, true, 'Should show CadObject properties from CadContour');
    });

    test('Pattern 5: Method return type', async () => {
        const content = 'local job = VectricJob()\nlocal mgr = job.LayerManager\nlocal layer = mgr:GetActiveLayer()\nlayer.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(3, 6); // After "layer."
        
        const completions = await getCompletions(doc, position);
        const hasName = completions.some(c => c.label === 'Name');
        assert.strictEqual(hasName, true, 'Should show CadLayer properties from method return');
    });

    test('Multiple return values - first variable gets type', async () => {
        const content = 'local selection = job.Selection\nlocal firstObj, pos = selection:GetNext(pos)\nfirstObj.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(2, 9); // After "firstObj."
        
        const completions = await getCompletions(doc, position);
        const hasClassName = completions.some(c => c.label === 'ClassName');
        assert.strictEqual(hasClassName, true, 'Should show CadObject properties for first return value');
    });

    test('Multiple return values - second variable gets no type', async () => {
        const content = 'local selection = job.Selection\nlocal firstObj, pos = selection:GetNext(pos)\npos.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(2, 4); // After "pos."
        
        const completions = await getCompletions(doc, position);
        
        // pos should not show class-specific members
        // We verify this by checking it doesn't have CadObject-specific properties
        const hasClassName = completions.some(c => 
            c.label === 'ClassName' && 
            c.detail?.includes('CadObject')
        );
        assert.strictEqual(hasClassName, false, 'Second variable should not get type inference');
    });

    test('Nested function calls detect innermost', async () => {
        const content = 'local t = TranslationMatrix2D(Vector2D(';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(0, 40); // After Vector2D(
        
        const completions = await getCompletions(doc, position);
        
        // Should be in Vector2D context, not TranslationMatrix2D
        // Vector2D expects number, so shouldn't suggest Vector2D constructor
        const hasVector2DConstructor = completions.some(c => 
            c.label === 'Vector2D' && 
            c.kind === vscode.CompletionItemKind.Class
        );
        
        // For number parameter, we shouldn't suggest class constructors
        assert.strictEqual(hasVector2DConstructor, false, 'Should detect innermost function (Vector2D, not TranslationMatrix2D)');
    });
});
