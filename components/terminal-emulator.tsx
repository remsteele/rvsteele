"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VimEditor } from "@/components/vim-editor";
import {
  interruptPythonRun,
  runPythonScriptStreaming
} from "@/lib/pyodide-runtime";
import {
  buildPromptParts,
  completeInput,
  executeCommand,
  type EditorLaunchRequest,
  type OpenFileRequest,
  type PromptParts,
  type PythonRunRequest,
  type OutputTone
} from "@/lib/terminal-engine";
import {
  HOME_PATH,
  absolutePath,
  getExternalFileUrl,
  getNodeAtPath,
  registerExternalHomeFiles,
  writeFile,
  type ExternalHomeFile
} from "@/lib/virtual-filesystem";

type TextRenderedLine = {
  id: number;
  kind: "text";
  text: string;
  tone: OutputTone;
};

type PromptRenderedLine = {
  id: number;
  kind: "prompt";
  prompt: PromptParts;
  command: string;
};

type RenderedLine = TextRenderedLine | PromptRenderedLine;

const WELCOME_LINES = [
  "Portfolio shell initialized.",
  "Type `help` to view available commands."
];

function toneClass(tone: OutputTone): string {
  if (tone === "error") return "text-rose-400";
  if (tone === "muted") return "text-slate-500";
  return "text-slate-200";
}

export function TerminalEmulator() {
  const [cwd, setCwd] = useState<string[]>([...HOME_PATH]);
  const [lines, setLines] = useState<RenderedLine[]>(
    WELCOME_LINES.map((text, index) => ({ id: index + 1, kind: "text", text, tone: "muted" }))
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [historyDraft, setHistoryDraft] = useState("");
  const [activeEditor, setActiveEditor] = useState<EditorLaunchRequest | null>(null);
  const [runningPython, setRunningPython] = useState(false);
  const [tabSuggestions, setTabSuggestions] = useState<string[]>([]);

  const nextLineId = useRef(lines.length + 1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPythonRunIdRef = useRef(0);
  const interruptedPythonRunIdRef = useRef<number | null>(null);

  const promptParts = useMemo(() => buildPromptParts(cwd), [cwd]);

  const appendLines = (newLines: Array<{ text: string; tone?: OutputTone }>) => {
    if (newLines.length === 0) return;
    setLines((previous) => [
      ...previous,
      ...newLines.map((line) => ({
        id: nextLineId.current++,
        kind: "text" as const,
        text: line.text,
        tone: line.tone ?? "normal"
      }))
    ]);
  };

  const appendPromptLine = (prompt: PromptParts, command: string) => {
    setLines((previous) => [
      ...previous,
      {
        id: nextLineId.current++,
        kind: "prompt",
        prompt,
        command
      }
    ]);
  };

  const clearScreen = () => {
    setLines([]);
  };

  const focusShellInput = () => {
    if (activeEditor || runningPython) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  const executePythonCommand = async (request: PythonRunRequest) => {
    const node = getNodeAtPath(request.path);
    if (!node) {
      appendLines([
        {
          text: `python3: can't open file '${request.displayTarget}': No such file or directory`,
          tone: "error"
        }
      ]);
      return;
    }

    if (node.type !== "file") {
      appendLines([
        {
          text: `python3: can't open file '${request.displayTarget}': Is a directory`,
          tone: "error"
        }
      ]);
      return;
    }

    const streamingRun = runPythonScriptStreaming(
      node.content,
      absolutePath(request.path),
      request.argv,
      {
        onStatus: (status) => {
          if (status === "loading") {
            appendLines([{ text: "Loading Pyodide runtime...", tone: "muted" }]);
          }
        },
        onStdout: (line) => {
          appendLines([{ text: line }]);
        },
        onStderr: (line) => {
          appendLines([{ text: line, tone: "error" }]);
        }
      }
    );
    const runId = streamingRun.runId;
    currentPythonRunIdRef.current = runId;

    try {
      const result = await streamingRun.promise;

      if (interruptedPythonRunIdRef.current === runId) {
        interruptedPythonRunIdRef.current = null;
        return;
      }

      if (result.exitCode !== 0) {
        appendLines([{ text: `[python exited with code ${result.exitCode}]`, tone: "muted" }]);
      }
    } catch (error) {
      if (interruptedPythonRunIdRef.current === runId) {
        interruptedPythonRunIdRef.current = null;
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown Python runtime error";
      appendLines([
        {
          text: `python3: failed to execute '${request.displayTarget}': ${message}`,
          tone: "error"
        }
      ]);
    } finally {
      if (currentPythonRunIdRef.current === runId) {
        setRunningPython(false);
        window.requestAnimationFrame(() => {
          inputRef.current?.focus({ preventScroll: true });
        });
      }
    }
  };

  const openFileInNewTab = (request: OpenFileRequest) => {
    const node = getNodeAtPath(request.path);
    if (!node || node.type !== "file") {
      appendLines([
        {
          text: `open: ${request.displayTarget}: No such file or directory`,
          tone: "error"
        }
      ]);
      return;
    }

    const externalUrl = getExternalFileUrl(request.path);
    if (externalUrl) {
      const anchor = document.createElement("a");
      anchor.href = externalUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    const fileName = request.path[request.path.length - 1] || "download.txt";
    const blobUrl = URL.createObjectURL(
      new Blob([node.content], { type: "application/octet-stream" })
    );
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const runInput = async () => {
    if (activeEditor || runningPython) return;

    const command = input;
    appendPromptLine(promptParts, command);

    const trimmed = command.trim();
    const nextHistory = trimmed.length > 0 ? [...history, command] : history;
    if (trimmed.length > 0) {
      setHistory(nextHistory);
    }

    const result = executeCommand(command, cwd, nextHistory);
    setCwd(result.nextCwd);

    if (result.clear) {
      clearScreen();
    } else {
      appendLines(result.lines);
    }

    if (result.editor) {
      setActiveEditor(result.editor);
    }

    if (result.openFile) {
      openFileInNewTab(result.openFile);
    }

    setInput("");
    setHistoryIndex(null);
    setHistoryDraft("");
    setTabSuggestions([]);

    if (result.pythonRun) {
      setRunningPython(true);
      await executePythonCommand(result.pythonRun);
    }
  };

  const interruptInput = () => {
    if (activeEditor || runningPython) return;

    appendPromptLine(promptParts, `${input}^C`);
    setInput("");
    setHistoryIndex(null);
    setHistoryDraft("");
    setTabSuggestions([]);
  };

  const closeEditor = useCallback(() => {
    setActiveEditor(null);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const loadExternalHomeFiles = async () => {
      try {
        const response = await fetch("/api/home-files", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          files?: Array<{ name?: unknown; url?: unknown }>;
        };
        if (!Array.isArray(payload.files)) return;

        const files: ExternalHomeFile[] = payload.files
          .filter(
            (file): file is { name: string; url: string } =>
              typeof file.name === "string" && typeof file.url === "string"
          )
          .map((file) => ({
            name: file.name,
            url: file.url
          }));

        registerExternalHomeFiles(files);
      } catch {
        // Ignore optional import failures and continue with core terminal behavior.
      }
    };

    void loadExternalHomeFiles();
  }, []);

  useEffect(() => {
    const handleCtrlC = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.key.toLowerCase() !== "c") {
        return;
      }

      if (activeEditor) {
        event.preventDefault();
        appendLines([{ text: "^C", tone: "muted" }]);
        closeEditor();
        return;
      }

      if (runningPython) {
        event.preventDefault();
        const runId = currentPythonRunIdRef.current;
        interruptedPythonRunIdRef.current = runId;
        interruptPythonRun(runId);
        appendLines([
          { text: "^C", tone: "muted" },
          { text: "[python interrupted]", tone: "muted" }
        ]);
        setRunningPython(false);
        window.requestAnimationFrame(() => {
          inputRef.current?.focus({ preventScroll: true });
        });
      }
    };

    window.addEventListener("keydown", handleCtrlC, true);
    return () => {
      window.removeEventListener("keydown", handleCtrlC, true);
    };
  }, [activeEditor, closeEditor, runningPython]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [lines, input]);

  const renderPrompt = (prompt: PromptParts) => (
    <>
      <span className="text-[#8ae234]">{prompt.userHost}</span>
      <span className="text-slate-200">:</span>
      <span className="text-[#729fcf]">{prompt.path}</span>
      <span className="text-slate-200">{prompt.symbol}</span>
    </>
  );

  return (
    <div
      className="terminal-font flex h-full w-full flex-col bg-[#0a0a0a] text-[14px] leading-6 text-slate-200 selection:bg-emerald-700/70 selection:text-white"
      onPointerDownCapture={focusShellInput}
      onMouseDownCapture={focusShellInput}
      onClick={focusShellInput}
    >
      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto p-4 md:p-5 select-text"
      >
        {lines.map((line) => {
          if (line.kind === "prompt") {
            return (
              <div key={line.id} className="whitespace-pre-wrap text-slate-100">
                {renderPrompt(line.prompt)}
                {line.command.length > 0 ? ` ${line.command}` : ""}
              </div>
            );
          }

          return (
            <div key={line.id} className={`whitespace-pre-wrap ${toneClass(line.tone)}`}>
              {line.text}
            </div>
          );
        })}

        {!runningPython && (
          <>
            <div className="flex items-center gap-2 whitespace-pre-wrap text-slate-100">
              <span>{renderPrompt(promptParts)}</span>
              <input
                ref={inputRef}
                data-terminal-input="true"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setTabSuggestions([]);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Tab") {
                    setTabSuggestions([]);
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    runInput();
                    return;
                  }

                  if (event.ctrlKey && event.key.toLowerCase() === "c") {
                    event.preventDefault();
                    interruptInput();
                    return;
                  }

                  if (event.ctrlKey && event.key.toLowerCase() === "l") {
                    event.preventDefault();
                    clearScreen();
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (history.length === 0) return;
                    if (historyIndex === null) {
                      setHistoryDraft(input);
                      const nextIndex = history.length - 1;
                      setHistoryIndex(nextIndex);
                      setInput(history[nextIndex]);
                      return;
                    }
                    if (historyIndex > 0) {
                      const nextIndex = historyIndex - 1;
                      setHistoryIndex(nextIndex);
                      setInput(history[nextIndex]);
                    }
                    return;
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    if (historyIndex === null) return;
                    if (historyIndex < history.length - 1) {
                      const nextIndex = historyIndex + 1;
                      setHistoryIndex(nextIndex);
                      setInput(history[nextIndex]);
                      return;
                    }
                    setHistoryIndex(null);
                    setInput(historyDraft);
                    return;
                  }

                  if (event.key === "Tab") {
                    event.preventDefault();
                    const completion = completeInput(input, cwd);
                    setInput(completion.nextInput);
                    if (completion.suggestions.length > 1) {
                      setTabSuggestions(completion.suggestions);
                    } else {
                      setTabSuggestions([]);
                    }
                  }
                }}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                disabled={activeEditor !== null}
                className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none caret-emerald-400"
              />
            </div>

            {tabSuggestions.length > 1 && (
              <div className="mt-1 whitespace-pre-wrap text-slate-500">
                {tabSuggestions.join("  ")}
              </div>
            )}
          </>
        )}
      </div>

      {activeEditor && (
        <VimEditor
          fileLabel={activeEditor.displayTarget}
          initialContent={activeEditor.initialContent}
          onSave={(nextContent) => {
            const writeResult = writeFile(activeEditor.path, nextContent);
            if (writeResult.ok) {
              appendLines([
                { text: `"${activeEditor.displayTarget}" written`, tone: "muted" }
              ]);
              return;
            }

            if (writeResult.reason === "not-found") {
              appendLines([
                {
                  text: `vim: ${activeEditor.displayTarget}: No such file or directory`,
                  tone: "error"
                }
              ]);
              return;
            }

            if (writeResult.reason === "is-directory") {
              appendLines([
                {
                  text: `vim: ${activeEditor.displayTarget}: Is a directory`,
                  tone: "error"
                }
              ]);
              return;
            }

            appendLines([
              {
                text: `vim: ${activeEditor.displayTarget}: Failed to write file`,
                tone: "error"
              }
            ]);
          }}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
