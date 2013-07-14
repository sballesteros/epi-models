var util = require('util')
  , clone = require('clone')
  , build = require('./util').build
  , muteBlock = require('./util').muteBlock;

module.exports = function(options){

  /**
   * shared stuffs
   **/

  var I1 = ['IS', 'IR']
    , I2 = ['SI', 'RI']
    , inf1 = util.format('r0_1/N*v*(1.0 +e*sin(2.0*M_PI*(t/ONE_YEAR + d)))*(%s + iota_1)', I1.join('+'))
    , inf2 = util.format('r0_2/N*v*(1.0 +e*sin(2.0*M_PI*(t/ONE_YEAR + d)))*(%s + iota_2)', I2.join('+'));

  var states = [
    {id:'SS', comment: 'susceptible to both strains'},

    {id:'IS', comment: 'infectious with strain 1, susceptible to strain 2', tag: ['infectious']},
    {id:'SI', comment: 'susceptible to strain 1, infectious with strain 2', tag: ['infectious']},
    {id:'IR', comment: 'infectious with strain 1, immunized to strain 2'  , tag: ['infectious']},
    {id:'RI', comment: 'immunized to strain 1, infectious with strain 2'  , tag: ['infectious']},

    {id:'SR', comment: 'susceptible to strain 1, immunized to strain 2'},
    {id:'RS', comment: 'immunized to strain 1, susceptible to strain 2'},

    {id:'SQ', comment: 'susceptible to strain 1 but temporary protected to both strains'},
    {id:'QS', comment: 'susceptible to strain 2 but temporary protected to both strains'},
    {id:'RQ', comment: 'immunized to strain 1 but temporary protected to both strains'},
    {id:'QR', comment: 'immunized to strain 2 but temporary protected to both strains'},

    {id:'ES', comment: 'exposed to strain 1, susceptible to strain 2'},
    {id:'SE', comment: 'susceptible to strain 1, exposed with strain 2'},
    {id:'ER', comment: 'exposed with strain 1, immunized to strain 2'},
    {id:'RE', comment: 'immunized to strain 1, exposed with strain 2'}, 

    {id:'RR', comment: 'immunized to both strains', tag: ['remainder']}
  ];

  var parameters = [
    {id:'r0_1',   comment: 'basic reproductive number of strain 1'},
    {id:'r0_2',   comment: 'basic reproductive number of strain 2'},
    {id:'v',      comment: 'recovery rate'},
    {id:'l',      comment: 'latency rate'},
    {id:'m',      comment: 'maternal immunity waning rate'},
    {id:'q',      comment: 'temporary full cross immunity wanning rate'},
    {id:'g',      comment: 'waning immunity rate'},
    {id:'e',      comment: 'seasonal forcing amplitude'},
    {id:'d',      comment: 'seasonal forcing dephasing'},
    {id:'iota_1', comment: 'number of aliens infected with strain 1'},
    {id:'iota_2', comment: 'number of aliens infected with strain 2'},
    {id:'sigma',  comment: 'partial cross immunity'},
    {id:'z',      comment: 'proportion of reinfection'},
    {id:'mu_b',   comment: 'birth rate'},
    {id:'mu_d',   comment: 'death rate'}
  ];


  var blocks = {

    birth: [
      {from: 'U', to:'SS', rate: 'mu_b*N', comment: 'birth'}
    ],

    recovery_E: [
      {from: 'ES', to: 'IS', rate: 'correct_rate(l)', comment: 'progression to infectious'},
      {from: 'SE', to: 'SI', rate: 'correct_rate(l)', comment: 'progression to infectious'},
      {from: 'ER', to: 'IR', rate: 'correct_rate(l)', comment: 'progression to infectious'},
      {from: 'RE', to: 'RI', rate: 'correct_rate(l)', comment: 'progression to infectious'}
    ],

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

    waning_immunity: [
      {from: 'IR', to: 'IS', rate: 'g'},
      {from: 'RI', to: 'SI', rate: 'g'},
      {from: 'SR', to: 'SS', rate: 'g'},
      {from: 'RS', to: 'SS', rate: 'g'},
      {from: 'RR', to: 'RS', rate: 'g'},
      {from: 'RR', to: 'SR', rate: 'g'}
    ],

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

    infection_no_CI: [
      {from: 'SS', to: 'IS', rate: inf1, tag: ['transmission']},
      {from: 'SS', to: 'SI', rate: inf2, tag: ['transmission']},
      {from: 'SR', to: 'IR', rate: inf1, tag: ['transmission']},
      {from: 'RS', to: 'RI', rate: inf2, tag: ['transmission']}
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

    reinfection: [
      {from: 'RS', to: 'IS', rate: 'z*' + inf1, tag: ['transmission'], comment: 're-infection'},
      {from: 'SR', to: 'SI', rate: 'z*' + inf2, tag: ['transmission'], comment: 're-infection'},
      {from: 'RR', to: 'IR', rate: util.format('z*sigma*%s', inf1), tag: ['transmission'], comment: 're-infection we assume multiplicative effects'},
      {from: 'RR', to: 'RI', rate: util.format('z*sigma*%s', inf2), tag: ['transmission'], comment: 're-infection we assume multiplicative effects'}
    ],

    reinfection_no_CI: [
      {from: 'RS', to: 'IS', rate: 'z*' + inf1, tag: ['transmission'], comment: 're-infection'},
      {from: 'SR', to: 'SI', rate: 'z*' + inf2, tag: ['transmission'], comment: 're-infection'},
      {from: 'RR', to: 'IR', rate: util.format('z*%s', inf1), tag: ['transmission'], comment: 're-infection'},
      {from: 'RR', to: 'RI', rate: util.format('z*%s', inf2), tag: ['transmission'], comment: 're-infection'}
    ],

    boosting_Q: [
      {from: 'RS', to: 'QS', rate: inf1, tag: ['transmission'], comment: 're-exposure => boosting'},
      {from: 'SR', to: 'SQ', rate: inf2, tag: ['transmission'], comment: 're-exposure => boosting'},

      {from: 'RR', to: 'QR', rate: util.format('sigma*%s', inf1), tag: ['transmission'], comment: 're-exposure => boosting (+ cross protection effect)'},
      {from: 'RR', to: 'RQ', rate: util.format('sigma*%s', inf2), tag: ['transmission'], comment: 're-exposure => boosting (+ cross protection effect)'}
    ],

    boosting_Q_no_CI: [
      {from: 'RS', to: 'QS', rate: inf1, tag: ['transmission'], comment: 're-exposure => boosting'},
      {from: 'SR', to: 'SQ', rate: inf2, tag: ['transmission'], comment: 're-exposure => boosting'},
      {from: 'RR', to: 'QR', rate: inf1, tag: ['transmission'], comment: 're-exposure => boosting'},
      {from: 'RR', to: 'RQ', rate: inf2, tag: ['transmission'], comment: 're-exposure => boosting'}
    ],

    boosting_Q_with_reinfection: [
      {from: 'RS', to: 'QS', rate: '(1.0-z)*' + inf1, tag: ['transmission'], comment: 're-infection failed => boosting'},
      {from: 'SR', to: 'SQ', rate: '(1.0-z)*' + inf2, tag: ['transmission'], comment: 're-infection failed => boosting'},

      {from: 'RR', to: 'QR', rate: util.format('(1.0-z)*sigma*%s', inf1), tag: ['transmission'], comment: 're-infection failed => boosting (+ cross protection effect)'},
      {from: 'RR', to: 'RQ', rate: util.format('(1.0-z)*sigma*%s', inf2), tag: ['transmission'], comment: 're-infection failed => boosting (+ cross protection effect)'}
    ],

    boosting_Q_with_reinfection_no_CI: [
      {from: 'RS', to: 'QS', rate: '(1.0-z)*' + inf1, tag: ['transmission'], comment: 're-infection failed => boosting'},
      {from: 'SR', to: 'SQ', rate: '(1.0-z)*' + inf2, tag: ['transmission'], comment: 're-infection failed => boosting'},

      {from: 'RR', to: 'QR', rate: util.format('(1.0-z)*%s', inf1), tag: ['transmission'], comment: 're-infection failed => boosting'},
      {from: 'RR', to: 'RQ', rate: util.format('(1.0-z)*%s', inf2), tag: ['transmission'], comment: 're-infection failed => boosting'}
    ]

  };


  //add E to infection and re-infection blocks
  ['infection', 'infection_no_CI', 'infection_sbri', 'reinfection', 'reinfection_no_CI'].forEach(function(blockName){
    blocks[blockName + '_E'] = clone(blocks[blockName]);
    blocks[blockName + '_E'].forEach(function(r){
      r.to = r.to.replace(/I/g, 'E');
    });
  });



  /**
   * All the process pmodels
   **/

  var pmodels = {};

  pmodels.sir = {
    name: "SIR_HBRS",
    description: "SIR History based model with reduced susceptibility",
    blocks: ['birth', 'infection', 'recovery'],
  };

  pmodels.sirs = {
    name: "SIRS_HBRS",
    description: "SIRS History based model with reduced susceptibility",
    blocks: pmodels.sir.blocks.concat('waning_immunity')
  };

  pmodels.siri = {
    name: "SIRI_HBRS",
    description: "SIRI History based model with reduced susceptibility",
    blocks: pmodels.sir.blocks.concat('reinfection')
  };

  pmodels.siqr = {
    name: "SIQR_HBRS",
    description: "SIQR History based model with reduced susceptibility!",
    blocks: ['birth', 'infection', 'recovery_Q', 'waning_Q']
  };

  pmodels.siqrs = {
    name: "SIQRS_HBRS",
    description: "SIQRS History based model with reduced susceptibility",
    blocks: pmodels.siqr.blocks.concat('waning_immunity', 'waning_immunity_Q')
  };

  pmodels.siqri = {
    name: "SIQRI_HBRS",
    description: "SIQRI History based model with reduced susceptibility",
    blocks: pmodels.siqr.blocks.concat('reinfection')
  };

  pmodels.siqr_b = {
    name: "SIQR_HBRS_B",
    description: "SIQR (with boosting) History based model with reduced susceptibility!",
    blocks: pmodels.siqr.blocks.concat('boosting_Q')
  };

  pmodels.siqri_b = {
    name: "SIQRI_HBRS_B",
    description: "SIQRI (with boosting) History based model with reduced susceptibility",
    blocks: pmodels.siqri.blocks.concat('boosting_Q_with_reinfection')
  };

  pmodels.sir_sbri = {
    name: "SIR_SBRI",
    description: "SIR Status based model with reduced infectivity",
    blocks: ['birth', 'infection_sbri', 'recovery']
  };

  pmodels.sirs_sbri = {
    name: "SIRS_SBRI",
    description: "SIRS Status based model with reduced infectivity",
    blocks: pmodels.sir_sbri.blocks.concat('waning_immunity')
  };



  //add model without cross immunity (replace key by values)  
  var adapter = {
    infection: ['infection_no_CI'],
    reinfection: ['reinfection_no_CI'],
    boosting_Q: ['boosting_Q_no_CI'],
    boosting_Q_with_reinfection: ['boosting_Q_with_reinfection_no_CI']  
  };

  for (var m in pmodels){
    if(! (/sbri/.test(m)) ){
      pmodels[m + '_no_CI'] = {
        name: pmodels[m].name + '_no_CI',
        description: pmodels[m].description + ' without cross immunity',
        blocks: muteBlock(adapter, pmodels[m].blocks) 
      };
    }
  };
  
  //pmodels with an Exposed class (replace key by values)  
  adapter = {
    infection: ['infection_E', 'recovery_E'],
    infection_no_CI: ['infection_no_CI_E', 'recovery_E'],
    infection_sbri: ['infection_sbri_E', 'recovery_E'],
    reinfection: ['reinfection_E'],
    reinfection_no_CI: ['reinfection_no_CI_E'],
    waning_immunity: ['waning_immunity', 'waning_immunity_E']
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
