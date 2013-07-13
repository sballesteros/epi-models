var util = require('util')
  , clone = require('clone');

/**
 * shared stuffs
 **/

var I1 = ['IS', 'IR']
  , I2 = ['SI', 'RI']
  , inf1 = util.format('r0_1/N*v*(1.0 +e*sin(2.0*M_PI*(t/ONE_YEAR + d)))*(%s + iota_1)', I1.join('+'))
  , inf2 = util.format('r0_2/N*v*(1.0 +e*sin(2.0*M_PI*(t/ONE_YEAR + d)))*(%s + iota_2)', I2.join('+'));

/**
 * blocks
 **/

var blocks = module.exports = {

  demography: function(states){
    return [
      {from: 'U', to:'SS', rate: 'mu_b*N', comment: 'birth'}
    ].concat(states.filter(function(x){return x!=='RR';}).map(function(x){ return {from: x, to: 'U', rate: 'mu_d', comment: 'death'};}));
  },

  demography_M: function(states){
    return [
      {from: 'U', to:'MM', rate: 'mu_b*N', comment: 'birth'},
      {from: 'MM', to:'SS', rate: 'm', comment: 'waning of maternal immunity'}
    ].concat(states.filter(function(x){return x!=='RR';}).map(function(x){ return {from: x, to: 'U', rate: 'mu_d', comment: 'death'};}));
  },

  demography_vaccination: function(states){
    return [
      {from: 'U', to:'SS', rate: '(1.0-p)*mu_b*N', comment: 'birth'},
      {from: 'U', to:'RS', rate: 'p*mu_b*N', comment: 'birth'}
    ].concat(states.filter(function(x){return x!=='RR';}).map(function(x){ return {from: x, to: 'U', rate: 'mu_d', comment: 'death'};}));
  },

  recovery_E: [
    {from: 'ES', to: 'IS', rate: 'correct_rate(l)'},
    {from: 'SE', to: 'SI', rate: 'correct_rate(l)'},
    {from: 'ER', to: 'IR', rate: 'correct_rate(l)'},
    {from: 'RE', to: 'RI', rate: 'correct_rate(l)'}
  ],

  erlang_E: function(states, shape){
    return [      
      {from: 'ES', to: 'ES', rate: 'correct_rate(l)', shape: shape, rescale: 'l'},
      {from: 'SE', to: 'SE', rate: 'correct_rate(l)', shape: shape, rescale: 'l'},
      {from: 'ER', to: 'ER', rate: 'correct_rate(l)', shape: shape, rescale: 'l'},
      {from: 'RE', to: 'RE', rate: 'correct_rate(l)', shape: shape, rescale: 'l'}
    ]
  },

  //applies to recovery and recovery_Q
  erlang_I: function(states, shape){
    return [
      {from: 'IS', to: 'IS', rate: 'correct_rate(v)', shape: shape, rescale: 'v'},
      {from: 'SI', to: 'SI', rate: 'correct_rate(v)', shape: shape, rescale: 'v'},
      {from: 'IR', to: 'IR', rate: 'correct_rate(v)', shape: shape, rescale: 'v'},
      {from: 'RI', to: 'RI', rate: 'correct_rate(v)', shape: shape, rescale: 'v'}
    ]
  },

  recovery: [
    {from: 'IS', to: 'RS', rate: 'correct_rate(v)'},
    {from: 'SI', to: 'SR', rate: 'correct_rate(v)'},
    {from: 'IR', to: 'RR', rate: 'correct_rate(v)'},
    {from: 'RI', to: 'RR', rate: 'correct_rate(v)'}
  ],

  recovery_Q: [
    {from: 'IS', to: 'QS', rate: 'correct_rate(v)'},
    {from: 'SI', to: 'SQ', rate: 'correct_rate(v)'},
    {from: 'IR', to: 'QR', rate: 'correct_rate(v)'},
    {from: 'RI', to: 'RQ', rate: 'correct_rate(v)'}
  ],

  waning_Q: [
    {from: 'QS', to: 'RS', rate: 'correct_rate(q)'},
    {from: 'SQ', to: 'SR', rate: 'correct_rate(q)'},
    {from: 'QR', to: 'RR', rate: 'correct_rate(q)'},
    {from: 'RQ', to: 'RR', rate: 'correct_rate(q)'}
  ],

  waning_immunity: function(states){
    return [
      {from: 'IR', to: 'IS', rate: 'g'},
      {from: 'RI', to: 'SI', rate: 'g'},
      {from: 'SR', to: 'SS', rate: 'g'},
      {from: 'RS', to: 'SS', rate: 'g'},
      {from: 'RR', to: 'RS', rate: 'g'},
      {from: 'RR', to: 'SR', rate: 'g'}
    ];
  },

  waning_immunity_E: [
    {from: 'ER', to: 'ES', rate: 'g'},
    {from: 'RE', to: 'SE', rate: 'g'},
  ],

  waning_immunity_Q: [
    {from: 'QR', to: 'QS', rate: 'g'},
    {from: 'RQ', to: 'SQ', rate: 'g'},
  ],

  infection: [
    {from: 'SS', to: 'IS', rate: inf1, tag: ['transmission']},
    {from: 'SS', to: 'SI', rate: inf2, tag: ['transmission']},
    {from: 'SR', to: 'IR', rate: 'sigma*' + inf1, tag: ['transmission']},
    {from: 'RS', to: 'RI', rate: 'sigma*' + inf2, tag: ['transmission']}
  ],

  infection_sbri: [
    {from: 'SS', to: 'IS', rate: 'sigma*' + inf1, tag: ['transmission']},
    {from: 'SS', to: 'IR', rate: '(1.0-sigma)*' + inf1, tag: ['transmission'], comment: 'polarized immunity' },
    {from: 'SS', to: 'SI', rate: 'sigma*' + inf2, tag: ['transmission']},
    {from: 'SS', to: 'RI', rate: '(1.0-sigma)*' + inf2, tag: ['transmission'], comment: 'polarized immunity' },

    {from: 'SR', to: 'IR', rate: inf1, tag: ['transmission']},
    {from: 'SR', to: 'RR', rate: '(1.0-sigma)*' + inf2, tag: ['transmission'], comment: 're-infection (re-exposed by 2, non infectious but fully susceptible => gain immunity to 1)'},

    {from: 'RS', to: 'RI', rate: inf2, tag: ['transmission']},
    {from: 'RS', to: 'RR', rate: '(1.0-sigma)*' + inf1, tag: ['transmission'], comment: 're-infection (re-exposed by 1, non infectious but fully susceptible => gain immunity to 2)'}
  ],


  reinfection: function(states){
    return [
      {from: 'RS', to: 'IS', rate: 'z*' + inf1, tag: ['transmission'], comment: 're-infection'},
      {from: 'SR', to: 'SI', rate: 'z*' + inf2, tag: ['transmission'], comment: 're-infection'},
      {from: 'RR', to: 'IR', rate: util.format('z*sigma*%s', inf1), tag: ['transmission'], comment: 're-infection we assume multiplicative effects'},
      {from: 'RR', to: 'RI', rate: util.format('z*sigma*%s', inf2), tag: ['transmission'], comment: 're-infection we assume multiplicative effects'}
    ];
  },


  reinfection_E: function(states){
    var res = this.reinfection(states);
    res.forEach(function(r){
      r.to = r.to.replace(/I/g, 'E');
    });
    return res;
  },


  boosting_Q: function(states){
    return [
      {from: 'RS', to: 'QS', rate: inf1, tag: ['transmission'], comment: 're-exposure => boosting'},
      {from: 'SR', to: 'SQ', rate: inf2, tag: ['transmission'], comment: 're-exposure => boosting'},

      {from: 'RR', to: 'QR', rate: util.format('sigma*%s', inf1), tag: ['transmission'], comment: 're-exposure => boosting (+ cross protection effect)'},
      {from: 'RR', to: 'RQ', rate: util.format('sigma*%s', inf2), tag: ['transmission'], comment: 're-exposure => boosting (+ cross protection effect)'}
    ];
  },

  boosting_Q_with_reinfection: function(states){
    return [
      {from: 'RS', to: 'QS', rate: '(1.0-z)*' + inf1, tag: ['transmission'], comment: 're-infection failed => boosting'},
      {from: 'SR', to: 'SQ', rate: '(1.0-z)*' +inf2, tag: ['transmission'], comment: 're-infection failed => boosting'},

      {from: 'RR', to: 'QR', rate: util.format('(1.0-z)*sigma*%s', inf1), tag: ['transmission'], comment: 're-infection failed => boosting (+ cross protection effect)'},
      {from: 'RR', to: 'RQ', rate: util.format('(1.0-z)*sigma*%s', inf2), tag: ['transmission'], comment: 're-infection failed => boosting (+ cross protection effect)'}
    ];
  },


  build: function(names, states){

    var that = this;

    var get_array = function(name){
      if(name.indexOf('erlang') !== -1){	
        var shape = parseInt(name.split('_')[2], 10);	
        name = name.split('_').slice(0, 2).join('_');	
      }

      return (typeof that[name] === 'function') ? that[name](states, shape): that[name];
    };

    return [].concat.apply([], names.map(get_array));
  }
};

//add E to infection blocks
['infection', 'infection_sbri'].forEach(function(blockName){
  blocks[blockName + '_E'] = clone(blocks[blockName]);
  blocks[blockName + '_E'].forEach(function(r){
    r.to = r.to.replace(/I/g, 'E');
  });
});
