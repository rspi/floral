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
    #hostController;
    #positionController;
    #observer;
    #trigger;
    #defaultSlot;
    #contentSlot;

    static FALLBACK_MAP = {
      top: ["bottom", "right", "left"],
      bottom: ["top", "right", "left"],
      left: ["right", "top", "bottom"],
      right: ["left", "top", "bottom"],
    };

    #updateDescription = () => {
      const nodes = this.#contentSlot.assignedNodes({ flatten: true });
      const text = nodes
        .map((n) => n.textContent)
        .join(" ")
        .trim();
      this.internals.ariaLabel = text;
    };

    #handleShow = () => {
      clearTimeout(this.#hideTimeout);
      const delay = parseInt(this.delay || "500", 10);
      this.#showTimeout = setTimeout(() => {
        this.#tooltip.showPopover();
        this.#arrow.showPopover();
        this.#updatePosition();

        this.#positionController?.abort();
        this.#positionController = new AbortController();
        const { signal } = this.#positionController;

        window.addEventListener("scroll", this.#updatePosition, {
          passive: true,
          signal,
        });
        window.addEventListener("resize", this.#updatePosition, {
          passive: true,
          signal,
        });
      }, delay);
    };

    #handleHide = () => {
      this.#tooltip.hidePopover();
      this.#arrow.hidePopover();
      this.#positionController?.abort();
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
      const assigned = this.#defaultSlot.assignedElements();
      const trigger = assigned.find((el) => el.nodeType === Node.ELEMENT_NODE);

      if (this.#trigger && "ariaDescribedByElements" in this.#trigger) {
        this.#trigger.ariaDescribedByElements = [];
      }

      this.#trigger = trigger;

      if (trigger && "ariaDescribedByElements" in trigger) {
        trigger.ariaDescribedByElements = [this];
      }

      this.#updateDescription();

      this.#observer?.disconnect();
      this.#observer = new MutationObserver(this.#updateDescription);

      const assignedNodes = this.#contentSlot.assignedNodes();

      for (const node of assignedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.#observer.observe(node, {
            childList: true,
            characterData: true,
            subtree: true,
          });
        }
      }

      this.#observer.observe(this.#contentSlot, { childList: true });
    };

    #setupListeners() {
      this.#hostController?.abort();
      this.#hostController = new AbortController();
      const { signal } = this.#hostController;

      window.addEventListener("keydown", this.#handleKeyDown, { signal });
      window.addEventListener("click", this.#handleOutsideClick, { signal });

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
      this.#setupListeners();
    }

    disconnectedCallback() {
      this.#hostController?.abort();
      this.#positionController?.abort();
      this.#observer?.disconnect();
      if (this.#trigger && "ariaDescribedByElements" in this.#trigger) {
        this.#trigger.ariaDescribedByElements = [];
      }
    }

    constructor() {
      super();
      this.internals.role = "tooltip";
      this.#anchor = this.shadowRoot.getElementById("anchor");
      this.#tooltip = this.shadowRoot.getElementById("tooltip");
      this.#arrow = this.shadowRoot.getElementById("arrow");
      this.#defaultSlot = this.shadowRoot.querySelector("slot:not([name])");
      this.#contentSlot = this.shadowRoot.querySelector('slot[name="content"]');

      this.#defaultSlot.addEventListener("slotchange", this.#handleSlotChange);
      this.#contentSlot.addEventListener("slotchange", this.#handleSlotChange);
    }
  },
);
