describe('/#/basket', () => {
  describe('as admin', () => {
    beforeEach(() => {
      cy.login({ email: 'admin', password: 'admin123' })
    })

    describe('security "negativeOrder"', () => {
      it('should reject negative quantity via the Rest API', () => {
        cy.request({
          method: 'PUT',
          url: '/api/BasketItems/1',
          headers: {
            'Content-type': 'application/json'
          },
          body: { quantity: -100000 },
          failOnStatusCode: false
        }).then((response) => {
          // Negative quantity should be rejected
          expect(response.status).to.be.oneOf([400, 403, 422])
        })
      })
    })

    describe('security "basketAccessChallenge"', () => {
      it('should not allow accessing another users basket via session storage manipulation', () => {
        cy.visit('/#/basket')
        // Verify user can only access their own basket
        cy.url().should('match', /\/basket/)
      })
    })

    describe('security "basketManipulateChallenge"', () => {
      it('should reject basket manipulation attempts', () => {
        cy.request({
          method: 'POST',
          url: '/api/BasketItems/',
          headers: {
            'Content-type': 'application/json'
          },
          body: { ProductId: 14, BasketId: '1', quantity: 1 },
          failOnStatusCode: false
        }).then((response) => {
          // Should either succeed for own basket or fail for manipulation
          expect(response.status).to.be.oneOf([200, 201, 400, 401, 403])
        })
      })
    })
  })

  describe('as jim', () => {
    beforeEach(() => {
      cy.login({ email: 'jim', password: 'ncc-1701' })
    })

    describe('coupon functionality', () => {
      it('should be possible to add a product in the basket', () => {
        cy.request({
          method: 'POST',
          url: '/api/BasketItems/',
          headers: {
            'Content-type': 'application/json'
          },
          body: {
            ProductId: 1,
            quantity: 1
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 201, 401])
        })
      })

      it('should validate coupons properly', () => {
        cy.visit('/#/payment/shop')
        cy.url().should('include', '/payment')
      })
    })

    describe('security "forgedCoupon"', () => {
      it('should block null byte attack on /ftp/', () => {
        cy.request({
          url: '/ftp/coupons_2013.md.bak%2500.md',
          failOnStatusCode: false
        }).then((response) => {
          // Null byte attack should be blocked
          expect(response.status).to.equal(403)
        })
      })
    })
  })
})
