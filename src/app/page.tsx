import { TransformationWorkspace } from "@/features/transformations/TransformationWorkspace";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-7 px-4 py-7 sm:gap-9 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tracking-[0.16em] text-foreground uppercase">
            AI Video Transformer
          </p>
          <span className="rounded-md border border-accent/25 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-accent uppercase">
            Creative workspace
          </span>
        </div>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
          Style a source clip with Magic Hour
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Upload once, choose transform settings, and track progress in history.
          Jobs keep running if you leave — refresh anytime to pick up where you
          left off.
        </p>
      </header>

      <TransformationWorkspace />
    </main>
  );
}
