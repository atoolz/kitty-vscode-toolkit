import * as vscode from "vscode";
import { isKittyConfig, getKittyContext } from "../utils/kittyParser";
import { findOption, findDirective } from "../data/options";

const DOC_URL = "https://sw.kovidgoyal.net/kitty/conf/";

export class KittyHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.Hover | undefined {
    if (!isKittyConfig(document)) {
      return undefined;
    }

    const lineText = document.lineAt(position.line).text;
    const trimmed = lineText.trim();

    // Skip comments and empty lines
    if (trimmed === "" || trimmed.startsWith("#")) {
      return undefined;
    }

    const ctx = getKittyContext(document, position);

    // Only show hover when cursor is over the key name
    if (!ctx.inValue && ctx.currentKey) {
      return this.hoverKey(lineText, position, ctx.currentKey);
    }

    return undefined;
  }

  private hoverKey(
    lineText: string,
    position: vscode.Position,
    key: string,
  ): vscode.Hover | undefined {
    // Verify cursor is over the key text
    const leadingSpaces = lineText.length - lineText.trimStart().length;
    const keyStart = leadingSpaces;
    const keyEnd = keyStart + key.length;

    if (position.character < keyStart || position.character > keyEnd) {
      return undefined;
    }

    // Check config options
    const opt = findOption(key);
    if (opt) {
      return this.buildOptionHover(opt);
    }

    // Check directives
    const dir = findDirective(key);
    if (dir) {
      return this.buildDirectiveHover(dir);
    }

    return undefined;
  }

  private buildOptionHover(opt: {
    name: string;
    type: string;
    default: string;
    description: string;
    category: string;
    values?: string[];
  }): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**\`${opt.name}\`** : \`${opt.type}\`\n\n`);
    md.appendMarkdown(`${opt.description}\n\n`);
    md.appendMarkdown(`**Category:** ${opt.category}\n\n`);
    md.appendMarkdown(`**Default:** \`${opt.default || "unset"}\`\n\n`);
    if (opt.values && opt.values.length > 0) {
      md.appendMarkdown(
        `**Allowed values:** ${opt.values.map((v) => `\`${v}\``).join(", ")}\n\n`,
      );
    }
    md.appendMarkdown(`[Kitty Documentation](${DOC_URL})`);
    return new vscode.Hover(md);
  }

  private buildDirectiveHover(dir: {
    name: string;
    description: string;
    category: string;
  }): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**\`${dir.name}\`** (directive)\n\n`);
    md.appendMarkdown(`${dir.description}\n\n`);
    md.appendMarkdown(`[Kitty Documentation](${DOC_URL})`);
    return new vscode.Hover(md);
  }
}
