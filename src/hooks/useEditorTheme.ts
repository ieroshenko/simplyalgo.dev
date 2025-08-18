import { useState, useEffect } from "react";
import { editor } from "monaco-editor";

export type EditorTheme =
  | "light"
  | "vs-dark"
  | "gruvbox-dark"
  | "monokai"
  | "github-dark";

const themes = {
  light: "light",
  "vs-dark": "vs-dark",
  "gruvbox-dark": "gruvbox-dark",
  monokai: "monokai",
  "github-dark": "github-dark",
};

export const useEditorTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<EditorTheme>(() => {
    // Load theme from localStorage on initialization
    const saved = localStorage.getItem("editor-theme");
    const validThemes: EditorTheme[] = [
      "light",
      "vs-dark",
      "gruvbox-dark",
      "monokai",
      "github-dark",
    ];
    return saved && validThemes.includes(saved as EditorTheme)
      ? (saved as EditorTheme)
      : "light";
  });

  // Persist theme changes to localStorage
  const setCurrentThemeWithPersistence = (theme: EditorTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem("editor-theme", theme);
  };

  const defineCustomThemes = (monaco: any) => {
    // Gruvbox Dark Theme
    monaco.editor.defineTheme("gruvbox-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "928374", fontStyle: "italic" },
        { token: "keyword", foreground: "fb4934" },
        { token: "string", foreground: "b8bb26" },
        { token: "number", foreground: "d3869b" },
        { token: "type", foreground: "fabd2f" },
        { token: "class", foreground: "8ec07c" },
        { token: "function", foreground: "83a598" },
        { token: "variable", foreground: "ebdbb2" },
      ],
      colors: {
        "editor.background": "#282828",
        "editor.foreground": "#ebdbb2",
        "editor.lineHighlightBackground": "#3c3836",
        "editor.selectionBackground": "#665c54",
        "editorCursor.foreground": "#ebdbb2",
        "editorLineNumber.foreground": "#7c6f64",
        "editorLineNumber.activeForeground": "#ebdbb2",
      },
    });

    // Monokai Theme
    monaco.editor.defineTheme("monokai", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "75715e", fontStyle: "italic" },
        { token: "keyword", foreground: "f92672" },
        { token: "string", foreground: "e6db74" },
        { token: "number", foreground: "ae81ff" },
        { token: "type", foreground: "66d9ef" },
        { token: "class", foreground: "a6e22e" },
        { token: "function", foreground: "a6e22e" },
        { token: "variable", foreground: "f8f8f2" },
      ],
      colors: {
        "editor.background": "#272822",
        "editor.foreground": "#f8f8f2",
        "editor.lineHighlightBackground": "#3e3d32",
        "editor.selectionBackground": "#49483e",
        "editorCursor.foreground": "#f8f8f0",
        "editorLineNumber.foreground": "#90908a",
        "editorLineNumber.activeForeground": "#f8f8f2",
      },
    });

    // GitHub Dark Theme
    monaco.editor.defineTheme("github-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "8b949e", fontStyle: "italic" },
        { token: "keyword", foreground: "ff7b72" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
        { token: "type", foreground: "ffa657" },
        { token: "class", foreground: "7ee787" },
        { token: "function", foreground: "d2a8ff" },
        { token: "variable", foreground: "e6edf3" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#e6edf3",
        "editor.lineHighlightBackground": "#161b22",
        "editor.selectionBackground": "#264f78",
        "editorCursor.foreground": "#e6edf3",
        "editorLineNumber.foreground": "#7d8590",
        "editorLineNumber.activeForeground": "#e6edf3",
      },
    });
  };

  return {
    currentTheme,
    setCurrentTheme: setCurrentThemeWithPersistence,
    defineCustomThemes,
    availableThemes: [
      { value: "light", label: "Light" },
      { value: "vs-dark", label: "VS Code Dark" },
      { value: "gruvbox-dark", label: "Gruvbox Dark" },
      { value: "monokai", label: "Monokai" },
      { value: "github-dark", label: "GitHub Dark" },
    ] as const,
  };
};
