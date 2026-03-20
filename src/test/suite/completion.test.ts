import * as assert from "assert";
import * as vscode from "vscode";
import { openKittyDoc } from "./helpers";

suite("Completion Provider", () => {
  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("should provide config key completions", async () => {
    const content = "# kitty config\n\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(1, 0);
      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          uri,
          position,
        );
      assert.ok(completions, "Completions should be returned");
      const labels = completions.items.map((item) =>
        typeof item.label === "string" ? item.label : item.label.label,
      );
      assert.ok(
        labels.includes("font_family"),
        `Should include "font_family", got: ${labels.join(", ")}`,
      );
      assert.ok(
        labels.includes("font_size"),
        `Should include "font_size"`,
      );
      assert.ok(
        labels.includes("cursor_shape"),
        `Should include "cursor_shape"`,
      );
      assert.ok(
        labels.includes("scrollback_lines"),
        `Should include "scrollback_lines"`,
      );
    } finally {
      cleanup();
    }
  });

  test("should provide enum value completions for cursor_shape", async () => {
    const content = "cursor_shape ";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(0, 13);
      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          uri,
          position,
        );
      assert.ok(completions, "Completions should be returned");
      const labels = completions.items.map((item) =>
        typeof item.label === "string" ? item.label : item.label.label,
      );
      const expected = ["block", "beam", "underline"];
      for (const val of expected) {
        assert.ok(
          labels.includes(val),
          `Should include cursor_shape value "${val}", got: ${labels.join(", ")}`,
        );
      }
    } finally {
      cleanup();
    }
  });

  test("should provide enum value completions for tab_bar_style", async () => {
    const content = "tab_bar_style ";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(0, 14);
      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          uri,
          position,
        );
      assert.ok(completions, "Completions should be returned");
      const labels = completions.items.map((item) =>
        typeof item.label === "string" ? item.label : item.label.label,
      );
      const expected = ["fade", "slant", "separator", "powerline", "hidden"];
      for (const val of expected) {
        assert.ok(
          labels.includes(val),
          `Should include tab_bar_style value "${val}", got: ${labels.join(", ")}`,
        );
      }
    } finally {
      cleanup();
    }
  });

  test("should provide boolean value completions", async () => {
    const content = "enable_audio_bell ";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(0, 18);
      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          uri,
          position,
        );
      assert.ok(completions, "Completions should be returned");
      const labels = completions.items.map((item) =>
        typeof item.label === "string" ? item.label : item.label.label,
      );
      assert.ok(
        labels.includes("yes") || labels.includes("no"),
        `Should include boolean values "yes"/"no", got: ${labels.join(", ")}`,
      );
    } finally {
      cleanup();
    }
  });

  test("completions should have documentation", async () => {
    const content = "# config\n\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(1, 0);
      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          uri,
          position,
          undefined,
          10,
        );
      assert.ok(completions, "Completions should be returned");
      const fontSizeItem = completions.items.find((item) => {
        const label =
          typeof item.label === "string" ? item.label : item.label.label;
        return label === "font_size";
      });
      assert.ok(fontSizeItem, 'Should find "font_size" completion item');
      assert.ok(
        fontSizeItem.documentation || fontSizeItem.detail,
        '"font_size" completion should have documentation or detail',
      );
    } finally {
      cleanup();
    }
  });
});
