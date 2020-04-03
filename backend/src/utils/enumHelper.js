import { MEASURE, TRAVEL } from '../../../shared/enums';
import invert from 'lodash/invert';

const MEASURE_AS_KEY = invert(MEASURE);
const TRAVEL_AS_KEY = invert(TRAVEL);

export function toMeasureEnum(value) {
  const key = String(value).toLowerCase();
  return MEASURE_AS_KEY[key] ? key : null;
}

export function toTravelEnum(value) {
  const key = String(value).toLowerCase();
  return TRAVEL_AS_KEY[key] ? key : null;
}
