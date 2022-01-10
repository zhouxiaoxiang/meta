import { restore } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { PRODUCTS, PRODUCTS_ID } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it("should handle identical custom column and table column names (metabase#14255)", () => {
    // Uppercase is important for this reproduction on H2
    const CC_NAME = "CATEGORY";

    cy.createQuestion({
      name: "14255",
      query: {
        "source-table": PRODUCTS_ID,
        expressions: {
          [CC_NAME]: ["concat", ["field-id", PRODUCTS.CATEGORY], "2"],
        },
        aggregation: [["count"]],
        breakout: [["expression", CC_NAME]],
      },
    }).then(({ body: { id: QUESTION_ID } }) => {
      cy.visit(`/question/${QUESTION_ID}`);

      cy.findByText(CC_NAME);
      cy.findByText("Gizmo2");
    });
  });
});
