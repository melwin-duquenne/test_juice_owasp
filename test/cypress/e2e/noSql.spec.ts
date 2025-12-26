describe('/rest/products/reviews', () => {
  beforeEach(() => {
    cy.visit('/#/search')
  })

  describe('NoSQL injection protection', () => {
    beforeEach(() => {
      cy.login({ email: 'admin', password: 'admin123' })
    })

    it('should block NoSQL injection command in get route', () => {
      cy.window().then(() => {
        cy.request({
          method: 'GET',
          url: '/rest/products/sleep(1000)/reviews',
          failOnStatusCode: false
        }).then((response) => {
          // NoSQL injection should be blocked
          expect(response.status).to.be.oneOf([400, 403, 404, 500])
        })
      })
    })

    it('should block NoSQL selector injection in update route', () => {
      cy.request({
        method: 'PATCH',
        url: '/rest/products/reviews',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          id: { $ne: -1 },
          message: 'NoSQL Injection!'
        }),
        failOnStatusCode: false
      }).then((response) => {
        // NoSQL injection should be blocked
        expect(response.status).to.be.oneOf([400, 401, 403, 500])
      })
    })
  })

  describe('review security', () => {
    beforeEach(() => {
      cy.login({ email: 'admin', password: 'admin123' })
    })

    it('should allow viewing reviews for a product', () => {
      cy.request({
        method: 'GET',
        url: '/rest/products/1/reviews',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 404])
      })
    })
  })
})

describe('/rest/track-order', () => {
  describe('NoSQL exfiltration protection', () => {
    it('should block NoSQL injection in order tracking', () => {
      cy.request({
        method: 'GET',
        url: "/rest/track-order/%27%20%7C%7C%20true%20%7C%7C%20%27",
        failOnStatusCode: false
      }).then((response) => {
        // NoSQL injection should be blocked
        expect(response.status).to.be.oneOf([400, 403, 404, 500])
      })
    })
  })
})
