epi-models
==========

Classical epidemiological models for busy men and women.

> Don’t know what I want
> but I know how to get it.
> 
> -Sex Pistols, Anarchy in the UK


Install
=======

with npm do:

    npm install epi-models


Usage
=====

    var epi = require('epi-models')
      , util = require('util');
    
    var models = epi.createModelOneSpecies();
    
    console.log(Object.keys(models)); //all the model available
    console.log(util.inspect(models,  { depth: null }));
    
    models = epi.createModelTwoSpecies();
    console.log(Object.keys(models));
    console.log(util.inspect(models,  { depth: null }));



