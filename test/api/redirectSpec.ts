/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as frisby from 'frisby'

const URL = 'http://localhost:3000'

describe('/redirect', () => {
  it('GET redirected to https://github.com/juice-shop/juice-shop when this URL is passed as "to" parameter', () => {
    return frisby.get(`${URL}/redirect?to=https://github.com/juice-shop/juice-shop`, { redirect: 'manual' })
      .expect('status', 302)
  })

  it('GET redirected to https://blockchain.info/address/1AbKfgvw9psQ41NbLi8kufDQTezwG8DRZm when this URL is passed as "to" parameter', () => {
    return frisby.get(`${URL}/redirect?to=https://blockchain.info/address/1AbKfgvw9psQ41NbLi8kufDQTezwG8DRZm`, { redirect: 'manual' })
      .expect('status', 302)
  })

  it('GET redirected to http://shop.spreadshirt.com/juiceshop when this URL is passed as "to" parameter', () => {
    return frisby.get(`${URL}/redirect?to=http://shop.spreadshirt.com/juiceshop`, { redirect: 'manual' })
      .expect('status', 302)
  })

  it('GET redirected to http://shop.spreadshirt.de/juiceshop when this URL is passed as "to" parameter', () => {
    return frisby.get(`${URL}/redirect?to=http://shop.spreadshirt.de/juiceshop`, { redirect: 'manual' })
      .expect('status', 302)
  })

  it('GET redirected to https://www.stickeryou.com/products/owasp-juice-shop/794 when this URL is passed as "to" parameter', () => {
    return frisby.get(`${URL}/redirect?to=https://www.stickeryou.com/products/owasp-juice-shop/794`, { redirect: 'manual' })
      .expect('status', 302)
  })

  it('GET redirected to https://explorer.dash.org/address/Xr556RzuwX6hg5EGpkybbv5RanJoZN17kW when this URL is passed as "to" parameter', () => {
    return frisby.get(`${URL}/redirect?to=https://explorer.dash.org/address/Xr556RzuwX6hg5EGpkybbv5RanJoZN17kW`, { redirect: 'manual' })
      .expect('status', 302)
  })

  it('GET redirected to https://etherscan.io/address/0x0f933ab9fcaaa782d0279c300d73750e1311eae6 when this URL is passed as "to" parameter', () => {
    return frisby.get(`${URL}/redirect?to=https://etherscan.io/address/0x0f933ab9fcaaa782d0279c300d73750e1311eae6`, { redirect: 'manual' })
      .expect('status', 302)
  })

  // Security: No information leakage when calling without proper parameters
  it('GET 400 error without information leakage when calling /redirect without query parameter', () => {
    return frisby.get(`${URL}/redirect`)
      .expect('status', 400)
  })

  it('GET 400 error without information leakage when calling /redirect with unrecognized query parameter', () => {
    return frisby.get(`${URL}/redirect?x=y`)
      .expect('status', 400)
  })

  it('GET 400 error when calling /redirect with an unrecognized target URL', () => {
    return frisby.get(`${URL}/redirect?to=whatever`)
      .expect('status', 400)
  })

  // Security: Open redirect bypass attempt is blocked
  it('GET 400 when attempting open redirect bypass with query string trick', () => {
    // This tests that the satisfyIndexOf bypass attempt is blocked
    return frisby.get(`${URL}/redirect?to=/score-board?satisfyIndexOf=https://github.com/juice-shop/juice-shop`)
      .expect('status', 400)
  })
})
