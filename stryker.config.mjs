// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "command",
  commandRunner: {
    command: "npm test",
  },
  mutate: ["src/views/payment.tsx"],
  coverageAnalysis: "off",
};

export default config;