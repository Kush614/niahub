import { About } from '@/components/About';

export const metadata = { title: 'NiaHub — How it works' };

export default function AboutPage() {
  return (
    <section className="pt-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">How NiaHub works</h1>
        <p className="mt-2 text-white/70">
          The pitch, the architecture, and what every sponsor in the stack is doing — for judges, teammates, or
          anyone who wants the wedge in 90 seconds.
        </p>
      </div>
      <div className="mt-8">
        <About />
      </div>
    </section>
  );
}
