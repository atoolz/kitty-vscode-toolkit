import * as vscode from "vscode";

export interface KittyContext {
  /** The config key on the current line */
  currentKey: string;
  /** The value portion of the current line (after the key) */
  currentValue: string;
  /** Whether the cursor is in the value portion */
  inValue: boolean;
  /** Whether this is a map/mouse_map line */
  isMapLine: boolean;
  /** Whether this is an include/globinclude directive */
  isInclude: boolean;
}

/**
 * Determines the kitty.conf context at a given position.
 * Kitty config uses space-separated key-value pairs (no equals sign).
 */
export function getKittyContext(
  document: vscode.TextDocument,
  position: vscode.Position,
): KittyContext {
  const lineText = document.lineAt(position.line).text;
  const trimmed = lineText.trim();

  // Default context
  const ctx: KittyContext = {
    currentKey: "",
    currentValue: "",
    inValue: false,
    isMapLine: false,
    isInclude: false,
  };

  // Skip comments and empty lines
  if (trimmed === "" || trimmed.startsWith("#")) {
    return ctx;
  }

  // Split line into key and value at the first space
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    // Only a key, no value yet
    ctx.currentKey = trimmed;
    return ctx;
  }

  ctx.currentKey = trimmed.substring(0, spaceIndex);
  ctx.currentValue = trimmed.substring(spaceIndex + 1);

  // Determine if cursor is in the value portion
  // Find the position of the first space in the original (non-trimmed) line
  const leadingSpaces = lineText.length - lineText.trimStart().length;
  const keyEndPos = leadingSpaces + spaceIndex;
  ctx.inValue = position.character > keyEndPos;

  // Check for special directives
  ctx.isMapLine = ctx.currentKey === "map" || ctx.currentKey === "mouse_map";
  ctx.isInclude =
    ctx.currentKey === "include" || ctx.currentKey === "globinclude";

  return ctx;
}

/**
 * Checks if the document is a kitty config file.
 */
export function isKittyConfig(document: vscode.TextDocument): boolean {
  const fileName = document.fileName;
  if (fileName.endsWith("kitty.conf")) {
    return true;
  }
  // Also match files in a kitty config directory
  if (
    fileName.endsWith(".conf") &&
    (fileName.includes("/kitty/") || fileName.includes("\\kitty\\"))
  ) {
    return true;
  }
  // Check if the language ID is set to kitty
  if (document.languageId === "kitty") {
    return true;
  }
  return false;
}

/**
 * Parse all key-value pairs from the document.
 * Returns an array of { key, value, line } objects.
 */
export function parseConfigKeys(
  document: vscode.TextDocument,
): Array<{ key: string; value: string; line: number }> {
  const pairs: Array<{ key: string; value: string; line: number }> = [];

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text.trim();
    if (line === "" || line.startsWith("#")) continue;

    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) {
      // Key with no value
      pairs.push({ key: line, value: "", line: i });
      continue;
    }

    const key = line.substring(0, spaceIndex);
    const value = line.substring(spaceIndex + 1).trim();
    pairs.push({ key, value, line: i });
  }

  return pairs;
}
