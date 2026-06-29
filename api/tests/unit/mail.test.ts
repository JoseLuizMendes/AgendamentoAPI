import { describe, it, expect, vi, afterEach } from "vitest";
import { sendEmail, verificationEmail, passwordResetEmail } from "../../src/services/mail.js";

describe("templates de email", () => {
  it("verificação inclui o link", () => {
    const { subject, html } = verificationEmail("https://app/verify-email?token=abc");
    expect(subject).toBeTruthy();
    expect(html).toContain("https://app/verify-email?token=abc");
  });

  it("reset inclui o link", () => {
    expect(passwordResetEmail("https://app/reset-password?token=xyz").html).toContain(
      "https://app/reset-password?token=xyz"
    );
  });
});

describe("sendEmail — modo dev (sem RESEND_API_KEY)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("não chama fetch e não lança (loga o link)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await expect(
      sendEmail({ to: "a@x.com", subject: "s", html: "h", devLink: "http://x/y" })
    ).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
