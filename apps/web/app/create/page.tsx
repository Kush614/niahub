import { CuratorWizard } from '@/components/CuratorWizard';

export default function CreatePage() {
  return (
    <section className="pt-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Create a pack</h1>
        <p className="mt-2 text-white/70">
          Paste source URLs and a description. Devin runs as your curator agent —
          crawls, dedups, drafts metadata, generates benchmark questions, and runs
          Nia indexing. You review and publish.
        </p>
      </div>
      <div className="mt-6 max-w-3xl">
        <CuratorWizard />
      </div>
    </section>
  );
}
