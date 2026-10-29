const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

function setup(clipboard) {
  const elements = [];
  function createElement(tagName) {
    const classes = new Set();
    const element = {
      tagName,
      children: [],
      attributes: {},
      set className(value) {
        classes.clear();
        value.split(" ").filter(Boolean).forEach((name) => classes.add(name));
      },
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
      },
      appendChild(child) { this.children.push(child); },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(event, handler) { this[event] = handler; },
      focus() { this.focused = true; },
      select() { this.selected = true; },
      scrollIntoView() { this.scrolled = true; },
    };
    elements.push(element);
    return element;
  }
  const context = {
    URL,
    URLSearchParams,
    window: { location: { href: "https://school.example/static/index.html?unused=1#old", hash: "" } },
    navigator: { clipboard },
    document: {
      createElement,
      getElementById: (id) => elements.find((element) => element.id === id),
      querySelectorAll: () => elements.filter((element) => element.classList.contains("shared-activity")),
    },
    console: { error() {} },
  };
  vm.runInNewContext(readFileSync("src/static/sharing.js", "utf8"), context);
  return { sharing: context.window.activitySharing, context, createElement };
}

const name = "Art & Music / Friends #1";
const details = {
  description: "Create & learn together!",
  participants: ["private-student@example.com"],
};

test("social destinations encode a direct link and exclude student details", () => {
  const { sharing } = setup();
  const controls = sharing.createControls(name, details);
  assert.equal(controls.attributes["aria-label"], `Share ${name}`);
  const links = controls.children.filter((child) => child.tagName === "a");
  assert.equal(links.length, 3);
  for (const link of links) {
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.ok(!decodeURIComponent(link.href).includes(details.participants[0]));
    const destination = new URL(link.href);
    const sharedUrl = destination.searchParams.get("u") ||
      destination.searchParams.get("url") ||
      destination.searchParams.get("text").split(" ").at(-1);
    const url = new URL(sharedUrl);
    assert.equal(url.search, "");
    assert.equal(new URLSearchParams(url.hash.slice(1)).get("activity"), name);
  }
});

test("copy link reports success after writing the activity URL", async () => {
  let copied;
  const { sharing } = setup({ writeText: async (text) => { copied = text; } });
  const controls = sharing.createControls(name, details);
  await controls.children.find((child) => child.tagName === "button").click();
  assert.equal(controls.children.at(-1).textContent, "Link copied!");
  assert.equal(new URLSearchParams(new URL(copied).hash.slice(1)).get("activity"), name);
});

test("missing or denied clipboard access exposes a selectable manual link", async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw new Error("Denied"); } }]) {
    const { sharing } = setup(clipboard);
    const controls = sharing.createControls(name, details);
    await controls.children.find((child) => child.tagName === "button").click();
    const input = controls.children.find((child) => child.tagName === "input");
    assert.ok(!input.classList.contains("hidden"));
    assert.ok(input.focused && input.selected);
    assert.match(controls.children.at(-1).textContent, /Could not copy automatically/);
  }
});

test("shared activity links focus, scroll to, and highlight the matching card", () => {
  const { sharing, context, createElement } = setup();
  const card = createElement("div");
  card.id = sharing.activityId(name);
  context.window.location.hash = `#${new URLSearchParams({ activity: name })}`;
  sharing.focusSharedActivity();
  assert.ok(card.focused && card.scrolled);
  assert.ok(card.classList.contains("shared-activity"));
  context.window.location.hash = "#activity=Unknown";
  sharing.focusSharedActivity();
  assert.ok(!card.classList.contains("shared-activity"));
});

test("re-rendering preserves the shared highlight without moving keyboard focus", () => {
  const { sharing, context, createElement } = setup();
  const card = createElement("div");
  card.id = sharing.activityId(name);
  context.window.location.hash = `#${new URLSearchParams({ activity: name })}`;
  sharing.focusSharedActivity({ focus: false });
  assert.ok(card.classList.contains("shared-activity"));
  assert.ok(!card.focused && !card.scrolled);
});
