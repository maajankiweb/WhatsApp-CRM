import { describe, it, expect } from "vitest";
import { checkShortcutTrigger, getMediaKindFromUrl } from "./canned-utils";

describe("canned-utils", () => {
  describe("checkShortcutTrigger", () => {
    it("should trigger at start of string with slash", () => {
      const match = checkShortcutTrigger("/", 1);
      expect(match).toEqual({
        query: "",
        startIndex: 0,
        word: "/",
      });
    });

    it("should trigger with search term", () => {
      const match = checkShortcutTrigger("/price", 6);
      expect(match).toEqual({
        query: "price",
        startIndex: 0,
        word: "/price",
      });
    });

    it("should trigger on space boundary", () => {
      const match = checkShortcutTrigger("hello /disc", 11);
      expect(match).toEqual({
        query: "disc",
        startIndex: 6,
        word: "/disc",
      });
    });

    it("should ignore when cursor is before the slash", () => {
      const match = checkShortcutTrigger("hello /disc", 5);
      expect(match).toBeNull();
    });

    it("should ignore words without slash prefix", () => {
      const match = checkShortcutTrigger("hello price", 11);
      expect(match).toBeNull();
    });

    it("should lowercase the search query", () => {
      const match = checkShortcutTrigger("/PRiCe", 6);
      expect(match?.query).toBe("price");
    });
  });

  describe("getMediaKindFromUrl", () => {
    it("should identify images", () => {
      expect(getMediaKindFromUrl("https://example.com/logo.png")).toBe("image");
      expect(getMediaKindFromUrl("https://example.com/photo.JPEG?size=large")).toBe("image");
      expect(getMediaKindFromUrl("https://example.com/banner.webp")).toBe("image");
    });

    it("should identify videos", () => {
      expect(getMediaKindFromUrl("https://example.com/promo.mp4")).toBe("video");
      expect(getMediaKindFromUrl("https://example.com/clip.3gp")).toBe("video");
    });

    it("should identify audio", () => {
      expect(getMediaKindFromUrl("https://example.com/audio.mp3")).toBe("audio");
      expect(getMediaKindFromUrl("https://example.com/voicenote.ogg")).toBe("audio");
    });

    it("should fallback to document", () => {
      expect(getMediaKindFromUrl("https://example.com/invoice.pdf")).toBe("document");
      expect(getMediaKindFromUrl("https://example.com/notes.txt")).toBe("document");
      expect(getMediaKindFromUrl("https://example.com/unknown_ext")).toBe("document");
    });
  });
});
