import { restore } from "__support__/e2e/cypress";

describe("should fail", () => {
  beforeEach(() => {
    restore();
    cy.signInAsAdmin();
  });

  it(" (should fail)", () => {
    cy.findByText("Hi", { timeout: 100 });
  });
});
