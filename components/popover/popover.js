import sheet from "./popover.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `<slot></slot>`;

window.customElements.define(
  "ds-popover",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;

    static meta = {
      attributes: {
        popover: ["auto", "manual"],
        anchor: [], // ID string
        position: [], // position-area string
        open: [""], // boolean
      },
    };

    constructor() {
      super();
      this.addEventListener("toggle", (event) => {
        // Sync the 'open' attribute with the actual popover state
        this.open = event.newState === "open";
      });
    }

    attributesChanged(name, oldValue, newValue) {
      switch (name) {
        case "anchor":
          this.#updateAnchor(oldValue, newValue);
          break;
        case "position":
          this.style.setProperty("position-area", newValue);
          this.style.setProperty("inset-area", newValue);
          break;
        case "open":
          if (newValue !== null && !this.matches(":popover-open")) {
            this.showPopover();
          } else if (newValue === null && this.matches(":popover-open")) {
            this.hidePopover();
          }
          break;
      }
    }

    #updateAnchor(oldId, newId) {
      if (oldId) {
        const oldEl = document.getElementById(oldId);
        if (oldEl) {
          oldEl.style.removeProperty("anchor-name");
        }
      }
      if (newId) {
        const newEl = document.getElementById(newId);
        if (newEl) {
          // Use the ID as the anchor name basis for predictability
          const anchorName = `--anchor-${newId}`;
          newEl.style.setProperty("anchor-name", anchorName);
          this.style.setProperty("position-anchor", anchorName);
        }
      }
    }

    connectedCallback() {
      // Ensure the popover attribute is set so the API works
      if (!this.hasAttribute("popover")) {
        this.setAttribute("popover", "auto");
      }

      // Re-apply properties to ensure they are active when connected
      if (this.hasAttribute("anchor")) {
        this.#updateAnchor(null, this.getAttribute("anchor"));
      }
      if (this.hasAttribute("position")) {
        const pos = this.getAttribute("position");
        this.style.setProperty("position-area", pos);
        this.style.setProperty("inset-area", pos);
      }
    }

    show() {
      this.open = true;
    }

    hide() {
      this.open = false;
    }

    toggle() {
      this.open = !this.open;
    }

    disconnectedCallback() {
      if (this.anchor) {
        const el = document.getElementById(this.anchor);
        if (el) {
          el.style.removeProperty("anchor-name");
        }
      }
    }
  },
);
