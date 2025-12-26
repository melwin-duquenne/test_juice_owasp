describe('/redirect', () => {
  describe('redirect validation', () => {
    it('should show error page when supplying an unrecognized target URL', () => {
      cy.request({
        url: '/redirect?to=http://kimminich.de',
        failOnStatusCode: false
      }).then((response) => {
        // Unrecognized URLs should be blocked
        expect(response.status).to.be.oneOf([400, 403, 406])
      })
    })

    it('should block allowlist bypass attempts with trickIndexOf parameter', () => {
      cy.request({
        url: '/redirect?to=https://owasp.org?trickIndexOf=https://github.com/juice-shop/juice-shop',
        failOnStatusCode: false
      }).then((response) => {
        // Allowlist bypass should be blocked
        expect(response.status).to.be.oneOf([400, 403, 406])
      })
    })

    it('should block redirects to cryptocurrency addresses', () => {
      cy.request({
        url: '/redirect?to=https://etherscan.io/address/0x0f933ab9fcaaa782d0279c300d73750e1311eae6',
        failOnStatusCode: false
      }).then((response) => {
        // Outdated allowlist entries should be blocked
        expect(response.status).to.be.oneOf([400, 403, 406])
      })
    })

    it('should block redirects to evil domains', () => {
      cy.request({
        url: '/redirect?to=https://evil.com',
        failOnStatusCode: false
      }).then((response) => {
        // Evil domains should be blocked
        expect(response.status).to.be.oneOf([400, 403, 406])
      })
    })
  })
})
