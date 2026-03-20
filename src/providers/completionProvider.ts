import * as vscode from "vscode";
import { getKittyContext, isKittyConfig } from "../utils/kittyParser";
import {
  kittyOptions,
  kittyDirectives,
  kittyActions,
  findOption,
} from "../data/options";

export class KittyCompletionProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): vscode.CompletionItem[] | undefined {
    if (!isKittyConfig(document)) {
      return undefined;
    }

    const lineText = document.lineAt(position.line).text;
    const trimmed = lineText.trim();

    // Skip comments
    if (trimmed.startsWith("#")) {
      return undefined;
    }

    const ctx = getKittyContext(document, position);

    // If on a map line and in the value, complete actions
    if (ctx.isMapLine && ctx.inValue) {
      return this.completeMapActions(ctx);
    }

    // If in value, complete based on the key's type
    if (ctx.inValue) {
      return this.completeValue(ctx);
    }

    // Key completion (beginning of line)
    return this.completeKey();
  }

  private completeKey(): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const docUrl = "https://sw.kovidgoyal.net/kitty/conf/";

    // Add all config options
    for (const opt of kittyOptions) {
      const item = new vscode.CompletionItem(
        opt.name,
        vscode.CompletionItemKind.Property,
      );
      item.detail = `${opt.type} (default: ${opt.default || "unset"}) [${opt.category}]`;
      item.documentation = new vscode.MarkdownString(
        `${opt.description}\n\n[Documentation](${docUrl})`,
      );
      item.insertText = this.keyValueSnippet(opt);
      // Sort color0-255 lower
      item.sortText = opt.name.match(/^color\d+$/)
        ? `zzz_${opt.name.padStart(10, "0")}`
        : opt.name;
      items.push(item);
    }

    // Add directives
    for (const dir of kittyDirectives) {
      const item = new vscode.CompletionItem(
        dir.name,
        vscode.CompletionItemKind.Keyword,
      );
      item.detail = `Directive [${dir.category}]`;
      item.documentation = new vscode.MarkdownString(
        `${dir.description}\n\n[Documentation](${docUrl})`,
      );

      switch (dir.name) {
        case "map":
          item.insertText = new vscode.SnippetString(
            "map ${1:ctrl+shift+c} ${2:copy_to_clipboard}",
          );
          break;
        case "mouse_map":
          item.insertText = new vscode.SnippetString(
            "mouse_map ${1:left} ${2:click} ${3:ungrabbed} ${4:mouse_handle_click} ${5:selection link prompt}",
          );
          break;
        case "include":
          item.insertText = new vscode.SnippetString(
            "include ${1:file.conf}",
          );
          break;
        case "globinclude":
          item.insertText = new vscode.SnippetString(
            "globinclude ${1:*.conf}",
          );
          break;
        case "env":
          item.insertText = new vscode.SnippetString(
            "env ${1:KEY}=${2:VALUE}",
          );
          break;
        default:
          item.insertText = new vscode.SnippetString(`${dir.name} \${1}`);
      }

      items.push(item);
    }

    return items;
  }

  private completeValue(ctx: {
    currentKey: string;
    currentValue: string;
  }): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const opt = findOption(ctx.currentKey);

    if (!opt) {
      return items;
    }

    switch (opt.type) {
      case "boolean":
        items.push(
          this.valueItem("yes", "Boolean value"),
          this.valueItem("no", "Boolean value"),
        );
        break;

      case "enum":
        if (opt.values) {
          for (const val of opt.values) {
            const item = this.valueItem(val, `Option for ${opt.name}`);
            if (val === opt.default) {
              item.detail = `${item.detail} (default)`;
            }
            items.push(item);
          }
        }
        break;

      case "color":
        items.push(
          ...this.completeColors(),
        );
        break;

      case "font":
        items.push(
          this.valueItem("auto", "Auto-detect font"),
          this.valueItem("monospace", "Generic monospace font"),
          this.valueItem("FiraCode Nerd Font", "Popular programming font"),
          this.valueItem("JetBrains Mono", "JetBrains programming font"),
          this.valueItem("Cascadia Code", "Microsoft programming font"),
          this.valueItem("Hack", "Source code font"),
          this.valueItem("Iosevka", "Versatile monospace font"),
          this.valueItem("Source Code Pro", "Adobe Source Code Pro"),
          this.valueItem("Inconsolata", "Monospace font by Raph Levien"),
          this.valueItem("Ubuntu Mono", "Ubuntu monospace font"),
          this.valueItem("Droid Sans Mono", "Droid Sans Mono"),
          this.valueItem("DejaVu Sans Mono", "DejaVu Sans Mono"),
        );
        break;

      default:
        break;
    }

    return items;
  }

  private completeMapActions(ctx: {
    currentValue: string;
  }): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    // The value after "map" is "keybinding action", try to complete the action part
    const parts = ctx.currentValue.trim().split(/\s+/);

    // If there's at least one part (the keybinding), suggest actions
    if (parts.length >= 1) {
      for (const action of kittyActions) {
        const item = new vscode.CompletionItem(
          action,
          vscode.CompletionItemKind.Function,
        );
        item.detail = "Kitty action";
        items.push(item);
      }
    }

    return items;
  }

  private completeColors(): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // none
    items.push(this.valueItem("none", "No color / transparent"));

    // Common hex color suggestions
    const commonColors: Array<[string, string]> = [
      ["#000000", "Black"],
      ["#ffffff", "White"],
      ["#ff0000", "Red"],
      ["#00ff00", "Green"],
      ["#0000ff", "Blue"],
      ["#ffff00", "Yellow"],
      ["#ff00ff", "Magenta"],
      ["#00ffff", "Cyan"],
      ["#282828", "Gruvbox dark bg"],
      ["#ebdbb2", "Gruvbox light fg"],
      ["#1e1e2e", "Catppuccin Mocha bg"],
      ["#cdd6f4", "Catppuccin Mocha fg"],
      ["#282a36", "Dracula bg"],
      ["#f8f8f2", "Dracula fg"],
      ["#002b36", "Solarized Dark bg"],
      ["#839496", "Solarized Dark fg"],
    ];

    for (const [hex, label] of commonColors) {
      const item = new vscode.CompletionItem(
        hex,
        vscode.CompletionItemKind.Color,
      );
      item.detail = label;
      items.push(item);
    }

    // Hex placeholder
    const hexItem = new vscode.CompletionItem(
      "#hex",
      vscode.CompletionItemKind.Color,
    );
    hexItem.detail = "Custom hex color";
    hexItem.insertText = new vscode.SnippetString("#${1:000000}");
    items.push(hexItem);

    return items;
  }

  private valueItem(
    value: string,
    detail: string,
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(
      value,
      vscode.CompletionItemKind.Value,
    );
    item.detail = detail;
    return item;
  }

  private keyValueSnippet(opt: {
    name: string;
    type: string;
    default: string;
    values?: string[];
  }): vscode.SnippetString {
    switch (opt.type) {
      case "boolean":
        return new vscode.SnippetString(
          `${opt.name} \${1|yes,no|}`,
        );
      case "enum":
        if (opt.values && opt.values.length > 0) {
          const choices = opt.values.join(",");
          return new vscode.SnippetString(
            `${opt.name} \${1|${choices}|}`,
          );
        }
        return new vscode.SnippetString(
          `${opt.name} \${1:${opt.default}}`,
        );
      case "color":
        return new vscode.SnippetString(
          `${opt.name} \${1:${opt.default || "#000000"}}`,
        );
      case "number":
        return new vscode.SnippetString(
          `${opt.name} \${1:${opt.default}}`,
        );
      case "font":
        return new vscode.SnippetString(
          `${opt.name} \${1:${opt.default}}`,
        );
      default:
        return new vscode.SnippetString(
          `${opt.name} \${1:${opt.default}}`,
        );
    }
  }
}
