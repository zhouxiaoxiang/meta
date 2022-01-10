import { restore } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { ORDERS, ORDERS_ID } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it.skip("should create custom column after aggregation with 'cum-sum/count' (metabase#13634)", () => {
    cy.createQuestion({
      name: "13634",
      query: {
        expressions: { "Foo Bar": ["+", 57910, 1] },
        "source-query": {
          aggregation: [["cum-count"]],
          breakout: [
            ["datetime-field", ["field-id", ORDERS.CREATED_AT], "month"],
          ],
          "source-table": ORDERS_ID,
        },
      },
    }).then(({ body: { id: questionId } }) => {
      cy.visit(`/question/${questionId}`);
      cy.findByText("13634");

      cy.log("Reported failing in v0.34.3, v0.35.4, v0.36.8.2, v0.37.0.2");
      cy.findByText("Foo Bar");
      cy.findAllByText("57911");
    });
  });
});
