"use client";

import { useEffect } from "react";

const PHANTOM_UI_SRC = "https://cdn.jsdelivr.net/npm/@aejkatappaja/phantom-ui@0.9.0/dist/phantom-ui.cdn.js";
const PHANTOM_UI_SCRIPT_ATTR = "data-phantom-ui-loader";

export function PhantomUiLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.customElements?.get("phantom-ui")) return;

    const existingScript = document.querySelector(`script[${PHANTOM_UI_SCRIPT_ATTR}="1"]`);
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = PHANTOM_UI_SRC;
    script.async = true;
    script.setAttribute(PHANTOM_UI_SCRIPT_ATTR, "1");
    document.head.appendChild(script);
  }, []);

  return null;
}

