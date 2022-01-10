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

  it.skip("should work with `isNull` function (metabase#15922)", () => {
    openOrdersTable({ mode: "notebook" });
    cy.findByText("Custom column").click();
    enterCustomColumnDetails({
      formula: `isnull([Discount])`,
      name: "No discount",
    });
    cy.button("Done").click();

    visualize(response => {
      expect(response.body.error).to.not.exist;
    });

    cy.contains("37.65");
    cy.findByText("No discount");
  });
});
