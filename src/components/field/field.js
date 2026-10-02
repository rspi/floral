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
  },
);
