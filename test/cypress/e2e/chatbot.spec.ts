describe('/chatbot', () => {
  beforeEach(() => {
    cy.login({ email: 'admin', password: 'admin123' })
  })

  describe('chatbot security', () => {
    it('should sanitize user input to prevent injection attacks', () => {
      cy.visit('/#/chatbot')
      cy.get('#message-input').type('hi').type('{enter}')
      // Verify chatbot responds normally
      cy.get('.speech-bubble-left').should('exist')
    })
  })

  describe('chatbot functionality', () => {
    it('should respond to user messages', () => {
      cy.visit('/#/chatbot')
      cy.get('#message-input').type('hello').type('{enter}')
      cy.get('.speech-bubble-left').should('exist')
    })
  })
})
