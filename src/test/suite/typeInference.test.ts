import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Type Inference Test Suite', () => {

    // Ensure extension is activated before running tests
    suiteSetup(async function () {
        this.timeout(10000); // Give extension time to activate

        // Get the extension
        const ext = vscode.extensions.getExtension('Dennis Ward.vectricintellisense');

        if (ext) {
            await ext.activate();
            console.log('Extension activated for tests');
        } else {
            console.warn('Extension not found - tests may fail');
        }

        // Give extension time to load API data
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

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

    test('Pattern 1: Constructor call with local', async function () {
        this.timeout(5000);

        const content = `local job = VectricJob()
job.`;
        const doc = await createTestDocument(content);
        const position = new vscode.Position(1, 4); // After "job."

        // Wait a bit for IntelliSense to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Pattern 1 got ${completions.length} completions`);
        console.log(`[Test] First 10 completions: ${completions.slice(0, 10).map(c => c.label).join(', ')}`);
        console.log(`[Test] Has Selection: ${completions.some(c => c.label === 'Selection')}`);

        // Should show VectricJob properties
        const hasSelection = completions.some(c => c.label === 'Selection');

        // If it fails, log what we got to help debug
        if (!hasSelection) {
            console.log(`[Test] All completions: ${completions.map(c => `${c.label} (${c.detail})`).join(', ')}`);
        }

        assert.strictEqual(hasSelection, true, 'Should show Selection property from VectricJob');
    });

    test('Pattern 2: Constructor call without local', async function () {
        this.timeout(5000);

        const content = 'job = VectricJob()\njob.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(1, 4);

        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Pattern 2 got ${completions.length} completions`);

        const hasSelection = completions.some(c => c.label === 'Selection');
        assert.strictEqual(hasSelection, true, 'Should show VectricJob properties without local keyword');
    });

    test('Pattern 3: Property access type inference', async function () {
        this.timeout(5000);

        const content = 'local job = VectricJob()\nlocal selection = job.Selection\nselection.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(2, 10); // After "selection."

        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Pattern 3 got ${completions.length} completions`);

        const hasCount = completions.some(c => c.label === 'Count');
        assert.strictEqual(hasCount, true, 'Should show SelectionList properties');
    });

    test('Pattern 4: Global function return type', async function () {
        this.timeout(5000);

        const content = 'local obj = selection:GetHead()\nlocal contour = CastCadObjectToCadContour(obj)\ncontour.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(2, 8); // After "contour."

        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Pattern 4 got ${completions.length} completions`);

        const hasClassName = completions.some(c => c.label === 'ClassName');
        assert.strictEqual(hasClassName, true, 'Should show CadObject properties from CadContour');
    });

    test('Pattern 5: Method return type', async function () {
        this.timeout(5000);

        const content = 'local job = VectricJob()\nlocal mgr = job.LayerManager\nlocal layer = mgr:GetActiveLayer()\nlayer.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(3, 6); // After "layer."

        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Pattern 5 got ${completions.length} completions`);

        const hasName = completions.some(c => c.label === 'Name');
        assert.strictEqual(hasName, true, 'Should show CadLayer properties from method return');
    });

    test('Multiple return values - first variable gets type', async function () {
        this.timeout(5000);

        // Create a complete, valid Lua code snippet
        const content = `local job = VectricJob()
local selection = job.Selection
local pos = selection:GetHeadPosition()
local firstObj, pos2 = selection:GetNext(pos)
firstObj.`;

        const doc = await createTestDocument(content);
        const position = new vscode.Position(4, 9); // After "firstObj."

        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Multiple returns - first var got ${completions.length} completions`);
        console.log(`[Test] Completion labels: ${completions.slice(0, 10).map(c => c.label).join(', ')}`);
        console.log(`[Test] Has ClassName: ${completions.some(c => c.label === 'ClassName')}`);

        const hasClassName = completions.some(c => c.label === 'ClassName');
        assert.strictEqual(hasClassName, true, 'Should show CadObject properties for first return value');
    });

    test('Multiple return values - second variable gets no type', async function () {
        this.timeout(5000);

        const content = 'local selection = job.Selection\nlocal firstObj, pos = selection:GetNext(pos)\npos.';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(2, 4); // After "pos."

        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Multiple returns - second var got ${completions.length} completions`);

        // pos should not show CadObject-specific properties
        // We verify this by checking it doesn't have ClassName from our extension
        const hasClassNameFromExtension = completions.some(c =>
            c.label === 'ClassName' &&
            (c.detail?.includes('CadObject') || c.detail?.includes('class'))
        );
        assert.strictEqual(hasClassNameFromExtension, false, 'Second variable should not get type inference');
    });

    test('Nested function calls detect innermost', async function () {
        this.timeout(5000);

        const content = 'local t = TranslationMatrix2D(Vector2D(';
        const doc = await createTestDocument(content);
        const position = new vscode.Position(0, 40); // After Vector2D(

        await new Promise(resolve => setTimeout(resolve, 500));

        const completions = await getCompletions(doc, position);

        console.log(`[Test] Nested calls got ${completions.length} completions`);
        console.log(`[Test] Has Vector2D: ${completions.some(c => c.label === 'Vector2D')}`);

        // Should be in Vector2D context (expects number), not TranslationMatrix2D (expects Vector2D)
        // For number parameter, we shouldn't suggest Vector2D constructor prominently
        const hasVector2DPreselected = completions.some(c =>
            c.label === 'Vector2D' &&
            c.preselect === true
        );

        // The Vector2D constructor should NOT be preselected (since we expect number, not Vector2D)
        assert.strictEqual(hasVector2DPreselected, false, 'Should detect innermost function (expects number, not Vector2D)');
    });
});
