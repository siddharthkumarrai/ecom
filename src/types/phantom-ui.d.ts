import type React from "react";

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "phantom-ui": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        loading?: boolean | "";
        animation?: "shimmer" | "pulse" | "breathe" | "solid" | string;
        reveal?: number | string;
        count?: number | string;
      };
    }
  }
}

