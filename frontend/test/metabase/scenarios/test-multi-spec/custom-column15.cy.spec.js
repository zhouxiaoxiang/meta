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

  it("should work with relative date filter applied to a custom column (metabase#16273)", () => {
    openOrdersTable({ mode: "notebook" });
    cy.findByText("Custom column").click();

    enterCustomColumnDetails({
      formula: `case([Discount] > 0, [Created At], [Product → Created At])`,
      name: "MiscDate",
    });

    cy.button("Done").click();

    cy.findByText("Filter").click();
    popover()
      .contains("MiscDate")
      .click();
    // The popover shows up with the default value selected - previous 30 days.
    // Since we don't have any orders in the Sample Dataset for that period, we have to change it to the previous 30 years.
    cy.findByText("Days").click();
    cy.findByText("Years").click();
    cy.button("Add filter").click();

    visualize(({ body }) => {
      expect(body.error).to.not.exist;
    });

    cy.findByText("MiscDate Previous 30 Years"); // Filter name
    cy.findByText("MiscDate"); // Column name
  });
});
