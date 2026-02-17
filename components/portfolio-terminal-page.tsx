import { DraggableTerminalWindow } from "@/components/draggable-terminal-window";
import { TerminalEmulator } from "@/components/terminal-emulator";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M12 .5C5.649.5.5 5.65.5 12a11.5 11.5 0 0 0 7.864 10.923c.575.104.785-.25.785-.557 0-.274-.01-1-.016-1.963-3.2.695-3.877-1.542-3.877-1.542-.523-1.33-1.278-1.685-1.278-1.685-1.045-.714.08-.7.08-.7 1.156.082 1.764 1.188 1.764 1.188 1.027 1.76 2.694 1.252 3.35.957.104-.744.402-1.253.73-1.54-2.555-.292-5.242-1.278-5.242-5.688 0-1.256.45-2.283 1.188-3.088-.119-.292-.515-1.465.113-3.055 0 0 .968-.31 3.17 1.179a10.96 10.96 0 0 1 2.887-.388c.98.005 1.967.132 2.888.388 2.2-1.49 3.166-1.179 3.166-1.179.63 1.59.234 2.763.115 3.055.74.805 1.186 1.832 1.186 3.088 0 4.42-2.692 5.392-5.255 5.677.414.357.783 1.06.783 2.138 0 1.545-.014 2.792-.014 3.171 0 .31.207.667.79.554A11.502 11.502 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7.3" cy="8.2" r="1.3" fill="currentColor" />
      <path d="M6.1 10.9h2.3V18H6.1v-7.1Zm4 0h2.2v1c.5-.8 1.5-1.3 2.8-1.3 2.4 0 3.8 1.5 3.8 4.4V18h-2.3v-2.8c0-1.5-.6-2.4-1.8-2.4-1.1 0-2.2.7-2.2 2.4V18h-2.3v-7.1Z" fill="currentColor" />
    </svg>
  );
}

export function PortfolioTerminalPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      <section className="absolute right-5 top-5 z-0 text-right md:right-8 md:top-8">
        <h1 className="signature-font tracking-[0.03em] text-slate-100">
          Remington Steele
        </h1>
        <div className="mt-3 flex justify-end gap-3 text-slate-300">
          <a
            href="https://github.com/remsteele"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-700/70 p-1.5 transition-colors hover:border-slate-100 hover:text-white"
            aria-label="GitHub profile"
          >
            <GitHubIcon />
          </a>
          <a
            href="https://linkedin.com/in/rvsteele"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-700/70 p-1.5 transition-colors hover:border-slate-100 hover:text-white"
            aria-label="LinkedIn profile"
          >
            <LinkedInIcon />
          </a>
        </div>
      </section>

      <section className="pointer-events-none relative z-10 flex min-h-screen items-end justify-center px-3 pb-4 pt-24 md:items-center md:px-0 md:pb-0 md:pt-0">
        <DraggableTerminalWindow>
          <TerminalEmulator />
        </DraggableTerminalWindow>
      </section>
    </main>
  );
}
