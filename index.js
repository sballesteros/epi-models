var createModel2s = require('./lib/2species');

var models = createModel2s();
console.log(require('util').inspect(models,  { depth: null }));
