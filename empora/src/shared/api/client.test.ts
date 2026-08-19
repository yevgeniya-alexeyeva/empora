import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseApiErrorMessage } from "./client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API client refresh flow", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("shares one refresh between parallel 401 responses", async () => {
    let protectedCalls = 0;
    let resolveRefresh!: (response: Response) => void;
    const pendingRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) return pendingRefresh;

      protectedCalls += 1;
      if (protectedCalls <= 2) {
        return Promise.resolve(jsonResponse({ message: "Unauthorized" }, 401));
      }
      if (url.endsWith("/users/me")) {
        return Promise.resolve(
          jsonResponse({
            id: "1",
            email: "eva@example.com",
            name: "Eva",
            role: "user",
          }),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./client");
    const requests = Promise.all([api.me(), api.surveys()]);

    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).endsWith("/auth/refresh"),
        ),
      ).toHaveLength(1);
    });
    resolveRefresh(new Response(null, { status: 204 }));

    await expect(requests).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("retries a protected request only once", async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      if (String(input).endsWith("/auth/refresh")) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(jsonResponse({ message: "Unauthorized" }, 401));
    });
    vi.stubGlobal("fetch", fetchMock);

    const { api, ApiError } = await import("./client");

    await expect(api.surveys()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not refresh auth endpoints", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ message: "Unauthorized" }, 401)),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./client");

    await expect(
      api.login("eva@example.com", "password"),
    ).rejects.toMatchObject({ status: 401 });
    await expect(api.logout()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears a failed refresh so a later request can refresh again", async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      if (String(input).endsWith("/auth/refresh")) {
        return Promise.resolve(jsonResponse({ message: "Unauthorized" }, 401));
      }
      return Promise.resolve(jsonResponse({ message: "Unauthorized" }, 401));
    });
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./client");

    await expect(api.surveys()).rejects.toMatchObject({ status: 401 });
    await expect(api.surveys()).rejects.toMatchObject({ status: 401 });
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/auth/refresh"),
      ),
    ).toHaveLength(2);
  });
});

describe("parseApiErrorMessage", () => {
  it("extracts all Nest validation messages from the filter contract", () => {
    expect(
      parseApiErrorMessage({
        statusCode: 400,
        error: {
          statusCode: 400,
          message: ["email must be an email", "password is too long"],
          error: "Bad Request",
        },
        path: "/api/auth/register",
        timestamp: "2026-10-06T12:00:00.000Z",
      }),
    ).toBe("email must be an email; password is too long");
  });

  it("extracts a direct middleware message", () => {
    expect(parseApiErrorMessage({ message: "Origin is not allowed" })).toBe(
      "Origin is not allowed",
    );
  });

  it("supports a string error in the common contract", () => {
    expect(parseApiErrorMessage({ error: "Forbidden" })).toBe("Forbidden");
  });
});
