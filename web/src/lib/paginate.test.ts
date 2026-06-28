import { describe, it, expect } from "vitest";
import { paginate } from "./paginate";

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];

  it("fatia a página pedida (1-based)", () => {
    expect(paginate(items, 1, 3)).toEqual({ items: [1, 2, 3], page: 1, pageCount: 3 });
    expect(paginate(items, 2, 3)).toEqual({ items: [4, 5, 6], page: 2, pageCount: 3 });
    expect(paginate(items, 3, 3)).toEqual({ items: [7], page: 3, pageCount: 3 });
  });

  it("clampa página acima/abaixo do intervalo", () => {
    expect(paginate(items, 99, 3).page).toBe(3);
    expect(paginate(items, 0, 3).page).toBe(1);
    expect(paginate(items, -5, 3).page).toBe(1);
  });

  it("lista vazia → pageCount 1, sem itens", () => {
    expect(paginate([], 1, 3)).toEqual({ items: [], page: 1, pageCount: 1 });
  });
});
