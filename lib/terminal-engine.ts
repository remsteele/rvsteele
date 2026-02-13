import { TERMINAL_CONFIG } from "@/lib/terminal-config";
import {
  absolutePath,
  getDirectoryEntries,
  getNodeAtPath,
  promptPath,
  renderTree,
  resolvePathSegments
} from "@/lib/virtual-filesystem";

export type OutputTone = "normal" | "error" | "muted";

export type TerminalOutputLine = {
  text: string;
  tone?: OutputTone;
};

export type ExecutionResult = {
  nextCwd: string[];
  clear: boolean;
  lines: TerminalOutputLine[];
};

export type CompletionResult = {
  nextInput: string;
  suggestions: string[];
};

const COMMANDS = [
  "help",
  "ls",
  "cd",
  "pwd",
  "cat",
  "less",
  "tree",
  "whoami",
  "hostname",
  "uname",
  "echo",
  "date",
  "history",
  "clear"
] as const;

const PATH_COMMANDS = new Set(["cd", "ls", "cat", "less", "tree"]);

const COMMON_HELP = [
  "Ubuntu-like portfolio shell (simulated)",
  "",
  "Commands:",
  "  help      show this help",
  "  ls        list directory contents",
  "  cd        change directory",
  "  pwd       print working directory",
  "  cat       print file contents",
  "  less      simplified pager (prints file)",
  "  tree      print directory tree",
  "  history   show command history",
  "  clear     clear terminal",
  "  whoami    show active user",
  "  hostname  show configured host",
  "  uname     print system string",
  "  date      print current date",
  "  echo      print text"
];

function formatLs(path: string[], explicitLabel: string | null): TerminalOutputLine[] {
  const node = getNodeAtPath(path);
  if (!node) {
    return [
      {
        text: `ls: cannot access '${explicitLabel ?? absolutePath(path)}': No such file or directory`,
        tone: "error"
      }
    ];
  }

  if (node.type === "file") {
    return [{ text: explicitLabel ?? absolutePath(path) }];
  }

  const entries = getDirectoryEntries(node).map(
    (entry) => `${entry.name}${entry.node.type === "directory" ? "/" : ""}`
  );

  return [{ text: entries.join("  ") }];
}

function readFiles(commandName: "cat" | "less", cwd: string[], args: string[]): TerminalOutputLine[] {
  if (args.length === 0) {
    return [{ text: `${commandName}: missing file operand`, tone: "error" }];
  }

  const lines: TerminalOutputLine[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const target = args[index];
    const path = resolvePathSegments(cwd, target);
    const node = getNodeAtPath(path);

    if (!node) {
      lines.push({
        text: `${commandName}: ${target}: No such file or directory`,
        tone: "error"
      });
      continue;
    }

    if (node.type === "directory") {
      lines.push({
        text: `${commandName}: ${target}: Is a directory`,
        tone: "error"
      });
      continue;
    }

    if (args.length > 1) {
      lines.push({ text: `==> ${target} <==`, tone: "muted" });
    }

    for (const contentLine of node.content.split("\n")) {
      lines.push({ text: contentLine });
    }

    if (args.length > 1 && index !== args.length - 1) {
      lines.push({ text: "" });
    }
  }

  return lines;
}

export function buildPrompt(cwd: string[]): string {
  return `${TERMINAL_CONFIG.username}@${TERMINAL_CONFIG.hostname}:${promptPath(cwd)}$`;
}

export function executeCommand(input: string, cwd: string[], history: string[]): ExecutionResult {
  const trimmed = input.trim();
  if (!trimmed) return { nextCwd: cwd, clear: false, lines: [] };

  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  switch (command) {
    case "help":
      return {
        nextCwd: cwd,
        clear: false,
        lines: COMMON_HELP.map((text) => ({ text }))
      };
    case "ls": {
      if (args.length === 0) {
        return { nextCwd: cwd, clear: false, lines: formatLs(cwd, null) };
      }

      const output: TerminalOutputLine[] = [];
      args.forEach((arg, index) => {
        const path = resolvePathSegments(cwd, arg);
        if (args.length > 1) {
          output.push({ text: `${arg}:`, tone: "muted" });
        }
        output.push(...formatLs(path, arg));
        if (args.length > 1 && index !== args.length - 1) {
          output.push({ text: "" });
        }
      });

      return { nextCwd: cwd, clear: false, lines: output };
    }
    case "cd": {
      const target = args[0] ?? "~";
      const path = resolvePathSegments(cwd, target);
      const node = getNodeAtPath(path);
      if (!node) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `cd: ${target}: No such file or directory`, tone: "error" }]
        };
      }
      if (node.type !== "directory") {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `cd: ${target}: Not a directory`, tone: "error" }]
        };
      }
      return { nextCwd: path, clear: false, lines: [] };
    }
    case "pwd":
      return { nextCwd: cwd, clear: false, lines: [{ text: absolutePath(cwd) }] };
    case "cat":
    case "less":
      return { nextCwd: cwd, clear: false, lines: readFiles(command, cwd, args) };
    case "tree": {
      const target = args[0] ?? ".";
      const path = resolvePathSegments(cwd, target);
      const lines = renderTree(path);
      if (lines.length === 1 && lines[0] === "tree: path not found") {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `tree: ${target}: No such file or directory`, tone: "error" }]
        };
      }
      return { nextCwd: cwd, clear: false, lines: lines.map((text) => ({ text })) };
    }
    case "whoami":
      return { nextCwd: cwd, clear: false, lines: [{ text: TERMINAL_CONFIG.username }] };
    case "hostname":
      return { nextCwd: cwd, clear: false, lines: [{ text: TERMINAL_CONFIG.hostname }] };
    case "uname":
      return {
        nextCwd: cwd,
        clear: false,
        lines: [{ text: "Linux portfolio 6.8.0-portfolio #1 SMP x86_64 GNU/Linux" }]
      };
    case "echo":
      return { nextCwd: cwd, clear: false, lines: [{ text: args.join(" ") }] };
    case "date":
      return { nextCwd: cwd, clear: false, lines: [{ text: new Date().toString() }] };
    case "history":
      return {
        nextCwd: cwd,
        clear: false,
        lines: history.map((entry, index) => ({
          text: `${index + 1}  ${entry}`
        }))
      };
    case "clear":
      return { nextCwd: cwd, clear: true, lines: [] };
    default:
      return {
        nextCwd: cwd,
        clear: false,
        lines: [{ text: `${command}: command not found`, tone: "error" }]
      };
  }
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (let i = 1; i < values.length; i += 1) {
    while (!values[i].startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix.length === 0) return "";
  }
  return prefix;
}

function replaceLastToken(input: string, replacement: string): string {
  const endsWithSpace = /\s$/.test(input);
  const tokens = input.trim().length > 0 ? input.trim().split(/\s+/) : [];

  if (tokens.length === 0 || endsWithSpace) {
    return `${input}${replacement}`;
  }

  tokens[tokens.length - 1] = replacement;
  return tokens.join(" ");
}

type PathMatch = {
  completion: string;
  display: string;
  isDirectory: boolean;
};

function completePath(token: string, cwd: string[]): PathMatch[] {
  if (token === "~") {
    return [{ completion: "~/", display: "~/", isDirectory: true }];
  }

  let dirToken = "";
  let partial = token;

  if (token.startsWith("~") && !token.startsWith("~/")) {
    dirToken = "~/";
    partial = token.slice(1);
  } else {
    const slashIndex = token.lastIndexOf("/");
    if (slashIndex >= 0) {
      dirToken = token.slice(0, slashIndex + 1);
      partial = token.slice(slashIndex + 1);
    }
  }

  const basePath = resolvePathSegments(cwd, dirToken || ".");
  const baseNode = getNodeAtPath(basePath);
  if (!baseNode || baseNode.type !== "directory") return [];

  return getDirectoryEntries(baseNode)
    .filter((entry) => entry.name.startsWith(partial))
    .map((entry) => {
      const suffix = entry.node.type === "directory" ? "/" : "";
      const completion = `${dirToken}${entry.name}${suffix}`;
      return {
        completion,
        display: `${entry.name}${suffix}`,
        isDirectory: entry.node.type === "directory"
      };
    });
}

export function completeInput(input: string, cwd: string[]): CompletionResult {
  const endsWithSpace = /\s$/.test(input);
  const tokens = input.trim().length > 0 ? input.trim().split(/\s+/) : [];

  if (tokens.length === 0) {
    return {
      nextInput: input,
      suggestions: [...COMMANDS]
    };
  }

  if (tokens.length === 1 && !endsWithSpace) {
    const current = tokens[0];
    const matches = COMMANDS.filter((command) => command.startsWith(current));
    if (matches.length === 0) return { nextInput: input, suggestions: [] };
    if (matches.length === 1) {
      return {
        nextInput: `${matches[0]} `,
        suggestions: []
      };
    }
    const prefix = commonPrefix(matches);
    return {
      nextInput: prefix.length > current.length ? prefix : input,
      suggestions: matches
    };
  }

  const command = tokens[0];
  if (!PATH_COMMANDS.has(command)) {
    return { nextInput: input, suggestions: [] };
  }

  const targetToken = endsWithSpace ? "" : tokens[tokens.length - 1];
  const matches = completePath(targetToken, cwd);
  if (matches.length === 0) return { nextInput: input, suggestions: [] };

  if (matches.length === 1) {
    const match = matches[0];
    const replacement = match.isDirectory ? match.completion : `${match.completion} `;
    return {
      nextInput: replaceLastToken(input, replacement),
      suggestions: []
    };
  }

  const prefix = commonPrefix(matches.map((match) => match.completion));
  const nextInput =
    prefix.length > targetToken.length ? replaceLastToken(input, prefix) : input;

  return {
    nextInput,
    suggestions: matches.map((match) => match.display)
  };
}
