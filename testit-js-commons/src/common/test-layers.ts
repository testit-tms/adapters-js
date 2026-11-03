/** Recommended autotest pyramid layer names (not enforced). */
export const TestLayers = {
  E2E: "E2E",
  UI: "UI",
  API: "API",
  CONTRACT: "Contract",
  INTEGRATION: "Integration",
  COMPONENT: "Component",
  UNIT: "Unit",
} as const;

export type TestLayerName = (typeof TestLayers)[keyof typeof TestLayers] | string;
