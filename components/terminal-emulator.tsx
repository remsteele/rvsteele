"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPrompt,
  completeInput,
  executeCommand,
  type OutputTone
} from "@/lib/terminal-engine";
import { HOME_PATH } from "@/lib/virtual-filesystem";

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

  const nextLineId = useRef(lines.length + 1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const runInput = () => {
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

    setInput("");
    setHistoryIndex(null);
    setHistoryDraft("");
  };

  const interruptInput = () => {
    appendLines([{ text: `${prompt}${input.length > 0 ? ` ${input}` : ""}^C` }]);
    setInput("");
    setHistoryIndex(null);
    setHistoryDraft("");
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [lines, input]);

  return (
    <div
      className="terminal-font flex h-full w-full flex-col bg-[#0a0a0a] text-[14px] leading-6 text-slate-200 selection:bg-emerald-700/70 selection:text-white"
      onMouseDown={() => inputRef.current?.focus()}
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

        <div className="flex items-center gap-2 whitespace-pre-wrap text-slate-100">
          <span>{prompt}</span>
          <input
            ref={inputRef}
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
            className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none caret-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}
