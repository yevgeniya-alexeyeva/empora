import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Hello world</h1>
      <div className="flex gap-3 text-sm">
        <Link className="underline" href="/login">
          Login
        </Link>
        <Link className="underline" href="/myProfile">
          My profile
        </Link>
        <Link className="underline" href="/survey">
          Survey
        </Link>
      </div>
    </section>
  );
}
