import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-semibold">NextFlow</h1>
        <UserButton />
      </header>
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-2">
        <h2 className="text-2xl font-bold">Welcome to NextFlow</h2>
        <p className="text-zinc-400">{user?.emailAddresses[0]?.emailAddress}</p>
      </main>
    </div>
  );
}
