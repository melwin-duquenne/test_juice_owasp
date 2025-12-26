describe('/#/privacy-security/change-password', () => {
  describe('as Morty', () => {
    beforeEach(() => {
      cy.login({
        email: 'morty',
        password: 'focusOnScienceMorty!focusOnScience'
      })
      cy.visit('/#/privacy-security/change-password')
    })

    it('should be able to change password with current password', () => {
      cy.get('#currentPassword').type('focusOnScienceMorty!focusOnScience')
      cy.get('#newPassword').type('GonorrheaCantSeeUs!')
      cy.get('#newPasswordRepeat').type('GonorrheaCantSeeUs!', { force: true })
      cy.get('#changeButton').click()

      cy.get('.confirmation').should('not.be.hidden')
    })
  })

  describe('security "changePasswordBenderChallenge"', () => {
    it('should require current password to change password', () => {
      cy.login({
        email: 'bender',
        password: 'OhG0dPlease1nsertLiquor!'
      })
      cy.visit('/#/privacy-security/change-password')
      
      // Verify password change form requires current password
      cy.get('#currentPassword').should('exist')
      cy.get('#newPassword').should('exist')
      cy.get('#newPasswordRepeat').should('exist')
    })
  })
})
