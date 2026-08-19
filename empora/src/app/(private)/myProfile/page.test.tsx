import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyProfilePage from "./page";

const {
  meMock,
  updateProfileMock,
  logoutMock,
  replaceMock,
  refreshMock,
} = vi.hoisted(() => ({
  meMock: vi.fn(),
  updateProfileMock: vi.fn(),
  logoutMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

vi.mock("@/shared/api/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/shared/api/client")>();
  return {
    ...original,
    api: {
      ...original.api,
      me: meMock,
      updateProfile: updateProfileMock,
      logout: logoutMock,
    },
  };
});

const user = {
  id: "user-1",
  email: "eva@example.com",
  name: "Eva",
  role: "user" as const,
};

describe("MyProfilePage errors", () => {
  beforeEach(() => {
    meMock.mockReset();
    updateProfileMock.mockReset();
    logoutMock.mockReset();
    replaceMock.mockReset();
    refreshMock.mockReset();
    meMock.mockResolvedValue(user);
  });

  it("shows a load error and retries it", async () => {
    meMock
      .mockRejectedValueOnce(new Error("Profile unavailable"))
      .mockResolvedValueOnce(user);

    render(<MyProfilePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Profile unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByDisplayValue("Eva")).toBeInTheDocument();
    expect(meMock).toHaveBeenCalledTimes(2);
  });

  it("shows a save error and restores the form controls", async () => {
    updateProfileMock.mockRejectedValue(new Error("Unable to update"));
    render(<MyProfilePage />);
    const input = await screen.findByDisplayValue("Eva");

    fireEvent.change(input, { target: { value: "Eva Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to update",
    );
    expect(screen.getByRole("button", { name: "Save profile" })).toBeEnabled();
    expect(input).toBeEnabled();
  });

  it("shows a logout error without redirecting and permits retry", async () => {
    logoutMock.mockRejectedValue(new Error("Unable to sign out now"));
    render(<MyProfilePage />);
    await screen.findByDisplayValue("Eva");

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign out now",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled(),
    );
    expect(replaceMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
