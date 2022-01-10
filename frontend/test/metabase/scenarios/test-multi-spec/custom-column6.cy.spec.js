import { restore } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { ORDERS, ORDERS_ID } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it("should be able to use custom expression after aggregation (metabase#13857)", () => {
    const CE_NAME = "13857_CE";
    const CC_NAME = "13857_CC";

    cy.signInAsAdmin();

    cy.createQuestion({
      name: "13857",
      query: {
        expressions: {
          [CC_NAME]: ["*", ["field-literal", CE_NAME, "type/Float"], 1234],
        },
        "source-query": {
          aggregation: [
            [
              "aggregation-options",
              ["*", 1, 1],
              { name: CE_NAME, "display-name": CE_NAME },
            ],
          ],
          breakout: [
            ["datetime-field", ["field-id", ORDERS.CREATED_AT], "month"],
          ],
          "source-table": ORDERS_ID,
        },
      },
    }).then(({ body: { id: QUESTION_ID } }) => {
      cy.intercept("POST", `/api/card/${QUESTION_ID}/query`).as("cardQuery");

      cy.visit(`/question/${QUESTION_ID}`);

      cy.log("Reported failing v0.34.3 through v0.37.2");
      cy.wait("@cardQuery").then(xhr => {
        expect(xhr.response.body.error).not.to.exist;
      });
    });

    cy.findByText(CC_NAME);
  });
});
