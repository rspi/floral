import sheet from "./tooltip.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
<div id="tooltip" role="tooltip" popover>
  <slot name="content"></slot>
</div>
<div id="anchor">
  <slot></slot>
</div>
  `;

window.customElements.define(
  "ds-tooltip",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;

    static meta = {
      attributes: {
        position: ["top", "right", "bottom", "left"],
        delay: ["0", "500"],
      },
      slots: {
        default: "Anchor element for the tooltip",
        content: "Tooltip content",
      },
    };

    #tooltip;
    #anchor;
    #showTimeout;
    #hideTimeout;

    #handleShow = () => {
      clearTimeout(this.#hideTimeout);
      const delay = parseInt(this.delay || "500", 10);
      this.#showTimeout = setTimeout(() => {
        this.#tooltip.showPopover();
      }, delay);
    };

    #handleHide = () => {
      clearTimeout(this.#showTimeout);
      this.#hideTimeout = setTimeout(() => {
        this.#tooltip.hidePopover();
      }, 200);
    };

    attributesChanged(name, oldValue, newValue) {
      switch (name) {
        case "position":
          this.#tooltip.style.setProperty("position-area", newValue ?? "top");
          break;
      }
    }

    constructor() {
      super();
      this.#anchor = this.shadowRoot.getElementById("anchor");
      this.#tooltip = this.shadowRoot.getElementById("tooltip");

      this.#anchor.addEventListener("mouseenter", this.#handleShow);
      this.#anchor.addEventListener("mouseleave", this.#handleHide);
      this.#anchor.addEventListener("focusin", this.#handleShow);
      this.#anchor.addEventListener("focusout", this.#handleHide);
      this.#tooltip.addEventListener("mouseenter", this.#handleShow);
      this.#tooltip.addEventListener("mouseleave", this.#handleHide);
    }
  },
);
