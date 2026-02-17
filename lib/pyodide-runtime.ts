type PyodideStdIo = {
  batched?: (message: string) => void;
};

type PyodideGlobals = {
  set: (name: string, value: unknown) => void;
  delete: (name: string) => void;
};

type PyodideRuntime = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: PyodideStdIo) => void;
  setStderr: (options: PyodideStdIo) => void;
  globals: PyodideGlobals;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
    __pyodideRuntimePromise?: Promise<PyodideRuntime>;
  }
}

const PYODIDE_VERSION = "0.27.5";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT_URL = `${PYODIDE_INDEX_URL}pyodide.js`;

function splitOutput(chunks: string[]): string[] {
  const lines: string[] = [];

  chunks.forEach((chunk) => {
    const normalized = chunk.replace(/\r\n/g, "\n");
    normalized.split("\n").forEach((line) => {
      if (line.length > 0) {
        lines.push(line);
      }
    });
  });

  return lines;
}

async function ensurePyodideScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.loadPyodide) return;

  await new Promise<void>((resolve, reject) => {
    const scriptId = "pyodide-runtime-script";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const onLoad = () => {
      if (window.loadPyodide) {
        resolve();
        return;
      }
      reject(new Error("Pyodide script loaded but loadPyodide is unavailable"));
    };

    const onError = () => {
      reject(new Error("Failed to load Pyodide script"));
    };

    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `${PYODIDE_SCRIPT_URL}?v=1`;
    script.async = true;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });
}

export async function loadPyodideRuntime(): Promise<PyodideRuntime> {
  if (typeof window === "undefined") {
    throw new Error("Pyodide runtime is only available in the browser");
  }

  if (!window.__pyodideRuntimePromise) {
    window.__pyodideRuntimePromise = (async () => {
      await ensurePyodideScript();
      if (!window.loadPyodide) {
        throw new Error("Pyodide runtime loader is unavailable");
      }
      return window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    })();
  }

  return window.__pyodideRuntimePromise;
}

export type PythonRunResult = {
  stdout: string[];
  stderr: string[];
  exitCode: number;
};

export async function runPythonScript(
  source: string,
  filename: string,
  argv: string[]
): Promise<PythonRunResult> {
  const pyodide = await loadPyodideRuntime();
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  pyodide.setStdout({
    batched: (message: string) => stdoutChunks.push(message)
  });
  pyodide.setStderr({
    batched: (message: string) => stderrChunks.push(message)
  });

  pyodide.globals.set("__rv_py_code", source);
  pyodide.globals.set("__rv_py_filename", filename);
  pyodide.globals.set("__rv_py_argv", argv);

  let exitCode = 1;
  try {
    const value = await pyodide.runPythonAsync(`
import sys
import traceback

_rv_exit_code = 0
_rv_globals = {"__name__": "__main__", "__file__": __rv_py_filename}
_rv_old_argv = sys.argv
sys.argv = [__rv_py_filename] + list(__rv_py_argv)

try:
    exec(compile(__rv_py_code, __rv_py_filename, "exec"), _rv_globals)
except SystemExit as _rv_exc:
    _rv_code = _rv_exc.code
    if _rv_code is None:
        _rv_exit_code = 0
    elif isinstance(_rv_code, int):
        _rv_exit_code = _rv_code
    else:
        print(_rv_code, file=sys.stderr)
        _rv_exit_code = 1
except Exception:
    traceback.print_exc()
    _rv_exit_code = 1
finally:
    sys.argv = _rv_old_argv

_rv_exit_code
`);

    const parsed = Number(value);
    exitCode = Number.isFinite(parsed) ? parsed : 1;
  } finally {
    pyodide.globals.delete("__rv_py_code");
    pyodide.globals.delete("__rv_py_filename");
    pyodide.globals.delete("__rv_py_argv");
  }

  return {
    stdout: splitOutput(stdoutChunks),
    stderr: splitOutput(stderrChunks),
    exitCode
  };
}
