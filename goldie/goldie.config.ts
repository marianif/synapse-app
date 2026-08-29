import type { GoldieConfig } from "/Users/federicamariani/.npm/_npx/18a971dee120d222/node_modules/goldie/dist/config.d.ts";

const APP_ROOT = "/Users/federicamariani/Desktop/the-wedge/synapse-app";

const config: GoldieConfig = {
  appRoot: APP_ROOT,

  appPath: `${process.env.HOME}/Library/Developer/Xcode/DerivedData/synapseapp-elxqftltrxcykbeymlgntzxsnkac/Build/Products/Release-iphonesimulator/synapseapp.app`,
  bundleId: "dev.the-wedge.synapse-app.dev",

  devices: ["iphone-6.9"],
  locales: ["en-US"],
  appearance: "light",

  frame: { variant: "17-pro-blue" },

  theme: {
    background:
      "linear-gradient(160deg, #171A20 0%, #1E222B 55%, #262B36 100%)",
    headlineColor: "#E9EDF3",
    subheadColor: "#9AA5B4",
    fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    template: "editorial",
  },

  store: {
    name: "Synapse",
    subtitle: { "en-US": "The agenda that talks back" },
    developer: "the wedge",
    category: "Productivity",
    rating: 4.9,
    ratingCount: "New",
    ageRating: "4+",
    price: "Free",
    description: {
      "en-US":
        "Synapse is one place for everything from a passing thought to a growing project. Ideas, deadlines, growing projects, random thoughts — they all live here, sorted by what actually needs you.\n\nEvery morning, the board has something to say: what ran out, what's a day late, what's landing this week. No gamification, no busywork — just the truth about where things stand.",
    },
  },

  scenes: [
    {
      kind: "screenshot",
      id: "home",
      flow: "store-01-home",
      headline: { "en-US": "One place for everything" },
      subhead: {
        "en-US": "Ideas, deadlines, and growing projects — sorted by what needs you.",
      },
    },
    {
      kind: "screenshot",
      id: "agenda",
      flow: "store-02-agenda",
      headline: { "en-US": "The board talks back" },
      subhead: {
        "en-US": "A daily dispatch on what ran out, what's late, what's landing.",
      },
    },
    {
      kind: "screenshot",
      id: "project-detail",
      flow: "store-03-project-detail",
      headline: { "en-US": "Every project, in the open" },
      subhead: {
        "en-US": "Deadlines, todos, and ideas — together, not scattered.",
      },
    },
    {
      kind: "screenshot",
      id: "notes",
      flow: "store-04-notes",
      headline: { "en-US": "A place just for you" },
      subhead: {
        "en-US": "Notes that aren't tasks — kept in order, linked when it matters.",
      },
    },
    {
      kind: "screenshot",
      id: "projects",
      flow: "store-05-projects",
      headline: { "en-US": "Your life, in six areas" },
      subhead: { "en-US": "Work, home, body, money, people, making." },
    },
    {
      kind: "preview",
      id: "preview",
      segments: [
        { id: "open", flow: "store-preview-01-open" },
        { id: "open-project", flow: "store-preview-02-open-project" },
        { id: "complete", flow: "store-preview-03-complete" },
        { id: "agenda", flow: "store-preview-04-agenda", holdSeconds: 2 },
      ],
    },
  ],
};

export default config;
