import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-10 text-center shadow-lg">
        <div className="mb-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-2xl font-bold text-white">
          CRM
        </div>

        <h1 className="text-4xl font-bold text-slate-900">
          Welcome to CRM Platform
        </h1>

        <p className="mt-4 text-lg text-slate-600">
          Manage your contacts and customer relationships
          from one workspace.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
