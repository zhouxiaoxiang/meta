import { restore, visualize } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { ORDERS, ORDERS_ID, PRODUCTS, PRODUCTS_ID } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it.skip("should drop custom column (based on a joined field) when a join is removed (metabase#14775)", () => {
    const CE_NAME = "Rounded price";

    cy.createQuestion({
      name: "14775",
      query: {
        "source-table": ORDERS_ID,
        joins: [
          {
            fields: "all",
            "source-table": PRODUCTS_ID,
            condition: [
              "=",
              ["field-id", ORDERS.PRODUCT_ID],
              ["joined-field", "Products", ["field-id", PRODUCTS.ID]],
            ],
            alias: "Products",
          },
        ],
        expressions: {
          [CE_NAME]: [
            "ceil",
            ["joined-field", "Products", ["field-id", PRODUCTS.PRICE]],
          ],
        },
      },
    }).then(({ body: { id: QUESTION_ID } }) => {
      cy.visit(`/question/${QUESTION_ID}/notebook`);
    });

    // Remove join
    cy.findByText("Join data")
      .parent()
      .find(".Icon-close")
      .click({ force: true }); // x is hidden and hover doesn't work so we have to force it
    cy.findByText("Join data").should("not.exist");

    cy.log("Reported failing on 0.38.1-SNAPSHOT (6d77f099)");
    cy.get("[class*=NotebookCellItem]")
      .contains(CE_NAME)
      .should("not.exist");

    visualize(response => {
      expect(response.body.error).to.not.exist;
    });

    cy.contains("37.65");
  });
});
