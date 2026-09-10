import { act, create, ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { LinkText } from "@/components/atoms/link-text";
import { ThemeProvider } from "@/contexts/theme-context";

// jest.mock factories cannot reference out-of-scope imports — the official
// AsyncStorage mock ships as a require-able module.
jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(async () => ({ type: "dismiss" })),
}));

beforeAll(() => {
  // React 19 test renderer: without the act-environment flag, the provider's
  // async preference load updates state outside act() and React unmounts the
  // tree as an uncaught error.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
});

function renderLinkText(props: { text: string; muted?: boolean }): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider>
        <LinkText {...props} />
      </ThemeProvider>,
    );
  });
  return tree;
}

function texts(tree: ReturnType<typeof create>) {
  return tree.root.findAllByType(Text);
}

/** The link host Text — `findAllByProps` matches both the composite element
 *  and its host instance, so take the deepest (last) match. */
function linkRun(tree: ReturnType<typeof create>) {
  const matches = tree.root.findAllByProps({ accessibilityRole: "link" });
  return matches[matches.length - 1];
}

describe("LinkText", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders plain text unchanged when there is no URL", () => {
    const tree = renderLinkText({ text: "just prose" });
    const leaf = texts(tree)[texts(tree).length - 1];
    expect(leaf.props.children).toBe("just prose");
    expect(tree.root.findAllByProps({ accessibilityRole: "link" })).toHaveLength(0);
  });

  it("marks URL runs as links and keeps prose as plain text", () => {
    const tree = renderLinkText({ text: "see https://x.dev now" });
    const link = linkRun(tree);
    expect(link.props.children).toBe("https://x.dev");
    expect(link.props.accessibilityLabel).toBe("https://x.dev");
  });

  it("opens the normalized href in the in-app browser on tap", () => {
    const tree = renderLinkText({ text: "read www.example.com" });
    act(() => {
      linkRun(tree).props.onPress({ stopPropagation: jest.fn() });
    });
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      "https://www.example.com",
    );
  });

  it("stops the tap from propagating to an enclosing pressable", () => {
    const tree = renderLinkText({ text: "https://x.dev" });
    const stopPropagation = jest.fn();
    act(() => {
      linkRun(tree).props.onPress({ stopPropagation });
    });
    expect(stopPropagation).toHaveBeenCalled();
  });

  it("drops link runs to muted ink when muted", () => {
    const tree = renderLinkText({ text: "https://x.dev", muted: true });
    expect(linkRun(tree).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#5A6473" })]),
    );
  });
});