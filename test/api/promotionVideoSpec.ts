/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as frisby from 'frisby'

const URL = 'http://localhost:3000'

describe('/promotion', () => {
  it('GET promotion video page is publicly accessible', () => {
    return frisby.get(URL + '/promotion')
      .expect('status', 200)
  })

  it('GET promotion video page contains embedded video', () => {
    return frisby.get(URL + '/promotion')
      .expect('header', 'content-type', /text\/html/)
      .expect('bodyContains', '<source src="./video" type="video/mp4">')
  })

  it('GET promotion video page contains subtitles', () => {
    return frisby.get(URL + '/promotion')
      .expect('header', 'content-type', /text\/html/)
      .expect('bodyContains', 'subtitle')
  })
})

describe('/video', () => {
  it('GET promotion video is publicly accessible', () => {
    return frisby.get(URL + '/video')
      .expect('status', 200)
      .expect('header', 'content-type', /video\/mp4/)
  })
})
