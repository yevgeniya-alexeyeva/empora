"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/shared/api/client";

type PrivateAuthGuardProps = Readonly<{
  children: React.ReactNode;
}>;

export default function PrivateAuthGuard({
  children,
}: PrivateAuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    void api
      .me()
      .then(() => {
        if (isCurrent) setIsAuthorized(true);
      })
      .catch((authError: unknown) => {
        if (!isCurrent) return;

        if (authError instanceof ApiError && authError.status === 401) {
          router.replace("/login");
          return;
        }

        setError(
          authError instanceof Error
            ? authError.message
            : "Unable to verify your session",
        );
      });

    return () => {
      isCurrent = false;
    };
  }, [attempt, router]);

  if (isAuthorized) return <>{children}</>;

  if (error) {
    return (
      <section className="space-y-3 py-10">
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
        <button
          className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium"
          onClick={() => {
            setError("");
            setAttempt((value) => value + 1);
          }}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }

  return <p className="py-10">Checking your session...</p>;
}
