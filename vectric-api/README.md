# Vectric Lua Interface - Complete API Reference

Version 12.5 | Extracted from Official Documentation | January 2026

This directory contains the complete Vectric Lua Interface API organized into categorized JSON files for easy integration into development tools like VS Code extensions.

## 📁 Directory Structure

```
vectric-api/
├── index.json                          # Complete API index
├── README.md                           # This file
│
├── Global Methods (34 functions)
│   ├── globals_general.json           # 5 functions - Version checking, MessageBox
│   ├── globals_job.json               # 6 functions - Job creation and management
│   ├── globals_vector.json            # 12 functions - Vector object creation/casting
│   ├── globals_component.json         # 3 functions - Component methods (Aspire only)
│   ├── globals_document_variable.json # 1 function - Variable name validation
│   └── globals_data_locations.json    # 7 functions - Data folder locations
│
└── Classes (9 classes)
    ├── classes_high_level.json        # 1 class - MaterialBlock
    ├── classes_geometry.json          # 4 classes - Point2D, Point3D, Vector2D, Box2D
    ├── classes_vectors.json           # 2 classes - Contour, ContourGroup
    └── classes_toolpaths.json         # 2 classes - ToolpathManager, Toolpath
```

## 📊 API Coverage

| Category | Type | Count | Description |
|----------|------|-------|-------------|
| General | Global Functions | 5 | Version checking, UI interaction |
| Job | Global Functions | 6 | Job creation and management |
| Vector | Global Functions | 12 | Vector object operations |
| Component | Global Functions | 3 | Component operations (Aspire) |
| Document Variable | Global Functions | 1 | Variable validation |
| Data Locations | Global Functions | 7 | File system paths |
| High Level | Classes | 1 | MaterialBlock |
| Geometry | Classes | 4 | Points, Vectors, Boxes |
| Vectors | Classes | 2 | Contour creation |
| Toolpaths | Classes | 2 | Toolpath management |
| **TOTAL** | **API Items** | **43** | Complete extraction |

## 🚀 Quick Start

### Loading in VS Code Extension

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Load the complete API
function loadVectricAPI(extensionPath: string) {
    const apiPath = path.join(extensionPath, 'vectric-api');
    const indexPath = path.join(apiPath, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Load all global functions
    const globalFunctions = [];
    for (const category of index.globals.categories) {
        const catPath = path.join(apiPath, category.file);
        const catData = JSON.parse(fs.readFileSync(catPath, 'utf8'));
        globalFunctions.push(...catData.functions);
    }
    
    // Load all classes
    const classes = [];
    for (const category of index.classes.categories) {
        const catPath = path.join(apiPath, category.file);
        const catData = JSON.parse(fs.readFileSync(catPath, 'utf8'));
        classes.push(...catData.classes);
    }
    
    return { globalFunctions, classes };
}
```

### Using the API Data

```typescript
const { globalFunctions, classes } = loadVectricAPI(context.extensionPath);

// Provide autocomplete for global functions
globalFunctions.forEach(fn => {
    const item = new vscode.CompletionItem(
        fn.name,
        vscode.CompletionItemKind.Function
    );
    item.detail = fn.detail;
    item.documentation = new vscode.MarkdownString(fn.documentation);
    items.push(item);
});

// Provide autocomplete for classes
classes.forEach(cls => {
    const item = new vscode.CompletionItem(
        cls.name,
        vscode.CompletionItemKind.Class
    );
    item.detail = cls.detail;
    item.documentation = new vscode.MarkdownString(cls.documentation);
    items.push(item);
});
```

## 📖 Global Methods

### General (5 functions)
- `IsAspire()` - Check if running in Aspire
- `IsBetaBuild()` - Check if beta build
- `GetAppVersion()` - Get application version
- `GetBuildVersion()` - Get build version
- `MessageBox(text: string)` - Display message box

### Job Related (6 functions)
- `CloseCurrentJob()` - Close current job
- `CreateNewJob(...)` - Create single-sided job
- `CreateNew2SidedJob(...)` - Create double-sided job
- `CreateNewRotaryJob(...)` - Create rotary job
- `OpenExistingJob(pathname: string)` - Open existing job
- `SaveCurrentJob()` - Save current job

### Vector Object Related (12 functions)
- `CastCadObjectToCadBitmap(obj)` - Cast to CadBitmap
- `CastCadObjectToCadContour(obj)` - Cast to CadContour
- `CastCadObjectToCadObjectGroup(obj)` - Cast to CadObjectGroup
- `CastCadObjectToCadPolyline(obj)` - Cast to CadPolyline
- `CastCadObjectToCadToolpathOutline(obj)` - Cast to CadToolpathOutline
- `CastCadObjectToCadToolpathPreview(obj)` - Cast to CadToolpathPreview
- `CastCadObjectToTxtBlock(obj)` - Cast to TxtBlock
- `CreateCircle(...)` - Create circle contour
- `CreateCopyOfSelectedContours(...)` - Copy selected contours
- `CreateCadContour(ctr)` - Create CadContour
- `CreateCadGroup(ctr_group)` - Create CadGroup
- `GetDefaultContourTolerance()` - Get default tolerance

### Component Related (3 functions - Aspire Only)
- `IsTransparent(value)` - Check if value is transparent
- `GetTransparentHeight()` - Get transparent height
- `CastComponentToComponentGroup(component)` - Cast to ComponentGroup

### Document Variable (1 function)
- `IsInvalidDocumentVariableName(name)` - Validate variable name

### Data Locations (7 functions)
- `GetDataLocation()` - Get root data location
- `GetPostProcessorLocation()` - Get PostP folder
- `GetToolDatabaseLocation()` - Get tool database folder
- `GetGadgetsLocation()` - Get gadgets folder
- `GetToolpathDefaultsLocation()` - Get toolpath defaults folder
- `GetBitmapTexturesLocation()` - Get bitmap textures folder
- `GetVectorTexturesLocation()` - Get vector textures folder

## 🎯 Classes

### High Level Objects (1 class)

**MaterialBlock** - Material block with dimensions and origin
- 15 Properties: Width, Height, Thickness, XYOrigin, ZOrigin, etc.
- 10 Methods: CalcAbsoluteZ, CalcDepthFromAbsoluteZ, etc.
- 13 Constants: BLC, BRC, TLC, TRC, CENTRE, Z_TOP, etc.

### Geometry Objects (4 classes)

**Point2D** - 2D point (X, Y)
- 5 Properties: X, Y, IsInvalid
- 5 Methods: Clone, Equals, Length, Offset, SetInvalid
- 4 Operators: Matrix2D * Point2D, Point2D ± Point2D/Vector2D

**Point3D** - 3D point (X, Y, Z)
- 7 Properties: X, Y, Z, IsInvalid
- 5 Methods: Clone, Equals, Length, Offset, SetInvalid
- 3 Operators: Matrix2D * Point3D, Point3D operations

**Vector2D** - 2D vector
- 4 Properties: X, Y
- 6 Methods: Angle, Clone, Length, Normalize, Perpendicular, Rotate
- 3 Operators: Matrix2D * Vector2D, Vector2D ± Vector2D

**Box2D** - 2D bounding box
- 8 Properties: BLC, BRC, TLC, TRC, Centre, XLength, YLength, IsEmpty
- 6 Methods: Clone, Expand, IncludeBox, IncludePoint, IsPointInside, Overlaps

### Vector Creation (2 classes)

**Contour** - Vector path (lines, arcs, beziers)
- 5 Properties: Area, BoundingBox, IsClosed, IsClockwise, Perimeter
- 4 Methods: AppendPoint, LineTo, ArcTo, Clone

**ContourGroup** - Collection of contours
- 2 Properties: Count, IsEmpty
- 3 Methods: AddHead, AddTail, Clone

### Toolpath Objects (2 classes)

**ToolpathManager** - Manages all toolpaths
- 1 Property: Count
- 1 Method: GetHeadPosition

**Toolpath** - Individual toolpath operation
- 2 Properties: Name, Visible
- 1 Method: GetTool

## 💾 JSON File Format

Each JSON file follows a consistent structure:

```json
{
  "version": "12.5",
  "category": "Category Name",
  "functions": [...]  // For global methods
  "classes": [...]    // For class definitions
}
```

### Function Structure
```json
{
  "name": "FunctionName",
  "kind": "Function",
  "detail": "(param1: type1) → returnType",
  "documentation": "Description...",
  "signature": {
    "label": "FunctionName(param1: type1)",
    "documentation": "Brief description",
    "parameters": [
      {
        "label": "param1",
        "documentation": "param1: type1"
      }
    ],
    "returns": "returnType"
  }
}
```

### Class Structure
```json
{
  "name": "ClassName",
  "kind": "Class",
  "detail": "class ClassName",
  "documentation": "Description...",
  "constructors": [...],
  "properties": [...],
  "methods": [...],
  "constants": [...],
  "operators": [...]
}
```

## 🔧 Integration Examples

### Example 1: Autocomplete Provider

```typescript
const completionProvider = vscode.languages.registerCompletionItemProvider(
    'lua',
    {
        provideCompletionItems(document, position) {
            const items: vscode.CompletionItem[] = [];
            
            // Add global functions
            globalFunctions.forEach(fn => {
                const item = new vscode.CompletionItem(
                    fn.name,
                    vscode.CompletionItemKind.Function
                );
                item.detail = fn.detail;
                item.documentation = new vscode.MarkdownString(fn.documentation);
                
                // Add snippet for parameters
                if (fn.signature && fn.signature.parameters.length > 0) {
                    const params = fn.signature.parameters
                        .map((p, i) => `\${${i + 1}:${p.label}}`)
                        .join(', ');
                    item.insertText = new vscode.SnippetString(
                        `${fn.name}(${params})$0`
                    );
                }
                
                items.push(item);
            });
            
            return items;
        }
    }
);
```

### Example 2: Hover Provider

```typescript
const hoverProvider = vscode.languages.registerHoverProvider('lua', {
    provideHover(document, position) {
        const word = document.getText(document.getWordRangeAtPosition(position));
        
        // Check global functions
        const globalFn = globalFunctions.find(f => f.name === word);
        if (globalFn) {
            let markdown = `### ${globalFn.name}\n\n`;
            markdown += `${globalFn.documentation}\n\n`;
            markdown += `**Signature:** \`${globalFn.signature.label}\`\n\n`;
            
            if (globalFn.signature.parameters.length > 0) {
                markdown += `**Parameters:**\n`;
                globalFn.signature.parameters.forEach(p => {
                    markdown += `- \`${p.label}\`: ${p.documentation}\n`;
                });
            }
            
            markdown += `\n**Returns:** ${globalFn.signature.returns}`;
            return new vscode.Hover(new vscode.MarkdownString(markdown));
        }
        
        // Check classes
        const cls = classes.find(c => c.name === word);
        if (cls) {
            let markdown = `### ${cls.name}\n\n${cls.documentation}\n\n`;
            if (cls.properties) {
                markdown += `**Properties:** ${cls.properties.length}\n\n`;
            }
            if (cls.methods) {
                markdown += `**Methods:** ${cls.methods.length}\n\n`;
            }
            return new vscode.Hover(new vscode.MarkdownString(markdown));
        }
        
        return null;
    }
});
```

### Example 3: Signature Help

```typescript
const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    'lua',
    {
        provideSignatureHelp(document, position) {
            const sigHelp = new vscode.SignatureHelp();
            
            globalFunctions.forEach(fn => {
                if (fn.signature) {
                    const sig = new vscode.SignatureInformation(
                        fn.signature.label,
                        fn.signature.documentation
                    );
                    
                    sig.parameters = fn.signature.parameters.map(p =>
                        new vscode.ParameterInformation(p.label, p.documentation)
                    );
                    
                    sigHelp.signatures.push(sig);
                }
            });
            
            return sigHelp;
        }
    },
    '(', ','
);
```

## 📝 Usage Examples

### Creating a Simple Job

```lua
-- Create a new single-sided job
local bounds = Box2D(0, 0, 300, 200)  -- 300mm x 200mm
local success = CreateNewJob(
    "MyJob",     -- name
    bounds,      -- bounds
    18,          -- thickness (18mm)
    true,        -- in mm
    true         -- origin on surface
)

if success then
    local mtl_block = MaterialBlock()
    MessageBox("Job created: " .. mtl_block.Width .. " x " .. mtl_block.Height)
end
```

### Creating a Rectangle Contour

```lua
-- Create a rectangle
local ctr = Contour(0.001)
ctr:AppendPoint(Point2D(0, 0))
ctr:LineTo(100, 0)
ctr:LineTo(100, 50)
ctr:LineTo(0, 50)
ctr:LineTo(0, 0)  -- Close the contour

-- Create a CadContour to add to the job
local cad_ctr = CreateCadContour(ctr)
```

## 🎓 Best Practices

1. **Always check return values** - Many functions return boolean success indicators
2. **Use appropriate tolerance values** - Use `GetDefaultContourTolerance()` when unsure
3. **Check job existence** - Use `job.Exists` before accessing job properties
4. **Handle units properly** - Check `MaterialBlock.InMM` to handle mm vs inches
5. **Clone objects when needed** - Use `Clone()` methods to avoid unintended modifications

## 📚 Additional Resources

- Full PDF Documentation: Vectric_Lua_Interface_Documentation.pdf
- Vectric Forum: Community support and examples
- Example Scripts: Available from Vectric website

## 🔄 Updates

This API reference is based on version 12.5 of the Vectric Lua Interface (June 2025). Always consult the latest official documentation for the most current information.

## ⚖️ License

This API reference is extracted from official Vectric documentation for development purposes. Vectric and related trademarks are property of Vectric Ltd.

---

**Note:** This is a curated subset focused on the most commonly used functions and classes. The complete Vectric Lua Interface includes additional classes for CAD objects, selection management, component management (Aspire), relief objects (Aspire), and more. Refer to the full PDF documentation for complete coverage.
