"use client";

import { useEffect, useRef, useState } from "react";

type JsViOptions = {
  onSave?: () => void;
  onExit?: () => void;
  color?: string;
  backgroundColor?: string;
};

type JsViInstance = {
  disable?: (save: boolean) => void;
};

type JsViFactory = (textarea: HTMLTextAreaElement, options?: JsViOptions) => JsViInstance;

declare global {
  interface Window {
    vi?: JsViFactory;
    __jsviLoader?: Promise<void>;
  }
}

function loadJsVi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.vi) {
    return Promise.resolve();
  }

  if (window.__jsviLoader) {
    return window.__jsviLoader;
  }

  window.__jsviLoader = new Promise<void>((resolve, reject) => {
    const assetVersion = "v2";
    const cssId = "jsvi-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = `/vendor/jsvi/vi.css?${assetVersion}`;
      document.head.appendChild(link);
    }

    const fail = () => {
      window.__jsviLoader = undefined;
      reject(new Error("Failed to load jsvi runtime"));
    };

    const finish = () => {
      if (window.vi) {
        resolve();
      } else {
        fail();
      }
    };

    const scriptId = "jsvi-script";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.vi) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `/vendor/jsvi/vi.js?${assetVersion}`;
    script.async = true;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  return window.__jsviLoader;
}

type VimEditorProps = {
  fileLabel: string;
  initialContent: string;
  onSave: (nextContent: string) => void;
  onClose: () => void;
};

export function VimEditor({ fileLabel, initialContent, onSave, onClose }: VimEditorProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<JsViInstance | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadJsVi();
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }

      if (cancelled) return;
      const textarea = textareaRef.current;
      const vimFactory = window.vi;

      if (!textarea || !vimFactory) {
        setStatus("error");
        return;
      }

      textarea.value = initialContent;

      editorRef.current = vimFactory(textarea, {
        color: "#cbd5e1",
        backgroundColor: "#0a0a0a",
        onSave: () => {
          onSave(textarea.value);
        },
        onExit: () => {
          if (closedRef.current) return;
          closedRef.current = true;
          onClose();
        }
      });

      setStatus("ready");
    };

    init();

    return () => {
      cancelled = true;
      const editor = editorRef.current;
      if (editor?.disable && !closedRef.current) {
        editor.disable(false);
      }
    };
  }, [initialContent, onClose, onSave]);

  return (
    <div data-vim-active="true" className="absolute inset-0 z-30 bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-[#252525] bg-[#0f0f0f] px-3 py-2 text-xs text-slate-400">
        <span>{`vim ${fileLabel}`}</span>
        <span className="hidden sm:inline">:w save | :q quit | :wq save + quit</span>
      </div>

      <div className="relative h-[calc(100%-34px)]">
        <textarea
          ref={textareaRef}
          defaultValue={initialContent}
          className="absolute inset-0 h-full w-full resize-none opacity-0"
          spellCheck={false}
        />

        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] text-sm text-slate-400">
            {status === "loading" ? (
              <span>Loading vim runtime...</span>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-600 px-3 py-1 text-slate-200 hover:border-slate-300"
              >
                Close editor (failed to load)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
