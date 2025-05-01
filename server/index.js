'use strict';

var Cache = require('keyv');
var Receptacle = require('receptacle');

/**
 * Adds a session to a rill app and persists it between browser and server.
 *
 * @return {Function}
 */
module.exports = function (opts) {
  opts = opts || {};
  opts.name = opts.name || 'session';
  opts.cache = opts.cache || {};
  opts.browser = !('browser' in opts) || opts.browser;
  opts.preload = !('preload' in opts) || opts.preload;

  var ID = (opts.cache.namespace = opts.key || 'rill_session');
  var URL = '/__' + encodeURIComponent(ID) + '__';
  var cache = new Cache(opts.cache);

  return function sessionMiddleware(ctx, next) {
    var req = ctx.req;
    var res = ctx.res;
    var token = req.cookies[ID];
    var isTransfer = req.pathname === URL;

    // Handle session get/save.
    if (opts.browser && isTransfer) {
      switch (req.method) {
        case 'GET':
          return cache.get(token).then(function (data) {
            // Ensure session is not cached.
            res.set('Content-Type', 'application/javascript');
            res.set(
              'Cache-Control',
              'max-age=0, no-cache, no-store, must-revalidate'
            );
            res.set('Pragma', 'no-cache');
            res.set('Expires', '-1');
            res.set('Vary', '*');
            // Send session as jsonp (this is done so that it can be preloaded via a script tag).
            res.body = 'window["' + URL + '"] = ' + (data || '{}');
          });
        case 'POST':
          return cache
            .set(String(req.body.id), JSON.stringify(req.body), opts.keyvTtl)
            .then(function () {
              res.status = 200;
              res.body = 'ok';
            });
        default:
          return;
      }
    }

    // Load session for middleware to use.
    var load = !token
      ? // Client needs a session.
        Promise.resolve(new Receptacle())
      : // Load existing session.
        cache.get(token).then(function (data) {
          try {
            data = JSON.parse(data);
          } catch (err) {
            data = undefined;
          }

          if (!data) return new Receptacle();
          return new Receptacle(data);
        });

    return load.then(function (session) {
      // Track the original modified time for the session.
      var initialModified = session.lastModified;

      // Attach session to the context.
      ctx[opts.name] = session;

      // Run middleware then save updated session.
      return next().then(saveSession, saveSession);

      // Utility to save the session and forward errors.
      function saveSession(err) {
        const sessionId = String(session.id);
        const now = Date.now();
        const refreshThreshold = opts.refreshThreshold || 15 * 60 * 1000; // 15 minutes

        const refreshCookie = () => {
          res.cookie(ID, sessionId, {
            path: '/',
            httpOnly: true,
            secure: req.secure,
            maxAge:
              typeof opts.keyvTtl === 'number'
                ? Math.floor(opts.keyvTtl / 1000)
                : undefined,
          });
        };

        const saveToStore = () => {
          session.lastRefreshedAt = now;
          return cache
            .set(sessionId, JSON.stringify(session), opts.keyvTtl)
            .then(() => {
              if (err) throw err;
            });
        };

        const needsRefresh =
          !session.lastRefreshedAt ||
          now - session.lastRefreshedAt > refreshThreshold;

        const sessionModified = session.lastModified !== initialModified;
        const isNewSession = sessionId !== token;

        const contentType = res.get('Content-Type');
        if (
          opts.preload &&
          contentType &&
          contentType.indexOf('text/html') === 0
        ) {
          res.append('Link', '<' + URL + '>; rel=preload; as=script;');
        }

        console.log('saveSession', {
          sessionId,
          isNewSession,
          sessionModified,
          needsRefresh,
          refreshThreshold,
        });

        if (isNewSession || sessionModified || needsRefresh) {
          refreshCookie();
          return saveToStore();
        }

        if (err) throw err;
      }
    });
  };
};
