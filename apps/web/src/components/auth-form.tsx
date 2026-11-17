"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const payload =
      mode === "signup"
        ? {
            orgName: form.get("orgName"),
            orgSlug: form.get("orgSlug"),
            email: form.get("email"),
            password: form.get("password"),
          }
        : {
            email: form.get("email"),
            password: form.get("password"),
          };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message;
        setError(
          Array.isArray(message)
            ? message.join(", ")
            : message || "Authentication failed"
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  const signup = mode === "signup";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8">
          <div className="mb-4 inline-block rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">
            CRM
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            {signup ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="mt-2 text-slate-500">
            {signup
              ? "Get started with your CRM platform."
              : "Sign in to manage your contacts."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {signup && (
            <>
              <label className="block text-sm font-medium">
                Organization name
                <input
                  name="orgName"
                  required
                  minLength={2}
                  maxLength={100}
                  className="mt-1 w-full rounded-lg border p-3"
                  placeholder="Acme Limited"
                />
              </label>

              <label className="block text-sm font-medium">
                Organization slug
                <input
                  name="orgSlug"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[a-z0-9-]+"
                  className="mt-1 w-full rounded-lg border p-3"
                  placeholder="acme-limited"
                />
              </label>
            </>
          )}

          <label className="block text-sm font-medium">
            Email address
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border p-3"
              placeholder="you@company.com"
            />
          </label>

          <label className="block text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={signup ? 12 : undefined}
              className="mt-1 w-full rounded-lg border p-3"
              placeholder="Enter your password"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : signup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {signup ? "Already have an account?" : "New to CRM?"}{" "}
          <Link
            href={signup ? "/login" : "/signup"}
            className="font-semibold text-blue-600"
          >
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
