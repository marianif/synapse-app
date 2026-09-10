import { normalizeHref, splitByUrls } from "@/lib/links";

describe("splitByUrls", () => {
  it("returns a single plain run for text without URLs", () => {
    expect(splitByUrls("just prose")).toEqual([{ text: "just prose", url: null }]);
  });

  it("returns nothing for an empty string", () => {
    expect(splitByUrls("")).toEqual([]);
  });

  it("splits a URL out of surrounding prose", () => {
    expect(splitByUrls("see https://synapse.dev now")).toEqual([
      { text: "see ", url: null },
      { text: "https://synapse.dev", url: "https://synapse.dev" },
      { text: " now", url: null },
    ]);
  });

  it("recognizes a bare www. run and normalizes its href", () => {
    expect(splitByUrls("read www.example.com here")).toEqual([
      { text: "read ", url: null },
      { text: "www.example.com", url: "www.example.com" },
      { text: " here", url: null },
    ]);
  });

  it("trims trailing punctuation from the URL, keeping it in the prose", () => {
    expect(splitByUrls("go to https://x.dev.")).toEqual([
      { text: "go to ", url: null },
      { text: "https://x.dev", url: "https://x.dev" },
      { text: ".", url: null },
    ]);
  });

  it("trims a trailing comma", () => {
    expect(splitByUrls("a, https://x.dev, b")).toEqual([
      { text: "a, ", url: null },
      { text: "https://x.dev", url: "https://x.dev" },
      { text: ", b", url: null },
    ]);
  });

  it("balances closing parens around a URL", () => {
    expect(splitByUrls("(https://x.dev/a(b)) done")).toEqual([
      { text: "(", url: null },
      { text: "https://x.dev/a(b)", url: "https://x.dev/a(b)" },
      { text: ") done", url: null },
    ]);
  });

  it("keeps a single trailing paren when the URL itself has none", () => {
    expect(splitByUrls("(https://x.dev)")).toEqual([
      { text: "(", url: null },
      { text: "https://x.dev", url: "https://x.dev" },
      { text: ")", url: null },
    ]);
  });

  it("recognizes every URL in a run-on sentence", () => {
    expect(splitByUrls("https://a.dev then www.b.com then https://c.dev")).toEqual([
      { text: "https://a.dev", url: "https://a.dev" },
      { text: " then ", url: null },
      { text: "www.b.com", url: "www.b.com" },
      { text: " then ", url: null },
      { text: "https://c.dev", url: "https://c.dev" },
    ]);
  });

  it("stops a URL at quotes and angle brackets", () => {
    expect(splitByUrls('see "https://x.dev"')).toEqual([
      { text: 'see "', url: null },
      { text: "https://x.dev", url: "https://x.dev" },
      { text: '"', url: null },
    ]);
  });

  it("does not treat bare punctuation as a URL", () => {
    expect(splitByUrls("www. what?")).toEqual([{ text: "www. what?", url: null }]);
  });
});

describe("normalizeHref", () => {
  it("keeps a scheme-prefixed URL as-is", () => {
    expect(normalizeHref("https://x.dev/a?b=1")).toBe("https://x.dev/a?b=1");
  });

  it("keeps an http URL as-is", () => {
    expect(normalizeHref("http://x.dev")).toBe("http://x.dev");
  });

  it("keeps an uppercase scheme as-is", () => {
    expect(normalizeHref("HTTP://X.DEV")).toBe("HTTP://X.DEV");
  });

  it("prepends https:// to a bare www. run", () => {
    expect(normalizeHref("www.example.com")).toBe("https://www.example.com");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeHref("  https://x.dev  ")).toBe("https://x.dev");
  });
});