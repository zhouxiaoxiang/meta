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

  // flaky test (#19454)
  it.skip("should show info popovers when hovering over custom column dimensions in the summarize sidebar", () => {
    openOrdersTable({ mode: "notebook" });
    cy.icon("add_data").click();

    enterCustomColumnDetails({ formula: "1 + 1", name: "Math" });
    cy.button("Done").click();

    visualize();

    cy.findAllByText("Summarize")
      .first()
      .click();
    cy.findByText("Group by")
      .parent()
      .findByText("Math")
      .trigger("mouseenter");

    popover().contains("Math");
    popover().contains("No description");
  });
});
