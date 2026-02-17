import { TERMINAL_CONFIG } from "@/lib/terminal-config";
import {
  absolutePath,
  createDirectory,
  createFile,
  getDirectoryEntries,
  getNodeAtPath,
  promptPath,
  removeDirectory,
  removeNode,
  renderTree,
  resolvePathSegments,
  type VirtualNode
} from "@/lib/virtual-filesystem";

export type OutputTone = "normal" | "error" | "muted";

export type TerminalOutputLine = {
  text: string;
  tone?: OutputTone;
};

export type EditorLaunchRequest = {
  path: string[];
  displayTarget: string;
  initialContent: string;
  isNewFile: boolean;
};

export type PythonRunRequest = {
  path: string[];
  displayTarget: string;
  argv: string[];
};

export type OpenFileRequest = {
  path: string[];
  displayTarget: string;
};

export type ExecutionResult = {
  nextCwd: string[];
  clear: boolean;
  lines: TerminalOutputLine[];
  editor?: EditorLaunchRequest;
  pythonRun?: PythonRunRequest;
  openFile?: OpenFileRequest;
};

export type CompletionResult = {
  nextInput: string;
  suggestions: string[];
};

export type PromptParts = {
  userHost: string;
  path: string;
  symbol: "$";
};

const COMMANDS = [
  "help",
  "ls",
  "cd",
  "pwd",
  "cat",
  "less",
  "open",
  "tree",
  "vim",
  "vi",
  "python3",
  "python",
  "touch",
  "mkdir",
  "rm",
  "rmdir",
  "whoami",
  "hostname",
  "uname",
  "echo",
  "date",
  "history",
  "clear"
] as const;

const PATH_COMMANDS = new Set([
  "cd",
  "ls",
  "cat",
  "less",
  "open",
  "tree",
  "vim",
  "vi",
  "python3",
  "python",
  "touch",
  "mkdir",
  "rm",
  "rmdir"
]);

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
  "  open      download file (external home files open in a tab)",
  "  tree      print directory tree",
  "  vim       edit a file in vi mode",
  "  python3   run a .py file with Pyodide",
  "  touch     create an empty file",
  "  mkdir     create a directory (-p supported)",
  "  rm        remove files (-r, -f supported)",
  "  rmdir     remove empty directories",
  "  history   show command history",
  "  clear     clear terminal",
  "  whoami    show active user",
  "  hostname  show configured host",
  "  uname     print system string",
  "  date      print current date",
  "  echo      print text"
];

type ParsedFlags = {
  flags: Set<string>;
  operands: string[];
  invalidFlag: string | null;
};

function parseShortFlags(args: string[], allowedFlags: Set<string>): ParsedFlags {
  const flags = new Set<string>();
  const operands: string[] = [];
  let parsingFlags = true;

  for (const arg of args) {
    if (parsingFlags && arg === "--") {
      parsingFlags = false;
      continue;
    }

    if (parsingFlags && arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (!allowedFlags.has(flag)) {
          return { flags, operands, invalidFlag: flag };
        }
        flags.add(flag);
      }
      continue;
    }

    operands.push(arg);
  }

  return { flags, operands, invalidFlag: null };
}

function formatLongEntry(name: string, node: VirtualNode): string {
  const permissions = node.type === "directory" ? "drwxr-xr-x" : "-rw-r--r--";
  const size = node.type === "directory" ? Object.keys(node.children).length : node.content.length;
  const owner = TERMINAL_CONFIG.username;
  const label = node.type === "directory" ? `${name}/` : name;
  return `${permissions}  1 ${owner} ${owner} ${String(size).padStart(6, " ")} ${label}`;
}

function formatLs(
  path: string[],
  explicitLabel: string | null,
  options: { showAll: boolean; longFormat: boolean }
): TerminalOutputLine[] {
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
    if (options.longFormat) {
      const label = explicitLabel ?? path[path.length - 1] ?? absolutePath(path);
      return [{ text: formatLongEntry(label, node) }];
    }
    return [{ text: explicitLabel ?? absolutePath(path) }];
  }

  const entries = getDirectoryEntries(node).filter(
    (entry) => options.showAll || !entry.name.startsWith(".")
  );

  if (options.longFormat) {
    const lines: TerminalOutputLine[] = [];
    if (options.showAll) {
      const parentPath = path.length > 0 ? path.slice(0, -1) : [];
      const parentNode = getNodeAtPath(parentPath);
      lines.push({ text: formatLongEntry(".", node) });
      if (parentNode && parentNode.type === "directory") {
        lines.push({ text: formatLongEntry("..", parentNode) });
      }
    }

    lines.push(...entries.map((entry) => ({ text: formatLongEntry(entry.name, entry.node) })));
    return lines.length > 0 ? lines : [{ text: "" }];
  }

  const entryNames: string[] = [];
  if (options.showAll) {
    entryNames.push(".", "..");
  }

  entryNames.push(
    ...entries.map((entry) => `${entry.name}${entry.node.type === "directory" ? "/" : ""}`)
  );

  return [{ text: entryNames.join("  ") }];
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
  const parts = buildPromptParts(cwd);
  return `${parts.userHost}:${parts.path}${parts.symbol}`;
}

export function buildPromptParts(cwd: string[]): PromptParts {
  return {
    userHost: `${TERMINAL_CONFIG.username}@${TERMINAL_CONFIG.hostname}`,
    path: promptPath(cwd),
    symbol: "$"
  };
}

export function executeCommand(input: string, cwd: string[], history: string[]): ExecutionResult {
  const trimmed = input.trim();
  if (!trimmed) return { nextCwd: cwd, clear: false, lines: [] };

  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  const resolvePythonTarget = (
    executable: string,
    target: string,
    argv: string[]
  ): ExecutionResult => {
    if (!target.endsWith(".py")) {
      return {
        nextCwd: cwd,
        clear: false,
        lines: [{ text: `${executable}: ${target}: not a Python file`, tone: "error" }]
      };
    }

    const path = resolvePathSegments(cwd, target);
    const node = getNodeAtPath(path);

    if (!node) {
      return {
        nextCwd: cwd,
        clear: false,
        lines: [{ text: `${executable}: can't open file '${target}': No such file or directory`, tone: "error" }]
      };
    }

    if (node.type !== "file") {
      return {
        nextCwd: cwd,
        clear: false,
        lines: [{ text: `${executable}: can't open file '${target}': Is a directory`, tone: "error" }]
      };
    }

    return {
      nextCwd: cwd,
      clear: false,
      lines: [],
      pythonRun: {
        path,
        displayTarget: target,
        argv
      }
    };
  };

  if (command.endsWith(".py")) {
    return resolvePythonTarget("python3", command, args);
  }

  switch (command) {
    case "help":
      return {
        nextCwd: cwd,
        clear: false,
        lines: COMMON_HELP.map((text) => ({ text }))
      };
    case "ls": {
      const parsed = parseShortFlags(args, new Set(["a", "l"]));
      if (parsed.invalidFlag) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `ls: invalid option -- '${parsed.invalidFlag}'`, tone: "error" }]
        };
      }

      const targets = parsed.operands.length > 0 ? parsed.operands : ["."];
      const lsOptions = {
        showAll: parsed.flags.has("a"),
        longFormat: parsed.flags.has("l")
      };

      const output: TerminalOutputLine[] = [];
      targets.forEach((arg, index) => {
        const path = resolvePathSegments(cwd, arg);
        if (targets.length > 1) {
          output.push({ text: `${arg}:`, tone: "muted" });
        }
        output.push(...formatLs(path, arg, lsOptions));
        if (targets.length > 1 && index !== targets.length - 1) {
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
    case "vim":
    case "vi": {
      if (args.length === 0) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `${command}: missing file operand`, tone: "error" }]
        };
      }

      if (args.length > 1) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `${command}: only single-file editing is supported`, tone: "error" }]
        };
      }

      const target = args[0];
      if (target.startsWith("-")) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `${command}: unsupported option '${target}'`, tone: "error" }]
        };
      }

      const path = resolvePathSegments(cwd, target);
      const existing = getNodeAtPath(path);
      const existingFile = existing && existing.type === "file" ? existing : null;

      if (existing?.type === "directory") {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `${command}: ${target}: Is a directory`, tone: "error" }]
        };
      }

      if (!existingFile) {
        const parentPath = path.slice(0, -1);
        const parent = getNodeAtPath(parentPath);
        if (!parent) {
          return {
            nextCwd: cwd,
            clear: false,
            lines: [{ text: `${command}: ${target}: No such file or directory`, tone: "error" }]
          };
        }

        if (parent.type !== "directory") {
          return {
            nextCwd: cwd,
            clear: false,
            lines: [{ text: `${command}: ${target}: Not a directory`, tone: "error" }]
          };
        }

        const baseName = path[path.length - 1];
        if (!baseName || baseName === "." || baseName === "..") {
          return {
            nextCwd: cwd,
            clear: false,
            lines: [{ text: `${command}: ${target}: Invalid file name`, tone: "error" }]
          };
        }
      }

      return {
        nextCwd: cwd,
        clear: false,
        lines: !existingFile ? [{ text: `"${target}" [New file]`, tone: "muted" }] : [],
        editor: {
          path,
          displayTarget: target,
          initialContent: existingFile?.content ?? "",
          isNewFile: !existingFile
        }
      };
    }
    case "python3":
    case "python": {
      if (args.length === 0) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `${command}: missing file operand`, tone: "error" }]
        };
      }

      return resolvePythonTarget(command, args[0], args.slice(1));
    }
    case "touch": {
      const parsed = parseShortFlags(args, new Set(["a", "m", "c"]));
      if (parsed.invalidFlag) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `touch: invalid option -- '${parsed.invalidFlag}'`, tone: "error" }]
        };
      }

      if (parsed.operands.length === 0) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: "touch: missing file operand", tone: "error" }]
        };
      }

      const output: TerminalOutputLine[] = [];
      parsed.operands.forEach((target) => {
        const path = resolvePathSegments(cwd, target);
        const existing = getNodeAtPath(path);

        if (!existing && parsed.flags.has("c")) {
          return;
        }

        const result = createFile(path);
        if (result.ok) return;

        if (result.reason === "is-directory") {
          output.push({
            text: `touch: cannot touch '${target}': Is a directory`,
            tone: "error"
          });
          return;
        }

        if (result.reason === "not-found") {
          output.push({
            text: `touch: cannot touch '${target}': No such file or directory`,
            tone: "error"
          });
          return;
        }

        output.push({
          text: `touch: cannot touch '${target}': Invalid file name`,
          tone: "error"
        });
      });

      return { nextCwd: cwd, clear: false, lines: output };
    }
    case "mkdir": {
      const parsed = parseShortFlags(args, new Set(["p"]));
      if (parsed.invalidFlag) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `mkdir: invalid option -- '${parsed.invalidFlag}'`, tone: "error" }]
        };
      }

      if (parsed.operands.length === 0) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: "mkdir: missing operand", tone: "error" }]
        };
      }

      const output: TerminalOutputLine[] = [];
      parsed.operands.forEach((target) => {
        const path = resolvePathSegments(cwd, target);
        const result = createDirectory(path, parsed.flags.has("p"));
        if (result.ok) return;

        if (result.reason === "already-exists") {
          output.push({
            text: `mkdir: cannot create directory '${target}': File exists`,
            tone: "error"
          });
          return;
        }

        if (result.reason === "not-found") {
          output.push({
            text: `mkdir: cannot create directory '${target}': No such file or directory`,
            tone: "error"
          });
          return;
        }

        if (result.reason === "parent-not-directory" || result.reason === "not-directory") {
          output.push({
            text: `mkdir: cannot create directory '${target}': Not a directory`,
            tone: "error"
          });
          return;
        }

        output.push({
          text: `mkdir: cannot create directory '${target}': Invalid directory name`,
          tone: "error"
        });
      });

      return { nextCwd: cwd, clear: false, lines: output };
    }
    case "rm": {
      const parsed = parseShortFlags(args, new Set(["r", "f"]));
      if (parsed.invalidFlag) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `rm: invalid option -- '${parsed.invalidFlag}'`, tone: "error" }]
        };
      }

      if (parsed.operands.length === 0) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: "rm: missing operand", tone: "error" }]
        };
      }

      const output: TerminalOutputLine[] = [];
      parsed.operands.forEach((target) => {
        const path = resolvePathSegments(cwd, target);
        const result = removeNode(path, parsed.flags.has("r"));
        if (result.ok) return;

        if (result.reason === "not-found" && parsed.flags.has("f")) {
          return;
        }

        if (result.reason === "not-found") {
          output.push({
            text: `rm: cannot remove '${target}': No such file or directory`,
            tone: "error"
          });
          return;
        }

        if (result.reason === "is-directory") {
          output.push({
            text: `rm: cannot remove '${target}': Is a directory`,
            tone: "error"
          });
          return;
        }

        output.push({
          text: `rm: cannot remove '${target}': Operation not permitted`,
          tone: "error"
        });
      });

      return { nextCwd: cwd, clear: false, lines: output };
    }
    case "rmdir": {
      const parsed = parseShortFlags(args, new Set<string>());
      if (parsed.invalidFlag) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `rmdir: invalid option -- '${parsed.invalidFlag}'`, tone: "error" }]
        };
      }

      if (parsed.operands.length === 0) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: "rmdir: missing operand", tone: "error" }]
        };
      }

      const output: TerminalOutputLine[] = [];
      parsed.operands.forEach((target) => {
        const path = resolvePathSegments(cwd, target);
        const result = removeDirectory(path);
        if (result.ok) return;

        if (result.reason === "not-found") {
          output.push({
            text: `rmdir: failed to remove '${target}': No such file or directory`,
            tone: "error"
          });
          return;
        }

        if (result.reason === "not-directory") {
          output.push({
            text: `rmdir: failed to remove '${target}': Not a directory`,
            tone: "error"
          });
          return;
        }

        if (result.reason === "directory-not-empty") {
          output.push({
            text: `rmdir: failed to remove '${target}': Directory not empty`,
            tone: "error"
          });
          return;
        }

        output.push({
          text: `rmdir: failed to remove '${target}': Operation not permitted`,
          tone: "error"
        });
      });

      return { nextCwd: cwd, clear: false, lines: output };
    }
    case "pwd":
      return { nextCwd: cwd, clear: false, lines: [{ text: absolutePath(cwd) }] };
    case "cat":
    case "less":
      return { nextCwd: cwd, clear: false, lines: readFiles(command, cwd, args) };
    case "open": {
      if (args.length === 0) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: "open: missing file operand", tone: "error" }]
        };
      }

      if (args.length > 1) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: "open: only single-file open is supported", tone: "error" }]
        };
      }

      const target = args[0];
      const path = resolvePathSegments(cwd, target);
      const node = getNodeAtPath(path);
      if (!node) {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `open: ${target}: No such file or directory`, tone: "error" }]
        };
      }

      if (node.type !== "file") {
        return {
          nextCwd: cwd,
          clear: false,
          lines: [{ text: `open: ${target}: Is a directory`, tone: "error" }]
        };
      }

      return {
        nextCwd: cwd,
        clear: false,
        lines: [],
        openFile: {
          path,
          displayTarget: target
        }
      };
    }
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
