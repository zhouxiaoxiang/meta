import { restore, popover } from "__support__/e2e/cypress";

import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { ORDERS_ID } = SAMPLE_DATASET;

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it.skip("should handle brackets in the name of the custom column (metabase#15316)", () => {
    cy.createQuestion({
      name: "15316",
      query: {
        "source-table": ORDERS_ID,
        expressions: { "MyCC [2021]": ["+", 1, 1] },
      },
    }).then(({ body: { id: QUESTION_ID } }) => {
      cy.visit(`/question/${QUESTION_ID}/notebook`);
    });
    cy.findByText("Summarize").click();
    cy.findByText("Sum of ...").click();
    popover()
      .findByText("MyCC [2021]")
      .click();
    cy.get("[class*=NotebookCellItem]")
      .contains("Sum of MyCC [2021]")
      .click();
    popover().within(() => {
      cy.icon("chevronleft").click();
      cy.findByText("Custom Expression").click();
    });
    cy.get("[contenteditable='true']").contains("Sum([MyCC [2021]])");
  });
});
