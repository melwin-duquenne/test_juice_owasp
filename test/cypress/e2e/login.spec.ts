describe('/#/login', () => {
  beforeEach(() => {
    cy.visit('/#/login')
  })

  describe('SQL injection protection', () => {
    it('should block SQL injection attack on email field using "\' or 1=1--"', () => {
      cy.get('#email').type("' or 1=1--")
      cy.get('#password').type('a')
      cy.get('#loginButton').click()
      // SQL injection should be blocked - user should not be logged in
      cy.url().should('include', '/login')
    })

    it('should block SQL injection with admin email bypass attempt', () => {
      cy.task<string>('GetFromConfig', 'application.domain').then(
        (appDomain: string) => {
          cy.get('#email').type(`admin@${appDomain}'--`)
          cy.get('#password').type('a')
          cy.get('#loginButton').click()
          // SQL injection should be blocked
          cy.url().should('include', '/login')
        }
      )
    })

    it('should block UNION SELECT injection attacks', () => {
      cy.get('#email').type(
        "' UNION SELECT * FROM (SELECT 15 as 'id', '' as 'username', 'test@test.com' as 'email')--"
      )
      cy.get('#password').type('a')
      cy.get('#loginButton').click()
      // UNION injection should be blocked
      cy.url().should('include', '/login')
    })

    it('should block deletedAt IS NOT NULL injection', () => {
      cy.get('#email').type("' or deletedAt IS NOT NULL--")
      cy.get('#password').type('a')
      cy.get('#loginButton').click()
      // Injection should be blocked
      cy.url().should('include', '/login')
    })
  })

  describe('valid login', () => {
    it('should allow login with valid admin credentials', () => {
      cy.task<string>('GetFromConfig', 'application.domain').then(
        (appDomain: string) => {
          cy.get('#email').type(`admin@${appDomain}`)
          cy.get('#password').type('admin123')
          cy.get('#loginButton').click()
          // Valid login should work
          cy.url().should('not.include', '/login')
        }
      )
    })
  })
})
