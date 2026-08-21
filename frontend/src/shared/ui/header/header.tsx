import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          EMPORA
        </Link>
      </div>
    </header>
  );
}
