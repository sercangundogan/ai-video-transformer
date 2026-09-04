import { TransformationWorkspace } from "@/features/transformations/TransformationWorkspace";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          AI Video Transformer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Transform a source video
        </h1>
        <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Upload through Uploadcare, store in Cloudinary, then start a Magic
          Hour Video-to-Video job. Webhook completion arrives in the next
          phase.
        </p>
      </header>

      <TransformationWorkspace />
    </main>
  );
}
