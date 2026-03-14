import sheet from "./tooltip.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
<div id="tooltip" role="tooltip" popover="manual">
  <slot name="content"></slot>
</div>
<div id="arrow" popover="manual"></div>
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
    #arrow;
    #anchor;
    #showTimeout;
    #hideTimeout;

    #handleShow = () => {
      clearTimeout(this.#hideTimeout);
      const delay = parseInt(this.delay || "500", 10);
      this.#showTimeout = setTimeout(() => {
        this.#tooltip.showPopover();
        this.#arrow.showPopover();
        this.#updatePosition();
      }, delay);
    };

    #handleHide = () => {
      clearTimeout(this.#showTimeout);
      this.#hideTimeout = setTimeout(() => {
        this.#tooltip.hidePopover();
        this.#arrow.hidePopover();
      }, 200);
    };

    #updatePosition = () => {
      const tooltipRect = this.#tooltip.getBoundingClientRect();
      const anchorRect = this.#anchor.getBoundingClientRect();
      if (tooltipRect.width === 0 || anchorRect.width === 0) return;

      let position;

      if (tooltipRect.bottom <= anchorRect.top) {
        position = "top";
      } else if (tooltipRect.top >= anchorRect.bottom) {
        position = "bottom";
      } else if (tooltipRect.right <= anchorRect.left) {
        position = "left";
      } else if (tooltipRect.left >= anchorRect.right) {
        position = "right";
      }
      this.#arrow.classList.remove("top", "bottom", "left", "right");
      this.#arrow.classList.add(position);
    };

    #handleKeyDown = (e) => {
      if (e.key === "Escape") {
        this.#handleHide();
      }
    };

    attributesChanged(name, oldValue, newValue) {
      switch (name) {
        case "position":
          this.#tooltip.style.setProperty("position-area", newValue);
          this.#updatePosition();
          break;
      }
    }

    constructor() {
      super();
      this.#anchor = this.shadowRoot.getElementById("anchor");
      this.#tooltip = this.shadowRoot.getElementById("tooltip");
      this.#arrow = this.shadowRoot.getElementById("arrow");

      this.#anchor.addEventListener("mouseenter", this.#handleShow);
      this.#anchor.addEventListener("mouseleave", this.#handleHide);
      this.#anchor.addEventListener("focusin", this.#handleShow);
      this.#anchor.addEventListener("focusout", this.#handleHide);
      this.#tooltip.addEventListener("mouseenter", this.#handleShow);
      this.#tooltip.addEventListener("mouseleave", this.#handleHide);
      window.addEventListener("keydown", this.#handleKeyDown);
    }
  },
);
