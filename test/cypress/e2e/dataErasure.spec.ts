describe('/dataerasure', () => {
  beforeEach(() => {
    cy.login({ email: 'admin', password: 'admin123' })
  })

  describe('security "lfr"', () => {
    it('should block local file read attack attempts', () => {
      cy.request({
        method: 'POST',
        url: '/dataerasure',
        headers: {
          'Content-type': 'application/x-www-form-urlencoded'
        },
        body: 'layout=../package.json',
        failOnStatusCode: false
      }).then((response) => {
        // Path traversal should be blocked
        expect(response.status).to.be.oneOf([400, 403, 500])
      })
    })
  })
})
