import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "public/sw.js",
      "public/workbox-*.js",
      "public/swe-worker-*.js"
    ]
  }
];

export default eslintConfig;
