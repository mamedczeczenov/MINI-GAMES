declare module "@astrojs/react" {
  // Minimal type declaration so that TypeScript can understand the
  // `@astrojs/react` integration import in `astro.config.mjs`.
  // At runtime you still need to install the real package:
  //   npm install @astrojs/react
  import type { AstroIntegration } from "astro";

  export default function reactIntegration(): AstroIntegration;
}


