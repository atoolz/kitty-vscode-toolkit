import * as assert from "assert";
import * as vscode from "vscode";
import { openKittyDoc, sleep } from "./helpers";

suite("Diagnostics Provider", () => {
  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await sleep(500);
  });

  test("should warn about unknown config keys", async () => {
    const content = "fake_option value\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const unknownKey = diagnostics.find(
        (d) =>
          d.message.includes("Unknown kitty config option") &&
          d.message.includes("fake_option"),
      );
      assert.ok(
        unknownKey,
        `Should warn about unknown key, got: ${diagnostics.map((d) => d.message).join("; ")}`,
      );
      assert.strictEqual(
        unknownKey.severity,
        vscode.DiagnosticSeverity.Warning,
      );
    } finally {
      cleanup();
    }
  });

  test("should report invalid boolean values", async () => {
    const content = "enable_audio_bell maybe\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const invalidBool = diagnostics.find(
        (d) =>
          d.message.includes("Invalid boolean value") &&
          d.message.includes("enable_audio_bell"),
      );
      assert.ok(
        invalidBool,
        `Should report invalid boolean, got: ${diagnostics.map((d) => d.message).join("; ")}`,
      );
    } finally {
      cleanup();
    }
  });

  test("should report invalid number values", async () => {
    const content = "font_size big\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const invalidNum = diagnostics.find(
        (d) =>
          d.message.includes("Invalid number value") &&
          d.message.includes("font_size"),
      );
      assert.ok(
        invalidNum,
        `Should report invalid number, got: ${diagnostics.map((d) => d.message).join("; ")}`,
      );
    } finally {
      cleanup();
    }
  });

  test("should report invalid enum values", async () => {
    const content = "cursor_shape triangle\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const invalidEnum = diagnostics.find(
        (d) =>
          d.message.includes("Invalid value") &&
          d.message.includes("cursor_shape"),
      );
      assert.ok(
        invalidEnum,
        `Should report invalid enum value, got: ${diagnostics.map((d) => d.message).join("; ")}`,
      );
    } finally {
      cleanup();
    }
  });

  test("valid config should produce zero diagnostics", async () => {
    const content = [
      "font_family monospace",
      "font_size 12.0",
      "cursor_shape block",
      "enable_audio_bell no",
      "scrollback_lines 10000",
      "tab_bar_style powerline",
      "foreground #dddddd",
      "background #000000",
    ].join("\n");
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      assert.strictEqual(
        diagnostics.length,
        0,
        `Valid config should have 0 diagnostics, got ${diagnostics.length}: ${diagnostics.map((d) => d.message).join("; ")}`,
      );
    } finally {
      cleanup();
    }
  });

  test("should report multiple errors in one file", async () => {
    const content = [
      "fake_option value",
      "not_a_real_setting 42",
      "enable_audio_bell maybe",
      "cursor_shape triangle",
    ].join("\n");
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      assert.ok(
        diagnostics.length >= 3,
        `Should report at least 3 diagnostics, got ${diagnostics.length}: ${diagnostics.map((d) => d.message).join("; ")}`,
      );

      const hasUnknownKey = diagnostics.some((d) =>
        d.message.includes("Unknown kitty config option"),
      );
      const hasInvalidBool = diagnostics.some((d) =>
        d.message.includes("Invalid boolean value"),
      );
      const hasInvalidEnum = diagnostics.some((d) =>
        d.message.includes("Invalid value"),
      );

      assert.ok(hasUnknownKey, "Should have unknown key warning");
      assert.ok(hasInvalidBool, "Should have invalid boolean warning");
      assert.ok(hasInvalidEnum, "Should have invalid enum value warning");
    } finally {
      cleanup();
    }
  });

  test("should report invalid color values", async () => {
    const content = "foreground not-a-color\n";
    const { uri, cleanup } = await openKittyDoc(content);
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const invalidColor = diagnostics.find(
        (d) =>
          d.message.includes("Invalid color value") &&
          d.message.includes("foreground"),
      );
      assert.ok(
        invalidColor,
        `Should report invalid color, got: ${diagnostics.map((d) => d.message).join("; ")}`,
      );
    } finally {
      cleanup();
    }
  });
});
