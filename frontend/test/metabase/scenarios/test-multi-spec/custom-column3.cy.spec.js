import {
  restore,
  visualize,
  openOrdersTable,
  enterCustomColumnDetails,
} from "__support__/e2e/cypress";

describe("scenarios > question > custom column", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/dataset").as("dataset");

    restore();
    cy.signInAsNormalUser();
  });

  it("can create a custom column with an existing column name", () => {
    const customFormulas = [
      {
        formula: "[Quantity] * 2",
        name: "Double Qt",
      },
      {
        formula: "[Quantity] * [Product.Price]",
        name: "Sum Total",
      },
    ];

    customFormulas.forEach(({ formula, name }) => {
      openOrdersTable({ mode: "notebook" });
      cy.icon("add_data").click();

      enterCustomColumnDetails({ formula, name });
      cy.button("Done").click();

      visualize();

      cy.get(".Visualization").contains(name);
    });
  });
});
