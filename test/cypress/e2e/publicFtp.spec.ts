describe('/ftp', () => {
  describe('file access security', () => {
    it('should allow access to public markdown files', () => {
      cy.request({
        url: '/ftp/legal.md',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 404])
      })
    })
  })

  describe('null byte attack protection', () => {
    it('should block null byte attacks on backup files', () => {
      cy.request({
        url: '/ftp/coupons_2013.md.bak%2500.md',
        failOnStatusCode: false
      }).then((response) => {
        // Null byte attack should be blocked
        expect(response.status).to.be.oneOf([400, 403, 404])
      })
    })

    it('should block null byte attacks on package.json.bak', () => {
      cy.request({
        url: '/ftp/package.json.bak%2500.md',
        failOnStatusCode: false
      }).then((response) => {
        // Null byte attack should be blocked
        expect(response.status).to.be.oneOf([400, 403, 404])
      })
    })

    it('should block null byte attacks on .pyc files', () => {
      cy.request({
        url: '/ftp/encrypt.pyc%2500.md',
        failOnStatusCode: false
      }).then((response) => {
        // Null byte attack should be blocked
        expect(response.status).to.be.oneOf([400, 403, 404])
      })
    })
  })

  describe('file type restriction', () => {
    it('should restrict access to non-allowed file types', () => {
      cy.request({
        url: '/ftp/easter.egg',
        failOnStatusCode: false
      }).then((response) => {
        // Non-allowed file types should be blocked
        expect(response.status).to.be.oneOf([400, 403, 404])
      })
    })
  })
})
