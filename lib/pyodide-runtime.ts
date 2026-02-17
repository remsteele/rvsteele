type PythonWorkerMessage =
  | { type: "status"; runId: number; status: "loading" | "ready" }
  | { type: "stdout"; runId: number; text: string }
  | { type: "stderr"; runId: number; text: string }
  | { type: "done"; runId: number; exitCode: number }
  | { type: "error"; runId: number; message: string };

type PythonWorkerRunRequest = {
  type: "run";
  runId: number;
  source: string;
  filename: string;
  argv: string[];
};

export type PythonRunResult = {
  stdout: string[];
  stderr: string[];
  exitCode: number;
};

type PythonStreamHandlers = {
  onStatus?: (status: "loading" | "ready") => void;
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
};

type ActiveRun = {
  runId: number;
  stdout: string[];
  stderr: string[];
  handlers?: PythonStreamHandlers;
  resolve: (result: PythonRunResult) => void;
  reject: (error: Error) => void;
};

export type PythonStreamingRun = {
  runId: number;
  promise: Promise<PythonRunResult>;
};

let worker: Worker | null = null;
let nextRunId = 1;
const activeRuns = new Map<number, ActiveRun>();

function normalizeChunk(chunk: string): string {
  return chunk.replace(/\r\n/g, "\n");
}

function emitStreamChunk(run: ActiveRun, stream: "stdout" | "stderr", chunk: string) {
  const list = stream === "stdout" ? run.stdout : run.stderr;
  const handler = stream === "stdout" ? run.handlers?.onStdout : run.handlers?.onStderr;
  const normalized = normalizeChunk(chunk);
  if (normalized.length === 0) return;

  const parts = normalized.split("\n");
  parts.forEach((part) => {
    if (part.length === 0) return;
    list.push(part);
    handler?.(part);
  });
}

function rejectAllRuns(message: string) {
  activeRuns.forEach((run) => {
    run.reject(new Error(message));
  });
  activeRuns.clear();
}

function resetWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function ensureWorker(): Worker {
  if (worker) return worker;

  const nextWorker = new Worker("/workers/pyodide-worker.js");
  nextWorker.onmessage = (event: MessageEvent<PythonWorkerMessage>) => {
    const message = event.data;
    const run = activeRuns.get(message.runId);
    if (!run) return;

    if (message.type === "status") {
      run.handlers?.onStatus?.(message.status);
      return;
    }

    if (message.type === "stdout") {
      emitStreamChunk(run, "stdout", message.text);
      return;
    }

    if (message.type === "stderr") {
      emitStreamChunk(run, "stderr", message.text);
      return;
    }

    if (message.type === "done") {
      run.resolve({
        stdout: run.stdout,
        stderr: run.stderr,
        exitCode: message.exitCode
      });
      activeRuns.delete(message.runId);
      return;
    }

    if (message.type === "error") {
      run.reject(new Error(message.message));
      activeRuns.delete(message.runId);
    }
  };

  nextWorker.onerror = () => {
    rejectAllRuns("Python worker crashed");
    resetWorker();
  };

  worker = nextWorker;
  return nextWorker;
}

export function runPythonScriptStreaming(
  source: string,
  filename: string,
  argv: string[],
  handlers?: PythonStreamHandlers
): PythonStreamingRun {
  const currentWorker = ensureWorker();
  const runId = nextRunId++;

  const promise = new Promise<PythonRunResult>((resolve, reject) => {
    activeRuns.set(runId, {
      runId,
      stdout: [],
      stderr: [],
      handlers,
      resolve,
      reject
    });
  });

  const payload: PythonWorkerRunRequest = {
    type: "run",
    runId,
    source,
    filename,
    argv
  };
  currentWorker.postMessage(payload);

  return { runId, promise };
}

export function interruptPythonRun(runId?: number): boolean {
  if (!worker) return false;

  const hasMatchingRun =
    typeof runId === "number" ? activeRuns.has(runId) : activeRuns.size > 0;
  if (!hasMatchingRun) return false;

  if (typeof runId === "number") {
    const run = activeRuns.get(runId);
    if (run) {
      run.reject(new Error("Python execution interrupted"));
      activeRuns.delete(runId);
    }
  } else {
    rejectAllRuns("Python execution interrupted");
  }

  resetWorker();
  return true;
}
