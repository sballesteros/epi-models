var util = require('util')
  , clone = require('clone')
  , build = require('./util').build
  , muteBlock = require('./util').muteBlock;

module.exports = function(options){

  /**
   * shared stuffs
   **/

  var inf = 'r0/N*v*(1.0 +e*sin(2.0*M_PI*(t/ONE_YEAR + d)))*(I + iota)';

  var states = [
    {id:'S', comment: 'susceptible'},
    {id:'E', comment: 'exposed'},
    {id:'I', comment: 'infectious', tag: ['infectious']},
    {id:'Q', comment: 'temporary protected'},
    {id:'R', comment: 'immunized', tag: ['remainder']}
  ];

  var parameters = [
    {id:'r0',     comment: 'basic reproductive number'},
    {id:'v',      comment: 'recovery rate'},
    {id:'l',      comment: 'latency rate'},
    {id:'m',      comment: 'maternal immunity waning rate'},
    {id:'q',      comment: 'temporary full cross immunity wanning rate'},
    {id:'g',      comment: 'waning immunity rate'},
    {id:'e',      comment: 'seasonal forcing amplitude'},
    {id:'d',      comment: 'seasonal forcing dephasing'},
    {id:'iota',   comment: 'number infected aliens'},
    {id:'z',      comment: 'proportion of reinfection'},
    {id:'mu_b',   comment: 'birth rate'},
    {id:'mu_d',   comment: 'death rate'}
  ];

  var blocks = {
    birth: [
      {from: 'U', to:'S', rate: 'mu_b*N', comment: 'birth'}
    ],

    recovery_E: [
      {from: 'E', to: 'I', rate: 'correct_rate(l)', comment: 'progression to infectious'}
    ],

    recovery: [
      {from: 'I', to: 'R', rate: 'correct_rate(v)'}
    ],

    recovery_Q: [
      {from: 'I', to: 'Q', rate: 'correct_rate(v)'}
    ],

    waning_Q: [
      {from: 'Q', to: 'R', rate: 'correct_rate(q)'}
    ],

    waning_immunity: [
      {from: 'R', to: 'S', rate: 'g'}
    ],

    infection: [
      {from: 'S', to: 'I', rate: inf, tag: ['transmission']}
    ],

    reinfection: [
      {from: 'R', to: 'I', rate: 'z*' + inf, tag: ['transmission'], comment: 're-infection'}
    ],

    boosting_Q_with_reinfection: [
      {from: 'R', to: 'Q', rate: '(1.0-z)*' + inf, tag: ['transmission'], comment: 're-infection failed => boosting'}
    ]
  };

  //add E to infection and re-infection blocks
  ['infection', 'reinfection'].forEach(function(blockName){
    blocks[blockName + '_E'] = clone(blocks[blockName]);
    blocks[blockName + '_E'].forEach(function(r){
      r.to = r.to.replace(/I/g, 'E');
    });
  });

  /**
   * All the process models
   **/

  var pmodels = {};

  pmodels.sir = {
    name: "SIR",
    description: "SIR model",
    blocks: ['birth', 'infection', 'recovery'],
  };

  pmodels.sirs = {
    name: "SIRS",
    description: "SIRS model",
    blocks: pmodels.sir.blocks.concat('waning_immunity')
  };

  pmodels.siri = {
    name: "SIRI",
    description: "SIRI model",
    blocks: pmodels.sir.blocks.concat('reinfection')
  };

  pmodels.siqri = {
    name: "SIQRI",
    description: "SIQRI model",
    blocks: ['birth', 'infection', 'recovery_Q', 'waning_Q', 'reinfection']
  };

  pmodels.siqri_b = {
    name: "SIQRI_B",
    description: "SIQRI (with boosting) model",
    blocks: pmodels.siqri.blocks.concat('boosting_Q_with_reinfection')
  };
   
  //pmodels with an Exposed class (replace key by values)  
  adapter = {
    infection: ['infection_E', 'recovery_E'],
    reinfection: ['reinfection_E'],
  };

  for (var m in pmodels){
    pmodels[ m.replace(/i/,'ei') ] = {
      name: pmodels[m].name.replace(/I/, 'EI'),
      description: pmodels[m].description.replace(/I/, 'EI'),
      blocks: muteBlock(adapter, pmodels[m].blocks)
    };
  };

  return build(pmodels, blocks, states, parameters, 'mu_b');

};
