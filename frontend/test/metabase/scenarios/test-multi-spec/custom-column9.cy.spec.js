import { restore } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { ORDERS, ORDERS_ID } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it.skip("should not be dropped if filter is changed after aggregation (metaabase#14193)", () => {
    const CC_NAME = "Double the fun";

    cy.createQuestion({
      name: "14193",
      query: {
        "source-query": {
          "source-table": ORDERS_ID,
          filter: [">", ["field-id", ORDERS.SUBTOTAL], 0],
          aggregation: [["sum", ["field-id", ORDERS.TOTAL]]],
          breakout: [
            ["datetime-field", ["field-id", ORDERS.CREATED_AT], "year"],
          ],
        },
        expressions: {
          [CC_NAME]: ["*", ["field-literal", "sum", "type/Float"], 2],
        },
      },
    }).then(({ body: { id: QUESTION_ID } }) => {
      cy.visit(`/question/${QUESTION_ID}`);

      // Test displays collapsed filter - click on number 1 to expand and show the filter name
      cy.icon("filter")
        .parent()
        .contains("1")
        .click();

      cy.findByText(/Subtotal is greater than 0/i)
        .parent()
        .find(".Icon-close")
        .click();

      cy.findByText(CC_NAME);
    });
  });
});
