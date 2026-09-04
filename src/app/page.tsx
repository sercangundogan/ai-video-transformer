import { TransformationWorkspace } from "@/features/transformations/TransformationWorkspace";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="flex flex-col gap-3 sm:gap-4">
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
          AI Video Transformer
        </p>
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Style a source clip with Magic Hour
          </h1>
          <p className="text-base leading-7 text-muted">
            Upload once, choose transform settings, and track progress in
            history. Jobs keep running if you leave — refresh anytime to pick up
            where you left off.
          </p>
        </div>
      </header>

      <TransformationWorkspace />
    </main>
  );
}
