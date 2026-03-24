import * as vscode from "vscode";
import { isKittyConfig, parseConfigKeys } from "../utils/kittyParser";
import { allKnownKeys, findOption } from "../data/options";

const DIAGNOSTIC_SOURCE = "Kitty Toolkit";

export class KittyDiagnosticProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("kitty");

    // Validate on open and change
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => this.validate(doc)),
      vscode.workspace.onDidChangeTextDocument((e) =>
        this.validate(e.document),
      ),
      vscode.workspace.onDidCloseTextDocument((doc) =>
        this.diagnosticCollection.delete(doc.uri),
      ),
    );

    // Validate all open documents
    for (const doc of vscode.workspace.textDocuments) {
      this.validate(doc);
    }
  }

  validate(document: vscode.TextDocument): void {
    if (!isKittyConfig(document)) {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const pairs = parseConfigKeys(document);

    for (const pair of pairs) {
      // Skip lines that are clearly not config entries (action-only lines inside map, etc.)
      // Directives like map, mouse_map, include, globinclude, env are known keys
      if (!allKnownKeys.has(pair.key)) {
        this.addUnknownKeyDiagnostic(document, pair, diagnostics);
        continue;
      }

      // Validate values for known options
      const opt = findOption(pair.key);
      if (opt && pair.value) {
        this.validateValue(document, pair, opt, diagnostics);
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  private addUnknownKeyDiagnostic(
    document: vscode.TextDocument,
    pair: { key: string; value: string; line: number },
    diagnostics: vscode.Diagnostic[],
  ): void {
    const lineText = document.lineAt(pair.line).text;
    const keyStart = lineText.length - lineText.trimStart().length;

    const range = new vscode.Range(
      pair.line,
      keyStart,
      pair.line,
      keyStart + pair.key.length,
    );

    diagnostics.push(
      this.createDiagnostic(
        range,
        `Unknown kitty config option: "${pair.key}"`,
        vscode.DiagnosticSeverity.Warning,
      ),
    );
  }

  private validateValue(
    document: vscode.TextDocument,
    pair: { key: string; value: string; line: number },
    opt: {
      name: string;
      type: string;
      values?: string[];
    },
    diagnostics: vscode.Diagnostic[],
  ): void {
    const value = pair.value.trim();
    if (value === "" || value === "none") return;

    const lineText = document.lineAt(pair.line).text;
    const keyStart = lineText.length - lineText.trimStart().length;
    const valueStart = lineText.indexOf(value, keyStart + pair.key.length);
    if (valueStart < 0) return;

    const range = new vscode.Range(
      pair.line,
      valueStart,
      pair.line,
      valueStart + value.length,
    );

    switch (opt.type) {
      case "boolean":
        if (value !== "yes" && value !== "no") {
          diagnostics.push(
            this.createDiagnostic(
              range,
              `Invalid boolean value for "${opt.name}": expected "yes" or "no", got "${value}"`,
              vscode.DiagnosticSeverity.Error,
            ),
          );
        }
        break;

      case "number":
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          diagnostics.push(
            this.createDiagnostic(
              range,
              `Invalid number value for "${opt.name}": "${value}"`,
              vscode.DiagnosticSeverity.Error,
            ),
          );
        }
        break;

      case "enum":
        if (opt.values && !opt.values.includes(value)) {
          diagnostics.push(
            this.createDiagnostic(
              range,
              `Invalid value for "${opt.name}": "${value}". Allowed values: ${opt.values.join(", ")}`,
              vscode.DiagnosticSeverity.Error,
            ),
          );
        }
        break;

      case "color":
        // Valid color formats: #rrggbb, #rrggbbaa, named color "none"
        if (value !== "none" && !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) {
          diagnostics.push(
            this.createDiagnostic(
              range,
              `Invalid color value for "${opt.name}": "${value}". Expected #rrggbb, #rrggbbaa, or "none"`,
              vscode.DiagnosticSeverity.Warning,
            ),
          );
        }
        break;

      default:
        break;
    }
  }

  private createDiagnostic(
    range: vscode.Range,
    message: string,
    severity: vscode.DiagnosticSeverity,
  ): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = DIAGNOSTIC_SOURCE;
    return diagnostic;
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
