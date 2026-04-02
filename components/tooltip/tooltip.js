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

// Quirks
// 1. The reason #arrow is not inside #tooltip is because anchor() stops working on #arrow when #tooltip is a popover.
// 2. The reason for popover="manual" is because we need two popover elements.
// 3. The reason for not using position-try-fallbacks is because it was not working well when scrolling.

const fitsInPosition = (rect, anchorRect, position) => {
  const inViewport =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth);

  if (!inViewport) return false;

  switch (position) {
    case "top":
      return rect.bottom <= anchorRect.top;
    case "bottom":
      return rect.top >= anchorRect.bottom;
    case "left":
      return rect.right <= anchorRect.left;
    case "right":
      return rect.left >= anchorRect.right;
    default:
      return true;
  }
};

window.customElements.define(
  "ds-tooltip",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;

    static meta = {
      attributes: {
        position: ["top", "right", "bottom", "left"],
        clicktoopen: [""],
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
    #abortController;

    static FALLBACK_MAP = {
      top: ["bottom", "right", "left"],
      bottom: ["top", "right", "left"],
      left: ["right", "top", "bottom"],
      right: ["left", "top", "bottom"],
    };

    #handleShow = () => {
      clearTimeout(this.#hideTimeout);
      const delay = parseInt(this.delay || "500", 10);
      this.#showTimeout = setTimeout(() => {
        this.#tooltip.showPopover();
        this.#arrow.showPopover();
        this.#updatePosition();
        window.addEventListener("scroll", this.#updatePosition, {
          passive: true,
        });
        window.addEventListener("resize", this.#updatePosition, {
          passive: true,
        });
      }, delay);
    };

    #handleHide = () => {
      this.#tooltip.hidePopover();
      this.#arrow.hidePopover();
      window.removeEventListener("scroll", this.#updatePosition);
      window.removeEventListener("resize", this.#updatePosition);
    };

    #updatePosition = () => {
      const preferred = this.position || "top";
      const trials = [preferred, ...this.constructor.FALLBACK_MAP[preferred]];
      const anchorRect = this.#anchor.getBoundingClientRect();

      let finalPosition = preferred;
      for (const pos of trials) {
        this.#tooltip.style.setProperty("position-area", pos);
        const rect = this.#tooltip.getBoundingClientRect();

        if (rect.width === 0) continue;

        if (fitsInPosition(rect, anchorRect, pos)) {
          finalPosition = pos;
          break;
        }
      }
      this.#tooltip.style.setProperty("position-area", finalPosition);

      this.#arrow.classList.remove("top", "bottom", "left", "right");
      this.#arrow.classList.add(finalPosition);
    };

    #handleKeyDown = (e) => {
      if (e.key === "Escape") {
        this.#handleHide();
      }
    };

    #handleOutsideClick = (e) => {
      if (!this.clicktoopen || !this.#tooltip.matches(":popover-open")) return;

      const path = e.composedPath();
      if (!path.includes(this.#tooltip) && !path.includes(this.#anchor)) {
        this.#handleHide();
      }
    };

    #handleSlotChange = () => {
      const slot = this.shadowRoot.querySelector("slot:not([name])");
      const assigned = slot.assignedElements();
      const trigger = assigned.find((el) => el.nodeType === Node.ELEMENT_NODE);
      if (trigger && "ariaDescribedByElements" in trigger) {
        trigger.ariaDescribedByElements = [this.#tooltip];
      }
    };

    #setupListeners() {
      this.#abortController?.abort();
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;

      if (this.clicktoopen) {
        this.#anchor.addEventListener("click", this.#handleShow, { signal });
      } else {
        this.#anchor.addEventListener("mouseenter", this.#handleShow, {
          signal,
        });
        this.#anchor.addEventListener(
          "mouseleave",
          () => {
            clearTimeout(this.#showTimeout);
            this.#hideTimeout = setTimeout(() => {
              this.#handleHide();
            }, 200);
          },
          { signal },
        );
        this.#anchor.addEventListener("focusin", this.#handleShow, { signal });
        this.#anchor.addEventListener("focusout", this.#handleHide, { signal });
        this.#tooltip.addEventListener("mouseenter", this.#handleShow, {
          signal,
        });
        this.#tooltip.addEventListener("mouseleave", this.#handleHide, {
          signal,
        });
      }
    }

    handleStateChange(name, oldValue, newValue) {
      switch (name) {
        case "position":
          this.#tooltip.style.setProperty("position-area", newValue);
          this.#updatePosition();
          break;
        case "clicktoopen":
          this.#setupListeners();
          break;
      }
    }

    setup() {
      this.#setupListeners();
    }

    connectedCallback() {
      window.addEventListener("keydown", this.#handleKeyDown);
      window.addEventListener("click", this.#handleOutsideClick);
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      window.removeEventListener("keydown", this.#handleKeyDown);
      window.removeEventListener("click", this.#handleOutsideClick);
      window.removeEventListener("scroll", this.#updatePosition);
      window.removeEventListener("resize", this.#updatePosition);
    }

    constructor() {
      super();
      this.#anchor = this.shadowRoot.getElementById("anchor");
      this.#tooltip = this.shadowRoot.getElementById("tooltip");
      this.#arrow = this.shadowRoot.getElementById("arrow");

      const slot = this.shadowRoot.querySelector("slot:not([name])");
      slot.addEventListener("slotchange", this.#handleSlotChange);

      // Initial setup will be triggered by handleStateChange for clicktoopen
      // which is called during the deferred setupStateAndProperties.
    }
  },
);
