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

  it("can create a custom column (metabase#13241)", () => {
    openOrdersTable({ mode: "notebook" });
    cy.icon("add_data").click();

    enterCustomColumnDetails({ formula: "1 + 1", name: "Math" });
    cy.button("Done").click();

    visualize();

    cy.findByText("There was a problem with your question").should("not.exist");
    cy.get(".Visualization").contains("Math");
  });
});
