import { describe, it, expect } from "vitest";
import { signUploadParams, buildUploadSignature } from "../../src/services/cloudinary.js";

describe("signUploadParams", () => {
  // Vetor oficial da doc do Cloudinary (authentication_signatures):
  // timestamp=1315060510 + secret "abcd" → a21ad0f63beb4de2e5575204b79ab90bffb02c10
  it("assina conforme o exemplo da doc (SHA-1 de params ordenados + secret)", () => {
    expect(signUploadParams({ timestamp: 1315060510 }, "abcd")).toBe(
      "a21ad0f63beb4de2e5575204b79ab90bffb02c10",
    );
  });

  it("ordena os parâmetros alfabeticamente antes de assinar", () => {
    const a = signUploadParams({ timestamp: 1, folder: "x" }, "s");
    const b = signUploadParams({ folder: "x", timestamp: 1 }, "s");
    expect(a).toBe(b);
  });
});

describe("buildUploadSignature", () => {
  it("monta o payload com timestamp fixo e assinatura correspondente", () => {
    const sig = buildUploadSignature(
      { cloudName: "c", apiKey: "k", apiSecret: "abcd" },
      () => 1315060510,
    );
    expect(sig).toEqual({
      cloudName: "c",
      apiKey: "k",
      timestamp: 1315060510,
      signature: "a21ad0f63beb4de2e5575204b79ab90bffb02c10",
    });
  });

  it("inclui a pasta na assinatura quem uploadFolder estiver definido", () => {
    const sig = buildUploadSignature(
      { cloudName: "c", apiKey: "k", apiSecret: "s", uploadFolder: "SehdPro" },
      () => 100,
    );
    expect(sig.folder).toBe("SehdPro");
    expect(sig.signature).toBe(signUploadParams({ folder: "SehdPro", timestamp: 100 }, "s"));
  });

  it("assina allowed_formats quando definido (restringe o tipo de arquivo)", () => {
    const sig = buildUploadSignature(
      { cloudName: "c", apiKey: "k", apiSecret: "s", allowedFormats: "jpg,png,webp" },
      () => 100,
    );
    expect(sig.allowedFormats).toBe("jpg,png,webp");
    expect(sig.signature).toBe(
      signUploadParams({ allowed_formats: "jpg,png,webp", timestamp: 100 }, "s"),
    );
  });

  it("combina folder + allowed_formats na assinatura (ordem alfabética)", () => {
    const sig = buildUploadSignature(
      { cloudName: "c", apiKey: "k", apiSecret: "s", uploadFolder: "f", allowedFormats: "jpg" },
      () => 100,
    );
    expect(sig.signature).toBe(
      signUploadParams({ allowed_formats: "jpg", folder: "f", timestamp: 100 }, "s"),
    );
  });
});
