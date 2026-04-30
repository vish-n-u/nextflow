import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <SignUp forceRedirectUrl="/dashboard" />
    </main>
  );
}
