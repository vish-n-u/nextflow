import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <p className="text-7xl font-bold text-zinc-700 select-none">404</p>
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Page not found</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-semibold px-6 py-2.5 transition-colors duration-150"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
