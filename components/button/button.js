import sheet from "./button.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
  <button>
    <slot name="start"></slot>
    <div><slot></slot></div>
    <slot name="end"></slot>
  </button>
  `;

window.customElements.define(
  "ds-button",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;
    static formAssociated = true;
    static delegatesFocus = true;

    static meta = {
      attributes: {
        disabled: [""],
        variant: ["default", "primary", "negative"],
        type: ["submit", "reset", "button"],
      },
      slots: {
        default: "The button content.",
        start: "Content at the start of button text. Typically used for icons.",
        end: "Content at the end of button text. Typically used for icons.",
      },
      parts: {},
      cssVariables: {},
    };

    #button;
    #internals;

    #handleSubmit = () => {
      const form = this.#internals.form;
      if (form) {
        const submitter = document.createElement("button");
        submitter.type = "submit";
        submitter.style.display = "none";
        const name = this.getAttribute("name");
        const value = this.getAttribute("value");
        if (name) submitter.name = name;
        if (value) submitter.value = value;
        form.appendChild(submitter);
        submitter.click();
        submitter.remove();
      }
    };

    #handleReset = () => {
      this.#internals.form?.reset();
    };

    #handleClick = (_) => {
      const type = this.type ?? "submit";
      if (type === "submit") {
        this.#handleSubmit();
      } else if (type === "reset") {
        this.#handleReset();
      }
    };

    formDisabledCallback(disabled) {
      if (disabled) {
        this.#button.setAttribute("disabled", "");
        this.#internals.ariaDisabled = "true";
      } else {
        this.#button.removeAttribute("disabled");
        this.#internals.ariaDisabled = "false";
      }
    }

    constructor() {
      super();
      this.#internals = this.attachInternals();
      this.#internals.role = "button";
      this.#button = this.shadowRoot.querySelector("button");
      this.addEventListener("click", this.#handleClick);
    }
  },
);