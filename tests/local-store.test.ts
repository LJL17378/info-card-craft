import { beforeEach, describe, expect, it } from "vitest";
import {
  createLocalCard,
  deleteLocalCard,
  listLocalCards,
} from "@/lib/local-store";

describe("local card drafts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reuses the active draft for the same template", () => {
    const first = createLocalCard("city-inspiration");
    const second = createLocalCard("city-inspiration");

    expect(second.id).toBe(first.id);
    expect(
      listLocalCards().filter((card) => card.template === "city-inspiration"),
    ).toHaveLength(1);
  });

  it("allows a fresh draft after the previous draft is removed", () => {
    const first = createLocalCard("city-inspiration");
    deleteLocalCard(first.id);
    const second = createLocalCard("city-inspiration");

    expect(second.id).not.toBe(first.id);
  });
});
