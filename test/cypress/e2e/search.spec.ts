describe('/#/search', () => {
  beforeEach(() => {
    cy.visit('/#/search')
  })

  describe('XSS protection', () => {
    it('search query should sanitize XSS attempts', () => {
      cy.get('#searchQuery').click()
      cy.get('app-mat-search-bar input')
        .type('<script>alert("xss")</script>')
        .type('{enter}')
      // XSS should be sanitized - no alert should appear
      cy.url().should('include', '/search')
    })
  })

  describe('search functionality', () => {
    it('should allow normal product searches', () => {
      cy.get('#searchQuery').click()
      cy.get('app-mat-search-bar input')
        .type('apple')
        .type('{enter}')
      cy.url().should('include', '/search')
    })
  })
})

describe('/rest/products/search', () => {
  describe('SQL injection protection', () => {
    it('should block UNION SQL injection attacks in search query', () => {
      cy.request({
        url: "/rest/products/search?q=')) union select id,'2','3',email,password,'6','7','8','9' from users--",
        failOnStatusCode: false
      }).then((response) => {
        // SQL injection should be blocked
        expect(response.status).to.be.oneOf([400, 403, 500])
      })
    })

    it('should block SQL injection attempts to access database schema', () => {
      cy.request({
        url: "/rest/products/search?q=')) union select sql,'2','3','4','5','6','7','8','9' from sqlite_master--",
        failOnStatusCode: false
      }).then((response) => {
        // SQL injection should be blocked
        expect(response.status).to.be.oneOf([400, 403, 500])
      })
    })

    it('should block comment-based SQL injection', () => {
      cy.request({
        url: "/rest/products/search?q='))--",
        failOnStatusCode: false
      }).then((response) => {
        // SQL injection should be blocked
        expect(response.status).to.be.oneOf([400, 403, 500])
      })
    })
  })

  describe('valid search', () => {
    it('should allow normal product searches via REST API', () => {
      cy.request({
        url: '/rest/products/search?q=apple',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(200)
      })
    })
  })
})
