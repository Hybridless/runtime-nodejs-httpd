//setup new relic
if (process.env.NEW_RELIC_ENABLED == 'true' || process.env.NEW_RELIC_ENABLED  == true) {
  console.debug('[Runtime] Enabling new relic!');
  require('newrelic');
  require('@newrelic/aws-sdk');
}
// Set options as a parameter, environment variable, or rc file.
// eslint-disable-next-line no-global-assign
require = require("esm")(module/* , options */);
//
module.exports = require("./src/Runtime").default;
