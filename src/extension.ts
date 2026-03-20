import * as vscode from "vscode";
import { KittyCompletionProvider } from "./providers/completionProvider";
import { KittyHoverProvider } from "./providers/hoverProvider";
import { KittyDiagnosticProvider } from "./providers/diagnosticProvider";

const KITTY_SELECTOR: vscode.DocumentSelector = {
  language: "kitty",
};

export function activate(context: vscode.ExtensionContext): void {
  // Register completion provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      KITTY_SELECTOR,
      new KittyCompletionProvider(),
      " ", // trigger after space (key value format)
      "#", // trigger for color values
    ),
  );

  // Register hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      KITTY_SELECTOR,
      new KittyHoverProvider(),
    ),
  );

  // Register diagnostics
  const diagnosticProvider = new KittyDiagnosticProvider();
  context.subscriptions.push(diagnosticProvider);

  // Log activation
  const outputChannel = vscode.window.createOutputChannel("Kitty Toolkit");
  outputChannel.appendLine("Kitty Toolkit activated");
  context.subscriptions.push(outputChannel);
}

export function deactivate(): void {
  // cleanup handled by disposables
}
