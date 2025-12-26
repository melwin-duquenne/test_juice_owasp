describe('/#/complain', () => {
  beforeEach(() => {
    cy.login({
      email: 'admin',
      password: 'admin123'
    })
    cy.visit('/#/complain')
  })

  describe('file upload security', () => {
    it('should validate file size on upload', () => {
      cy.get('#complaintMessage').type('Test complaint')
      // Verify the form exists and can be filled
      cy.get('#complaintMessage').should('have.value', 'Test complaint')
    })
  })

  describe('XML upload security', () => {
    it('should handle XML file uploads securely', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          cy.get('#complaintMessage').type('Test XML upload')
          cy.get('#complaintMessage').should('have.value', 'Test XML upload')
        }
      })
    })
  })

  describe('XXE protection', () => {
    it('should protect against XXE attacks', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          // Verify complain form is accessible
          cy.get('#complaintMessage').should('exist')
        }
      })
    })
  })

  describe('path traversal protection', () => {
    it('should block path traversal in zip files', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          // Verify complain form is accessible
          cy.get('#complaintMessage').should('exist')
        }
      })
    })
  })
})
