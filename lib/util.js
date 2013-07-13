var clone = require('clone')
  , _ =require('underscore')
  , parseRate = require('plom-validate').parseRate;


exports.muteBlock = function (adapter, blockList){

  var a = clone(blockList);

  a.forEach(function(block){
    if (block in adapter){
      a.splice(a.indexOf(block), 1, adapter[block]);
    }
  });

  return _.flatten(a);
};


function getState(model, statesObj){
  var states = _.uniq(model
                      .map(function(x){return x.from;})
                      .concat(model.map(function(x){return x.to;}))
                     ).filter(function(x){return x !== 'U';});

  return states.map(function(x) {return statesObj[x];});
};



function getParameter(model, parametersObj){
  var parameters = []
  model.forEach(function(x){
    var rateEls = parseRate(x.rate);
    rateEls.forEach(function(el){
      if(el in parametersObj){
        parameters.push(el);
      }
    });
  });

  return _.uniq(parameters).map(function(x) {return parametersObj[x];});
};



exports.build = function(pmodels, blocks, states, parameters, deathRate){

  var statesObj = {};
  states.forEach(function(x){
    statesObj[x.id] = x;
  });

  var parametersObj = {};
  parameters.forEach(function(x){
    parametersObj[x.id] = x;
  });

  var built = {};

  for (var m in pmodels){
    built[m] = {
      name: pmodels[m].name,
      description: pmodels[m].description,
      model: [].concat.apply([], pmodels[m].blocks.map(function(x){return blocks[x];}))
    };

    built[m].state = getState(built[m].model, statesObj);
    //state without remainder
    var toDie = built[m].state
      .filter(function(x){return !('tag' in x) || (typeof x.tag === 'string' &&  x.tag !== 'remainder') || (Array.isArray(x.tag) && x.tag.indexOf('remainder') === -1) })
      .map(function(x) {return x.id});

    //add death
    toDie.forEach(function(x){
      built[m].model.push({
        from: x,
        to: 'U',
        rate: deathRate,
        comment: 'death'
      });
    });

    //has to be done after death are added to get the death rate
    built[m].parameter = getParameter(built[m].model, parametersObj);

  };

  return clone(built);
};
