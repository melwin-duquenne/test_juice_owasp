describe('/', () => {
  describe('JWT security "jwtUnsigned"', () => {
    it('should reject unsigned JWT tokens', () => {
      cy.request({
        url: '/rest/user/whoami',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJkYXRhIjp7ImVtYWlsIjoiand0bjNkQGp1aWNlLXNoLm9wIn0sImlhdCI6MTUwODYzOTYxMiwiZXhwIjo5OTk5OTk5OTk5fQ.'
        },
        failOnStatusCode: false
      }).then((response) => {
        // Unsigned tokens should be rejected
        expect(response.status).to.be.oneOf([401, 403])
      })
    })
  })

  describe('JWT security "jwtForged"', () => {
    it('should accept valid signed JWT tokens', () => {
      cy.login({ email: 'admin', password: 'admin123' })
      cy.request({
        url: '/rest/user/whoami'
      }).then((response) => {
        expect(response.status).to.equal(200)
      })
    })
  })
})
