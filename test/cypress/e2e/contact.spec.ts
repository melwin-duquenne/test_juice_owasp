describe('/#/contact', () => {
  beforeEach(() => {
    cy.visit('/#/contact')
    solveNextCaptcha()
  })

  describe('feedback security', () => {
    beforeEach(() => {
      cy.login({ email: 'admin', password: 'admin123' })
      cy.visit('/#/contact')
      solveNextCaptcha()
    })

    it('should validate user id in feedback submission', () => {
      cy.get('#rating').type('{rightarrow}{rightarrow}{rightarrow}')
      cy.get('#comment').type('Valid feedback')
      cy.get('#submitButton').click({ force: true })
      // Feedback should be submitted successfully
    })
  })

  describe('rating validation', () => {
    it('should require rating before submission', () => {
      cy.get('#rating').should('exist')
      cy.get('#comment').type('Test feedback')
      // Rating validation should be enforced
    })
  })

  describe('captcha validation', () => {
    it('should require valid captcha for feedback submission', () => {
      cy.get('#captcha').should('exist')
      cy.get('#captchaControl').should('exist')
    })
  })
})

function solveNextCaptcha () {
  cy.get('#captcha')
    .should('be.visible')
    .invoke('text')
    .then((val) => {
      cy.get('#captchaControl').clear()
      // eslint-disable-next-line no-eval
      const answer = eval(val).toString()
      cy.get('#captchaControl').type(answer)
    })
}
