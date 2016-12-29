'use strict'

var Receptacle = require('receptacle')
var Cache = require('cacheman')

/**
 * Adds a session to a rill app and persists it between browser and server.
 *
 * @return {Function}
 */
module.exports = function (opts) {
  opts = opts || {}
  var ID = opts.key || 'rill_session'
  var DATA = '__' + ID + '__'
  var cache = new Cache(ID, opts.cache)

  return function sessionMiddleware (ctx, next) {
    var req = ctx.req
    var res = ctx.res
    var token = req.cookies[ID]
    var load = !token
      // Client needs a session.
      ? Promise.resolve(new Receptacle())
      // Load existing session.
      : cache.get(token).then(function (data) {
        if (!data) return new Receptacle()
        return new Receptacle(data)
      })

    return load.then(function (session) {
      // Respond to a session request.
      if (req.get(DATA)) {
        // Ensure session is not cached.
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.set('Pragma', 'no-cache')
        res.set('Expires', '0')
        res.status = 200

        // Handle session load.
        if (req.method === 'GET') {
          res.body = session.toJSON()
          return
        }

        // Handle session save.
        if (req.method === 'POST') {
          return saveSession()
        }

        return
      }

      // Set cookie on new sessions.
      if (String(session.id) !== token) {
        res.cookie(ID, session.id, { path: '/', httpOnly: true, secure: req.secure })
      }

      // Attach session to the context.
      ctx.session = session

      // Run middleware then save updated session.
      return next().then(saveSession).catch(saveSession)

      // Utility to save the session and forward errors.
      function saveSession (err) {
        return new Promise(function (resolve, reject) {
          cache.set(String(session.id), session.toJSON(), function (err) {
            if (err) return reject(err)
            else resolve()
          })
        }).then(err ? Promise.reject(err) : Promise.resolve())
      }
    })
  }
}
