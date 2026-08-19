import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PrivateAuthGuard from "./PrivateAuthGuard";
import { ApiError } from "@/shared/api/client";

const { meMock, replaceMock } = vi.hoisted(() => ({
  meMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/shared/api/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/shared/api/client")>();
  return {
    ...original,
    api: { ...original.api, me: meMock },
  };
});

describe("PrivateAuthGuard", () => {
  beforeEach(() => {
    meMock.mockReset();
    replaceMock.mockReset();
  });

  it("hides protected children while checking and renders them after success", async () => {
    let resolveMe!: (value: {
      id: string;
      email: string;
      name: string;
      role: "user";
    }) => void;
    meMock.mockReturnValue(
      new Promise((resolve) => {
        resolveMe = resolve;
      }),
    );

    render(
      <PrivateAuthGuard>
        <p>Protected content</p>
      </PrivateAuthGuard>,
    );

    expect(screen.getByText("Checking your session...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();

    resolveMe({
      id: "1",
      email: "eva@example.com",
      name: "Eva",
      role: "user",
    });

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects only after api.me returns a final 401", async () => {
    meMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

    render(
      <PrivateAuthGuard>
        <p>Protected content</p>
      </PrivateAuthGuard>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("shows a retryable error without redirecting on non-401 failures", async () => {
    meMock.mockRejectedValue(new ApiError(500, "Service unavailable"));

    render(
      <PrivateAuthGuard>
        <p>Protected content</p>
      </PrivateAuthGuard>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Service unavailable",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
