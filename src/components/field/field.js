import sheet from "./field.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const focusedForms = new WeakSet();

function focusFirstInvalid(control, form) {
  if (!form) {
    control.focus();
    return;
  }

  if (!focusedForms.has(form)) {
    focusedForms.add(form);
    control.focus();
    queueMicrotask(() => {
      focusedForms.delete(form);
    });
  }
}

function isValuableControl(node) {
  return Boolean(node && "validity" in node && "validationMessage" in node);
}

function isSubmitTarget(el) {
  if (!el) return false;
  const btn = el.closest?.("button, ds-button, input[type='submit']");
  if (!btn) return false;
  const type = btn.type ?? btn.getAttribute?.("type") ?? "submit";
  return type === "submit";
}

const html = `
<div class="field-container">
  <div class="label-wrapper">
    <slot name="label"></slot>
  </div>
  <div class="control-wrapper">
    <slot></slot>
  </div>
  <div class="error-wrapper" aria-live="polite">
    <slot name="error"><span class="auto-error"></span></slot>
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
    #autoErrorEl;
    #isTouched = false;
    #autoErrorMessage = "";
    #form = null;

    #syncValidity(control) {
      if (!control.validity.valid) {
        this.#autoErrorMessage = control.validationMessage;
      } else {
        this.#autoErrorMessage = "";
      }
      this.#updateErrorState();
    }

    #handleInvalid = (e) => {
      if (isValuableControl(e.target)) {
        e.preventDefault();
        this.#isTouched = true;
        this.#autoErrorMessage = e.target.validationMessage;
        this.#updateErrorState();
        focusFirstInvalid(e.target, this.#form || this.closest("form"));
      }
    };

    #handleFocusOut = (e) => {
      // If focus moves to a submit button, skip blur validation so error expansion
      // does not cause a layout shift that aborts the pending submit click.
      if (isSubmitTarget(e.relatedTarget)) {
        return;
      }

      if (isValuableControl(e.target)) {
        this.#isTouched = true;
        this.#syncValidity(e.target);
      }
    };

    #handleInput = (e) => {
      if (isValuableControl(e.target) && this.#isTouched) {
        this.#syncValidity(e.target);
      }
    };

    #handleValid = (e) => {
      if (isValuableControl(e.target)) {
        this.#syncValidity(e.target);
      }
    };

    #handleFormReset = () => {
      this.#isTouched = false;
      this.#autoErrorMessage = "";
      this.#updateErrorState();
    };

    #updateErrorState = () => {
      const slottedNodes = this.#errorSlot.assignedNodes();
      const hasSlottedError = slottedNodes.length > 0;
      const hasAutoError = !hasSlottedError && Boolean(this.#autoErrorMessage);

      if (hasAutoError) {
        this.#autoErrorEl.textContent = this.#autoErrorMessage;
      } else {
        this.#autoErrorEl.textContent = "";
      }

      const hasError = hasSlottedError || hasAutoError;
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

      this.#form = this.closest("form");
      if (this.#form) {
        this.#form.addEventListener("reset", this.#handleFormReset);
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      if (this.#form) {
        this.#form.removeEventListener("reset", this.#handleFormReset);
        this.#form = null;
      }
    }

    constructor() {
      super();
      this.#errorSlot = this.shadowRoot.querySelector('slot[name="error"]');
      this.#autoErrorEl = this.shadowRoot.querySelector(".auto-error");
      this.#errorSlot.addEventListener("slotchange", this.#updateErrorState);

      this.addEventListener("invalid", this.#handleInvalid, { capture: true });
      this.addEventListener("focusout", this.#handleFocusOut);
      this.addEventListener("input", this.#handleInput);
      this.addEventListener("change", this.#handleInput);
      this.addEventListener("valid", this.#handleValid);
    }
  },
);
