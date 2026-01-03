# Vectric Intellisense README

This is a visual studio extension for the Vectric Lua Interface for Gadgets.  It was extracted from the PDF included in the Vectric Gadget SDK version 12.

## Features

This extension provides intellisense so that the classes, methods, functions and types are known to VS code and help author Vectric Gadgets in Lua.

It provides command completion provider, a signature help provider, and a hover provider based upon the Vectric SDK Documentation provided in the V12 SDK.

## Requirements

No additional dependencies are required.

## Extension Settings

No settings are required.

## Known Issues

Selection traversal methods (GetNext(), GetPrev()) return multiple objects which isn't supported by this
extension due to a limitation in VS Code's Intellisense.  Because of this, the types returned by these
methods can't be inferred, and the intellisense doesn't properly work.

Any missing or inaccurate content can be corrected with simple change to json files without any code changes.

## Release Notes

The initial release doesn't cover the Gadget API 100%.  It's missing User Interface and Aspire classes.

### 1.0.0

Initial release of Vectric Intellisense
