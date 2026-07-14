import { describe, it, expect } from "vitest";
import {
  ALLOWED_MIME,
  MAX_SIZE,
  sanitizeFilename,
  validateFile,
} from "@/lib/atividadesAnexos";

function fakeFile(name: string, type: string, size: number): File {
  const f = new File([new Uint8Array(size > 0 ? Math.min(size, 8) : 0)], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("atividadesAnexos.validateFile", () => {
  it("aceita PNG dentro do limite", () => {
    expect(validateFile(fakeFile("foto.png", "image/png", 1024))).toBeNull();
  });

  it("aceita PDF, docx, zip", () => {
    expect(validateFile(fakeFile("a.pdf", "application/pdf", 500))).toBeNull();
    expect(
      validateFile(
        fakeFile(
          "a.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          500,
        ),
      ),
    ).toBeNull();
    expect(validateFile(fakeFile("a.zip", "application/zip", 500))).toBeNull();
  });

  it("rejeita arquivo vazio", () => {
    expect(validateFile(fakeFile("v.png", "image/png", 0))).toMatch(/vazio/i);
  });

  it("rejeita arquivo acima de 15 MB", () => {
    expect(validateFile(fakeFile("big.png", "image/png", MAX_SIZE + 1))).toMatch(
      /excede/i,
    );
  });

  it("rejeita MIME não permitido", () => {
    expect(
      validateFile(fakeFile("m.mp4", "video/mp4", 100)),
    ).toMatch(/não permitido/i);
  });

  it("rejeita extensão perigosa mesmo com MIME válido", () => {
    expect(
      validateFile(fakeFile("virus.exe", "application/zip", 100)),
    ).toMatch(/extensão/i);
    expect(
      validateFile(fakeFile("x.html", "text/plain", 100)),
    ).toMatch(/extensão/i);
  });
});

describe("atividadesAnexos.sanitizeFilename", () => {
  it("substitui espaços e caracteres especiais", () => {
    expect(sanitizeFilename("hello world!.png")).toBe("hello_world_.png");
  });
  it("nunca retorna vazio", () => {
    expect(sanitizeFilename("///")).toBe("arquivo");
  });
  it("trunca em 120 caracteres", () => {
    const long = "a".repeat(200) + ".png";
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(120);
  });
});

describe("atividadesAnexos.ALLOWED_MIME", () => {
  it("inclui imagens e documentos essenciais", () => {
    expect(ALLOWED_MIME.has("image/png")).toBe(true);
    expect(ALLOWED_MIME.has("application/pdf")).toBe(true);
    expect(ALLOWED_MIME.has("application/zip")).toBe(true);
  });
});
