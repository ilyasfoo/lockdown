import { MEASURE, TRAVEL } from '../../../shared/types';
import invert from 'lodash/invert';

const MEASURE_AS_KEY = invert(MEASURE);
const TRAVEL_AS_KEY = invert(TRAVEL);

export function toMeasureType(value) {
  const key = String(value).toLowerCase();
  return MEASURE_AS_KEY[key] ? key : null;
}

export function toTravelType(value) {
  const key = String(value).toLowerCase();
  return TRAVEL_AS_KEY[key] ? key : null;
}

export function toInteger(value) {
  const int = parseInt(value);
  return Number.isInteger(int) ? int : null;
}