describe('/#/privacy-security/data-export', () => {
  describe('data export security', () => {
    beforeEach(() => {
      cy.visit('/#/register')

      cy.task<string>('GetFromConfig', 'application.domain').then(
        (appDomain: string) => {
          cy.get('#emailControl').type(`testuser@${appDomain}`)
        }
      )
      cy.get('#passwordControl').type('testpass123')
      cy.get('#repeatPasswordControl').type('testpass123')

      cy.get('mat-select[name="securityQuestion"]').click()
      cy.get('.mat-mdc-option')
        .contains('Your eldest siblings middle name?')
        .click()

      cy.get('#securityAnswerControl').type('testanswer')
      cy.get('#registerButton').click()
    })

    it('should allow users to export their own data', () => {
      cy.login({ email: 'testuser', password: 'testpass123' })
      cy.visit('/#/privacy-security/data-export')
      cy.get('#formatControl').should('exist')
    })
  })
})
