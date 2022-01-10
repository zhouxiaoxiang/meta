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

  it("should not return same results for columns with the same name (metabase#12649)", () => {
    openOrdersTable({ mode: "notebook" });
    // join with Products
    cy.findByText("Join data").click();
    cy.findByText("Products").click();

    // add custom column
    cy.findByText("Custom column").click();
    enterCustomColumnDetails({ formula: "1 + 1", name: "x" });
    cy.button("Done").click();

    visualize();

    cy.log(
      "**Fails in 0.35.0, 0.35.1, 0.35.2, 0.35.4 and the latest master (2020-10-21)**",
    );
    cy.log("Works in 0.35.3");
    // ID should be "1" but it is picking the product ID and is showing "14"
    cy.get(".TableInteractive-cellWrapper--firstColumn")
      .eq(1) // the second cell from the top in the first column (the first one is a header cell)
      .findByText("1");
  });
});
