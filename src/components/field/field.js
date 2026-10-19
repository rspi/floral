import sheet from "./field.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
<div class="field-container">
  <div class="label-wrapper">
    <slot name="label"></slot>
  </div>
  <div class="control-wrapper">
    <slot></slot>
  </div>
  <div class="error-wrapper" aria-live="polite">
    <slot name="error"></slot>
  </div>
  <div class="helper-wrapper">
    <slot name="helper"></slot>
  </div>
</div>
`;

window.customElements.define(
  "ds-field",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;

    static meta = {
      attributes: {
        layout: ["vertical", "horizontal"],
      },
      slots: {
        default: "The form control.",
        label: "The label text or element.",
        error: "The error message element.",
        helper: "The helper or description text.",
      },
      parts: {},
      cssVariables: {
        "--ds-field-columns":
          "Grid column track definition in horizontal layout. Can be used for subgrid layouts",
      },
    };

    #errorSlot;

    #updateErrorState = () => {
      const hasError =
        this.#errorSlot.assignedNodes({ flatten: true }).length > 0;
      if (hasError) {
        this.internals.states.add("has-error");
      } else {
        this.internals.states.delete("has-error");
      }
    };

    setup() {
      this.#updateErrorState();
    }

    connectedCallback() {
      super.connectedCallback();
      this.#updateErrorState();
    }

    constructor() {
      super();
      this.#errorSlot = this.shadowRoot.querySelector('slot[name="error"]');
      this.#errorSlot.addEventListener("slotchange", this.#updateErrorState);
    }
  },
);
