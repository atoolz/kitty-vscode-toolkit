import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { openKittyDoc, sleep, hoverToString } from "./helpers";

suite("Hover Provider", () => {
  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("should show hover for config option names", async () => {
    const content = "font_size 12.0\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(0, 3);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        uri,
        position,
      );
      assert.ok(hovers && hovers.length > 0, "Should return hover info");
      const text = hoverToString(hovers);
      assert.ok(
        text.includes("font_size"),
        `Hover should mention "font_size", got: ${text}`,
      );
    } finally {
      cleanup();
    }
  });

  test("should show hover for cursor_shape option", async () => {
    const content = "cursor_shape block\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(0, 5);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        uri,
        position,
      );
      assert.ok(hovers && hovers.length > 0, "Should return hover for option");
      const text = hoverToString(hovers);
      assert.ok(
        text.includes("cursor_shape"),
        `Hover should mention "cursor_shape", got: ${text}`,
      );
    } finally {
      cleanup();
    }
  });

  test("should show hover for scrollback_lines option", async () => {
    const content = "scrollback_lines 10000\nenable_audio_bell no\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const position = new vscode.Position(0, 8);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        uri,
        position,
      );
      assert.ok(
        hovers && hovers.length > 0,
        "Should return hover for option",
      );
      const text = hoverToString(hovers);
      assert.ok(
        text.includes("scrollback_lines"),
        `Hover should mention "scrollback_lines", got: ${text}`,
      );
    } finally {
      cleanup();
    }
  });

  test("should NOT show hover for non-kitty content", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kitty-test-"));
    const filePath = path.join(tmpDir, "other.conf");
    fs.writeFileSync(filePath, "key = 42\n", "utf8");
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    await sleep(2000);
    try {
      const position = new vscode.Position(0, 1);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        uri,
        position,
      );
      const hasKittyHover =
        hovers &&
        hovers.some((h) => {
          const text = hoverToString([h]);
          return text.includes("Kitty") || text.includes("kitty");
        });
      assert.ok(
        !hasKittyHover,
        "Non-kitty files should not get kitty hover",
      );
    } finally {
      try {
        fs.unlinkSync(filePath);
        fs.rmdirSync(tmpDir);
      } catch {
        // ignore
      }
    }
  });
});
