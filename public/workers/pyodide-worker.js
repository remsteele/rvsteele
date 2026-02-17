const PYODIDE_VERSION = "0.27.5";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideRuntimePromise = null;

async function ensurePyodide(runId) {
  if (!pyodideRuntimePromise) {
    self.postMessage({
      type: "status",
      runId,
      status: "loading"
    });

    self.importScripts(`${PYODIDE_INDEX_URL}pyodide.js`);
    pyodideRuntimePromise = self.loadPyodide({
      indexURL: PYODIDE_INDEX_URL
    });
  }

  return pyodideRuntimePromise;
}

self.onmessage = async (event) => {
  const data = event.data;
  if (!data || data.type !== "run") {
    return;
  }

  const { runId, source, filename, argv } = data;

  try {
    const pyodide = await ensurePyodide(runId);
    self.postMessage({
      type: "status",
      runId,
      status: "ready"
    });

    pyodide.setStdout({
      batched: (text) => {
        self.postMessage({
          type: "stdout",
          runId,
          text
        });
      }
    });
    pyodide.setStderr({
      batched: (text) => {
        self.postMessage({
          type: "stderr",
          runId,
          text
        });
      }
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
    sys.stdout.reconfigure(line_buffering=True, write_through=True)
except Exception:
    pass
try:
    sys.stderr.reconfigure(line_buffering=True, write_through=True)
except Exception:
    pass

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

    self.postMessage({
      type: "done",
      runId,
      exitCode
    });
  } catch (error) {
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Unknown Python worker error";

    self.postMessage({
      type: "error",
      runId,
      message
    });
  }
};
