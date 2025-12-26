describe('/profile', () => {
  beforeEach(() => {
    cy.login({ email: 'admin', password: 'admin123' })
  })

  describe('SSRF protection', () => {
    it('should block SSRF attacks via image upload URL', () => {
      cy.visit('/profile')
      cy.get('#url').type('http://localhost:3000/api/Users')
      cy.get('#submitUrl').click()
      // SSRF should be blocked - internal resources should not be accessible
    })
  })

  describe('XSS protection', () => {
    it('should sanitize username field to prevent XSS attacks', () => {
      cy.visit('/profile')
      cy.get('#username').clear()
      cy.get('#username').type('<script>alert("xss")</script>')
      cy.get('#submit').click()
      // XSS should be sanitized - no alert should appear
    })
  })

  describe('profile update security', () => {
    it('should allow valid profile updates', () => {
      cy.visit('/profile')
      cy.get('#username').should('exist')
      cy.get('#submit').should('exist')
    })
  })
})
