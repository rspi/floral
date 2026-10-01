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
        helper: "The helper or description text.",
      },
      parts: {},
      cssVariables: {},
    };

    #lastLabel = null;
    #lastControl = null;

    #handleLabelClick = () => {
      if (
        this.#lastControl &&
        !this.#lastControl.matches?.(":disabled") &&
        !this.#lastControl.disabled &&
        !this.#lastControl.hasAttribute?.("disabled") &&
        typeof this.#lastControl.focus === "function"
      ) {
        this.#lastControl.focus();
      }
    };

    #syncRelationships = () => {
      const labelSlot = this.shadowRoot.querySelector('slot[name="label"]');
      const helperSlot = this.shadowRoot.querySelector('slot[name="helper"]');
      const controlSlot = this.shadowRoot.querySelector("slot:not([name])");

      if (!labelSlot || !helperSlot || !controlSlot) return;

      const label = labelSlot.assignedElements()[0];
      const helper = helperSlot.assignedElements()[0];
      const control = controlSlot.assignedElements()[0];

      if (this.#lastLabel !== label) {
        if (this.#lastLabel) {
          this.#lastLabel.removeEventListener("click", this.#handleLabelClick);
        }
        if (label) {
          label.addEventListener("click", this.#handleLabelClick);
        }
        this.#lastLabel = label;
      }

      if (this.#lastControl !== control) {
        if (this.#lastControl) {
          this.#lastControl.ariaLabelledByElements = [];
          this.#lastControl.ariaDescribedByElements = [];
        }
        this.#lastControl = control;
      }

      if (control) {
        control.ariaLabelledByElements = label ? [label] : [];
        control.ariaDescribedByElements = helper ? [helper] : [];
      }
    };

    setup() {
      const labelSlot = this.shadowRoot.querySelector('slot[name="label"]');
      const helperSlot = this.shadowRoot.querySelector('slot[name="helper"]');
      const controlSlot = this.shadowRoot.querySelector("slot:not([name])");

      if (labelSlot && helperSlot && controlSlot) {
        labelSlot.addEventListener("slotchange", this.#syncRelationships);
        helperSlot.addEventListener("slotchange", this.#syncRelationships);
        controlSlot.addEventListener("slotchange", this.#syncRelationships);
      }

      this.#syncRelationships();
    }

    disconnectedCallback() {
      if (this.#lastLabel) {
        this.#lastLabel.removeEventListener("click", this.#handleLabelClick);
      }
      if (this.#lastControl) {
        this.#lastControl.ariaLabelledByElements = [];
        this.#lastControl.ariaDescribedByElements = [];
      }
    }
  },
);
