import { restore } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { ORDERS, ORDERS_ID, PRODUCTS } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it("should work with implicit joins (metabase#14080)", () => {
    const CC_NAME = "OneisOne";
    cy.signInAsAdmin();

    cy.createQuestion({
      name: "14080",
      query: {
        "source-table": ORDERS_ID,
        expressions: { [CC_NAME]: ["*", 1, 1] },
        aggregation: [
          [
            "distinct",
            [
              "fk->",
              ["field-id", ORDERS.PRODUCT_ID],
              ["field-id", PRODUCTS.ID],
            ],
          ],
          ["sum", ["expression", CC_NAME]],
        ],
        breakout: [["datetime-field", ["field-id", ORDERS.CREATED_AT], "year"]],
      },
      display: "line",
    }).then(({ body: { id: QUESTION_ID } }) => {
      cy.intercept("POST", `/api/card/${QUESTION_ID}/query`).as("cardQuery");

      cy.visit(`/question/${QUESTION_ID}`);

      cy.log("Regression since v0.37.1 - it works on v0.37.0");
      cy.wait("@cardQuery").then(xhr => {
        expect(xhr.response.body.error).not.to.exist;
      });
    });

    cy.contains(`Sum of ${CC_NAME}`);
    cy.get(".Visualization .dot").should("have.length.of.at.least", 8);
  });
});
