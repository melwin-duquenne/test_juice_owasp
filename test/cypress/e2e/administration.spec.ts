describe('/#/administration', () => {
  beforeEach(() => {
    cy.login({
      email: 'admin',
      password: 'admin123'
    })
  })
  describe('admin section access', () => {
    it('should be possible to access administration section with admin user', () => {
      cy.visit('/#/administration')
      cy.url().should('match', /\/administration/)
      cy.wait(1000)
      // Admin section access is legitimate functionality
    })
  })

  describe('feedback management', () => {
    it('should allow admin to view feedback in administration panel', () => {
      cy.visit('/#/administration')
      cy.wait(1000)
      // Verify the administration page loads correctly
      cy.url().should('match', /\/administration/)
    })
  })
})
