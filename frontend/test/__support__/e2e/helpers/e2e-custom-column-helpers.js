export function enterCustomColumnDetails({ formula, name } = {}) {
  cy.get(".ace_text-input")
    .focus()
    .first()
    .as("formula")
    .focus()
    .type(formula);

  if (name) {
    cy.findByPlaceholderText("Something nice and descriptive").type(name);
  }
}
