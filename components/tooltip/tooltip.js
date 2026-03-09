import sheet from "./tooltip.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `<slot name="popover-internal"></slot>`;

window.customElements.define(
  "ds-tooltip",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;

    static meta = {
      attributes: {
        anchor: [], // ID string
        position: [], // position-area string
        delay: [], // number string
      },
    };

    #popover;
    #timer;
    #initialized = false;

    attributesChanged(name, oldValue, newValue) {
      if (name === "anchor") {
        this.#updateListeners(oldValue, newValue);
      }
      if (this.#popover) {
        if (name === "anchor") {
          this.#popover.setAttribute("anchor", newValue || "");
        }
        if (name === "position") {
          this.#popover.setAttribute("position", newValue || "top");
        }
      }
    }

    #handleShow = () => {
      const delay = parseInt(this.getAttribute("delay") || "200", 10);
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        if (this.#popover) {
          this.#popover.setAttribute("open", "");
        }
      }, delay);
    };

    #handleHide = () => {
      clearTimeout(this.#timer);
      if (this.#popover) {
        this.#popover.removeAttribute("open");
      }
    };

    #updateListeners(oldId, newId) {
      if (oldId) {
        const oldEl = document.getElementById(oldId);
        if (oldEl) {
          oldEl.removeEventListener("mouseenter", this.#handleShow);
          oldEl.removeEventListener("mouseleave", this.#handleHide);
          oldEl.removeEventListener("focus", this.#handleShow);
          oldEl.removeEventListener("blur", this.#handleHide);
          oldEl.removeAttribute("aria-describedby");
        }
      }

      if (newId) {
        const newEl = document.getElementById(newId);
        if (newEl) {
          newEl.addEventListener("mouseenter", this.#handleShow);
          newEl.addEventListener("mouseleave", this.#handleHide);
          newEl.addEventListener("focus", this.#handleShow);
          newEl.addEventListener("blur", this.#handleHide);

          if (!this.id) {
            this.id = `ds-tooltip-${Math.random().toString(36).slice(2, 9)}`;
          }
          newEl.setAttribute("aria-describedby", this.id);
        }
      }
    }

    connectedCallback() {
      if (!this.#initialized) {
        this.#popover = document.createElement("ds-popover");
        this.#popover.setAttribute("popover", "manual");
        this.#popover.setAttribute("slot", "popover-internal");

        const bubble = document.createElement("div");
        bubble.className = "tooltip-bubble";
        bubble.setAttribute("role", "tooltip");
        this.#popover.appendChild(bubble);

        // Move initial children to the bubble
        const fragment = document.createDocumentFragment();
        Array.from(this.childNodes).forEach((node) => {
          if (node !== this.#popover) {
            fragment.appendChild(node);
          }
        });
        bubble.appendChild(fragment);

        this.appendChild(this.#popover);
        this.#initialized = true;
      }

      // Re-apply values once connected
      if (this.anchor) {
        this.#popover.setAttribute("anchor", this.anchor);
        this.#updateListeners(null, this.anchor);
      }
      if (this.position) {
        this.#popover.setAttribute("position", this.position);
      }
    }

    disconnectedCallback() {
      this.#updateListeners(this.anchor, null);
    }
  },
);
