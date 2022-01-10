import { restore, visitQuestionAdhoc } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { ORDERS, ORDERS_ID, PRODUCTS } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it("should handle using `case()` when referencing the same column names (metabase#14854)", () => {
    const CC_NAME = "CE with case";

    visitQuestionAdhoc({
      dataset_query: {
        type: "query",
        query: {
          "source-table": ORDERS_ID,
          expressions: {
            [CC_NAME]: [
              "case",
              [
                [
                  [">", ["field", ORDERS.DISCOUNT, null], 0],
                  ["field", ORDERS.CREATED_AT, null],
                ],
              ],
              {
                default: [
                  "field",
                  PRODUCTS.CREATED_AT,
                  { "source-field": ORDERS.PRODUCT_ID },
                ],
              },
            ],
          },
        },
        database: 1,
      },
      display: "table",
    });

    cy.wait("@dataset").should(xhr => {
      expect(xhr.response.body.error).not.to.exist;
    });

    cy.findByText(CC_NAME);
    cy.contains("37.65");
  });
});
