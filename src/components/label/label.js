import sheet from "./label.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
  <label>
    <slot></slot>
  </label>
`;

window.customElements.define(
  "ds-label",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;

    static meta = {
      attributes: {
        for: [],
      },
      slots: {
        default: "The label text.",
      },
      parts: {},
      cssVariables: {},
    };

    #label;

    #syncAOM() {
      const targetId = this.for;
      if (!targetId) return;

      const root = this.getRootNode();
      if (root && typeof root.getElementById === "function") {
        const target = root.getElementById(targetId);
        if (target) {
          // Use AOM (Accessibility Object Model) to natively link them in the AXTree
          target.ariaLabelledByElements = [this];
        }
      }
    }

    handleStateChange(name, oldValue, newValue) {
      if (name === "for") {
        this.#syncAOM();
      }
    }

    setup() {
      this.#syncAOM();
    }

    connectedCallback() {
      super.connectedCallback();
      // Ensure the DOM has parsed and sibling elements are available
      queueMicrotask(() => {
        this.#syncAOM();
      });
    }

    #handleClick = (e) => {
      const targetId = this.for;
      if (!targetId) return;

      const root = this.getRootNode();
      if (root && typeof root.getElementById === "function") {
        const target = root.getElementById(targetId);
        if (target) {
          // Focus the target element.
          target.focus();
        }
      }
    };

    constructor() {
      super();
      this.#label = this.shadowRoot.querySelector("label");
      this.addEventListener("click", this.#handleClick);
    }
  },
);
