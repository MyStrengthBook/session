<h1 align="center">
  <!-- Logo -->
  <img src="https://raw.githubusercontent.com/rill-js/rill/master/Rill-Icon.jpg" alt="Rill"/>
  <br/>
  @rill/session
	<br/>

  <!-- Stability -->
  <a href="https://nodejs.org/api/documentation.html#documentation_stability_index">
    <img src="https://img.shields.io/badge/stability-stable-brightgreen.svg?style=flat-square" alt="API stability"/>
  </a>
  <!-- Standard -->
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="Standard"/>
  </a>
  <!-- NPM version -->
  <a href="https://npmjs.org/package/@rill/session">
    <img src="https://img.shields.io/npm/v/@rill/session.svg?style=flat-square" alt="NPM version"/>
  </a>
  <!-- Downloads -->
  <a href="https://npmjs.org/package/@rill/session">
    <img src="https://img.shields.io/npm/dm/@rill/session.svg?style=flat-square" alt="Downloads"/>
  </a>
  <!-- Gitter Chat -->
  <a href="https://gitter.im/rill-js/rill">
    <img src="https://img.shields.io/gitter/room/rill-js/rill.svg?style=flat-square" alt="Gitter Chat"/>
  </a>
</h1>

Isomorphic session middleware that will provided consistent sessions from client to server.
Sessions are instances of [Receptacle](https://github.com/DylanPiercey/receptacle), check out the docs for modifying the session.

Session storage on the server side is done by [keyv](https://github.com/lukechilds/keyv) and you can provide configuration via the `cache` option.

# Installation

```console
npm install @rill/session
```

# Example

```javascript
const app = require('rill')();

// Set up a session. (Defaults to in memory)
app.use(require('@rill/session')());

// Use the session.
app.use(({ session }) => {
  // Sessions are instances of a "Receptacle" cache.
  session.set('a', 1, { ttl: 1000 });
  session.get('a'); // 1
});
```

# Options

```js
{
  /**
   * Optional key used for the session id cookie and keyv namespace.
   */
  key: 'rill_session',
  /**
   * Optional key to use as the name of the session on the Rill context.
   * This allows for having multiple sessions (even with different adapters) all with different names.
   * By default they will all use the name 'session'.
   */
  name: 'mySession',
  /**
   * By default the session is shared with the browser and therefor public.
   * You can disable this by setting browser to false which will only make the session visible server side and disables the sync apis.
   */
  browser: true,
  /**
   * By default @rill/session will add an http header to preload the session in the browser.
   * This improves performance by fetching your javascript and the session in parallel in supported browsers.
   * You can disable this by setting preload to false which will instead fetch the session after the main javascript has loaded.
   */
  preload: true,
  /**
   * Passed to keyv, do not send this to client.
   * Mongo db example. (must have installed keyv-mongo).
   * Default is in memory.
   */
  cache: !process.browser && {
    uri: 'mongodb://user:pass@localhost:27017/dbname' // Default is in memory (see keyv uri).
  }
  /**
   * Passed to keyv, time to live in milliseconds.
   * Time that the session cache should persist in the server
   * By default this will be undefined
   */
  keyvTtl: 60000
}
```

# Implementation Details

Rill sessions work in both the client and server however only the initial session from the server with the user will be synced using an XHR request.

In the browser the initial session is loaded from the server via XHR and then stored in memory.

---

### Contributions

- Use `npm test` to run tests.

Please feel free to create a PR!
