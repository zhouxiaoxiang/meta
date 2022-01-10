import {
  restore,
  popover,
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

  it("should create custom column with fields from aggregated data (metabase#12762)", () => {
    openOrdersTable({ mode: "notebook" });

    cy.findByText("Summarize").click();

    popover().within(() => {
      cy.findByText("Sum of ...").click();
      cy.findByText("Subtotal").click();
    });

    // TODO: There isn't a single unique parent that can be used to scope this icon within
    // (a good candidate would be `.NotebookCell`)
    cy.icon("add")
      .last() // This is brittle.
      .click();

    popover().within(() => {
      cy.findByText("Sum of ...").click();
      cy.findByText("Total").click();
    });

    cy.findByText("Pick a column to group by").click();
    cy.findByText("Created At").click();

    // Add custom column based on previous aggregates
    const columnName = "MegaTotal";
    cy.findByText("Custom column").click();

    enterCustomColumnDetails({
      formula: "[Sum of Subtotal] + [Sum of Total]",
      name: columnName,
    });
    cy.button("Done").click();

    visualize();

    cy.findByText("There was a problem with your question").should("not.exist");
    // This is a pre-save state of the question but the column name should appear
    // both in tabular and graph views (regardless of which one is currently selected)
    cy.get(".Visualization").contains(columnName);
  });
});
