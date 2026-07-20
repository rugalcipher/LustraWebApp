import { describe, it, expect } from "vitest";
import { ApiError, kindFromStatus, toFormErrors, toUserMessage } from "@/api/problemDetails";

describe("ProblemDetails parsing", () => {
  it("maps the backend ErrorHttpMapping status codes onto error kinds", () => {
    expect(kindFromStatus(400)).toBe("validation");
    expect(kindFromStatus(401)).toBe("unauthorized");
    expect(kindFromStatus(403)).toBe("forbidden");
    expect(kindFromStatus(404)).toBe("not_found");
    expect(kindFromStatus(409)).toBe("conflict");
    // 422 = the backend's InvalidState, distinct from 400 validation.
    expect(kindFromStatus(422)).toBe("invalid_state");
    expect(kindFromStatus(429)).toBe("rate_limited");
    expect(kindFromStatus(500)).toBe("server");
    expect(kindFromStatus(503)).toBe("server");
  });

  it("preserves the server error code and correlation id", () => {
    const error = ApiError.fromProblem(403, {
      title: "Forbidden",
      detail: "VIP media is unavailable.",
      code: "media.vip_unavailable",
      correlationId: "cid-123",
    });
    expect(error.kind).toBe("forbidden");
    expect(error.code).toBe("media.vip_unavailable");
    expect(error.correlationId).toBe("cid-123");
  });

  it("surfaces the server detail rather than a generic message", () => {
    const error = ApiError.fromProblem(409, { title: "Conflict", detail: "That slot is already booked." });
    expect(toUserMessage(error)).toBe("That slot is already booked.");
  });

  it("never leaks server internals for 5xx responses", () => {
    const error = ApiError.fromProblem(500, {
      title: "NullReferenceException",
      detail: "Object reference not set at Lustra.Infrastructure.Foo",
    });
    expect(toUserMessage(error)).not.toContain("Lustra.Infrastructure");
    expect(toUserMessage(error)).toBe("Something went wrong on our side. Please try again shortly.");
  });

  it("maps ASP.NET validation errors onto both Pascal and camel case fields", () => {
    const error = ApiError.fromProblem(400, {
      title: "Validation failed",
      errors: { Email: ["Email is already registered."], NewPassword: ["Too weak."] },
    });
    const formErrors = toFormErrors(error);
    expect(formErrors.Email).toBe("Email is already registered.");
    expect(formErrors.email).toBe("Email is already registered.");
    expect(formErrors.newPassword).toBe("Too weak.");
  });

  it("classifies aborts as canceled, not as failures to surface", () => {
    expect(ApiError.canceled().kind).toBe("canceled");
  });
});
