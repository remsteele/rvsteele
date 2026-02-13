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
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M4.983 3.5C4.983 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.113 1 2.483 1 4.983 2.12 4.983 3.5ZM.3 8h4.366v15H.3V8Zm7.142 0h4.186v2.048h.06c.582-1.102 2.004-2.264 4.126-2.264C20.2 7.784 24 10.67 24 15.98V23h-4.363v-6.208c0-1.48-.027-3.383-2.06-3.383-2.06 0-2.374 1.61-2.374 3.275V23H10.84V8Z" />
    </svg>
  );
}

export function PortfolioTerminalPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      <section className="absolute right-5 top-5 z-20 text-right md:right-8 md:top-8">
        <h1 className="text-xl italic tracking-wide text-slate-100 md:text-2xl">
          Remington Steele
        </h1>
        <div className="mt-3 flex justify-end gap-3 text-slate-300">
          <a
            href="https://github.com/remsteele"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
            aria-label="GitHub profile"
          >
            <GitHubIcon />
          </a>
          <a
            href="https://linkedin.com/in/rvsteele"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
            aria-label="LinkedIn profile"
          >
            <LinkedInIcon />
          </a>
        </div>
      </section>

      <section className="flex min-h-screen items-end justify-center px-3 pb-4 pt-24 md:items-center md:px-0 md:pb-0 md:pt-0">
        <DraggableTerminalWindow>
          <TerminalEmulator />
        </DraggableTerminalWindow>
      </section>
    </main>
  );
}
