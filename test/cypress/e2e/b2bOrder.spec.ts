describe('/b2b/v2/order', () => {
  describe('RCE protection "rce"', () => {
    it('should block infinite loop deserialization payload', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          cy.login({ email: 'admin', password: 'admin123' })

          cy.request({
            method: 'POST',
            url: '/b2b/v2/orders/',
            headers: {
              'Content-type': 'application/json'
            },
            body: {
              orderLinesData: '(function dos() { while(true); })()'
            },
            failOnStatusCode: false
          }).then((response) => {
            // RCE attack should be blocked
            expect(response.status).to.be.oneOf([400, 403, 500])
          })
        }
      })
    })
  })

  describe('RCE protection "rceOccupy"', () => {
    it('should block recursive regular expression payload', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          cy.login({ email: 'admin', password: 'admin123' })
          cy.request({
            method: 'POST',
            url: '/b2b/v2/orders/',
            headers: {
              'Content-type': 'application/json'
            },
            body: {
              orderLinesData: "/((a+)+)b/.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa')"
            },
            failOnStatusCode: false
          }).then((response) => {
            // RCE attack should be blocked
            expect(response.status).to.be.oneOf([400, 403, 500, 503])
          })
        }
      })
    })
  })
})
