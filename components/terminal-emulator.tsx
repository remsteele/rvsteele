"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VimEditor } from "@/components/vim-editor";
import { loadPyodideRuntime, runPythonScript } from "@/lib/pyodide-runtime";
import {
  buildPrompt,
  completeInput,
  executeCommand,
  type EditorLaunchRequest,
  type PythonRunRequest,
  type OutputTone
} from "@/lib/terminal-engine";
import { HOME_PATH, absolutePath, getNodeAtPath, writeFile } from "@/lib/virtual-filesystem";

type RenderedLine = {
  id: number;
  text: string;
  tone: OutputTone;
};

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
    WELCOME_LINES.map((text, index) => ({ id: index + 1, text, tone: "muted" }))
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [historyDraft, setHistoryDraft] = useState("");
  const [activeEditor, setActiveEditor] = useState<EditorLaunchRequest | null>(null);
  const [runningPython, setRunningPython] = useState(false);

  const nextLineId = useRef(lines.length + 1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pyodideReadyRef = useRef(false);
  const currentPythonRunIdRef = useRef(0);
  const interruptedPythonRunsRef = useRef<Set<number>>(new Set());

  const prompt = useMemo(() => buildPrompt(cwd), [cwd]);

  const appendLines = (newLines: Array<{ text: string; tone?: OutputTone }>) => {
    if (newLines.length === 0) return;
    setLines((previous) => [
      ...previous,
      ...newLines.map((line) => ({
        id: nextLineId.current++,
        text: line.text,
        tone: line.tone ?? "normal"
      }))
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
    const runId = currentPythonRunIdRef.current + 1;
    currentPythonRunIdRef.current = runId;

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

    try {
      if (!pyodideReadyRef.current) {
        appendLines([{ text: "Loading Pyodide runtime...", tone: "muted" }]);
        await loadPyodideRuntime();
        pyodideReadyRef.current = true;
      }

      const result = await runPythonScript(node.content, absolutePath(request.path), request.argv);

      if (interruptedPythonRunsRef.current.has(runId)) {
        interruptedPythonRunsRef.current.delete(runId);
        return;
      }

      if (result.stdout.length > 0) {
        appendLines(result.stdout.map((text) => ({ text })));
      }

      if (result.stderr.length > 0) {
        appendLines(result.stderr.map((text) => ({ text, tone: "error" as const })));
      }

      if (result.exitCode !== 0) {
        appendLines([{ text: `[python exited with code ${result.exitCode}]`, tone: "muted" }]);
      }
    } catch (error) {
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

  const runInput = async () => {
    if (activeEditor || runningPython) return;

    const command = input;
    appendLines([{ text: `${prompt}${command.length > 0 ? ` ${command}` : ""}` }]);

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

    setInput("");
    setHistoryIndex(null);
    setHistoryDraft("");

    if (result.pythonRun) {
      setRunningPython(true);
      await executePythonCommand(result.pythonRun);
    }
  };

  const interruptInput = () => {
    if (activeEditor || runningPython) return;

    appendLines([{ text: `${prompt}${input.length > 0 ? ` ${input}` : ""}^C` }]);
    setInput("");
    setHistoryIndex(null);
    setHistoryDraft("");
  };

  const closeEditor = useCallback(() => {
    setActiveEditor(null);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
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
        if (!interruptedPythonRunsRef.current.has(runId)) {
          interruptedPythonRunsRef.current.add(runId);
          appendLines([
            { text: "^C", tone: "muted" },
            { text: "[python interrupted]", tone: "muted" }
          ]);
        }
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
        {lines.map((line) => (
          <div key={line.id} className={`whitespace-pre-wrap ${toneClass(line.tone)}`}>
            {line.text}
          </div>
        ))}

        {!runningPython && (
          <div className="flex items-center gap-2 whitespace-pre-wrap text-slate-100">
            <span>{prompt}</span>
            <input
              ref={inputRef}
              data-terminal-input="true"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
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
                    appendLines([
                      {
                        text: completion.suggestions.join("  "),
                        tone: "muted"
                      }
                    ]);
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
