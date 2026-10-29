window.activitySharing = {
  activityId(name) {
    return `activity-${encodeURIComponent(name)}`;
  },

  createControls(name, details) {
    // Share only public activity information, never participant details.
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = new URLSearchParams({ activity: name }).toString();
    const text = `Join me at ${name} at Mergington High School! ${details.description}`;

    const container = document.createElement("div");
    container.className = "activity-sharing";
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", `Share ${name}`);

    const label = document.createElement("span");
    label.textContent = "Share:";
    container.appendChild(label);

    const destinations = [
      ["Facebook", "https://www.facebook.com/sharer/sharer.php", { u: url.href }],
      ["WhatsApp", "https://wa.me/", { text: `${text} ${url.href}` }],
      ["X", "https://twitter.com/intent/tweet", { text, url: url.href }],
    ];

    destinations.forEach(([label, address, parameters]) => {
      const link = document.createElement("a");
      const destination = new URL(address);
      destination.search = new URLSearchParams(parameters).toString();
      link.href = destination.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "share-link";
      link.textContent = label;
      link.setAttribute("aria-label", `Share ${name} on ${label} (opens in a new tab)`);
      container.appendChild(link);
    });

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy link";
    copyButton.setAttribute("aria-label", `Copy link to ${name}`);
    container.appendChild(copyButton);

    const manualLink = document.createElement("input");
    manualLink.type = "text";
    manualLink.readOnly = true;
    manualLink.value = url.href;
    manualLink.className = "hidden share-url";
    manualLink.setAttribute("aria-label", `Link to ${name}`);
    container.appendChild(manualLink);

    const status = document.createElement("p");
    status.className = "share-status";
    status.setAttribute("role", "status");
    container.appendChild(status);

    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url.href);
        manualLink.classList.add("hidden");
        status.textContent = "Link copied!";
      } catch (error) {
        console.error("Could not copy activity link:", error);
        status.textContent = "Could not copy automatically. Select and copy the displayed link.";
        manualLink.classList.remove("hidden");
        manualLink.focus();
        manualLink.select();
      }
    });

    return container;
  },

  focusSharedActivity({ focus = true } = {}) {
    const name = new URLSearchParams(window.location.hash.slice(1)).get("activity");
    document.querySelectorAll(".shared-activity").forEach((card) => {
      card.classList.remove("shared-activity");
    });
    if (!name) {
      return;
    }

    const card = document.getElementById(this.activityId(name));
    if (card) {
      card.classList.add("shared-activity");
      if (focus) {
        card.focus({ preventScroll: true });
        card.scrollIntoView({ block: "center" });
      }
    }
  },
};
