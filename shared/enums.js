const UNSPECIFIED_VALUE = 'unspecified';

const MEASURE = {
  NO: 'no',
  YES: 'yes',
  PARTIAL: 'partial',
  UNCLEAR: 'unclear',
  UNSPECIFIED: UNSPECIFIED_VALUE,
};

const TRAVEL = {
  PARTIAL: 'partial',
  UNCLEAR: 'unclear',
  NA: 'n/a',
  PROHIBITED: 'prohibited',
  ALLOWED: 'allowed',
  UNSPECIFIED: UNSPECIFIED_VALUE,
}

module.exports = {
  MEASURE: MEASURE,
  TRAVEL: TRAVEL,
  UNSPECIFIED_VALUE: UNSPECIFIED_VALUE,
}