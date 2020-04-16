import { isLockdown } from '../../utils/typeHelper.js';

/**
 * Totals up locked down territories
 * @param {array} lockdownStatusByTerritory 
 */
export function sumLockdown(lockdownStatusByTerritory) {

  // Loops through all territories by the indeces of first territory
  const values = Object.values(lockdownStatusByTerritory);
  const firstData = values[0];
  const snapshotLength = firstData.lockdown.lockdown_status.length;
  const totals = [];
  for (var i = 0; i < snapshotLength; i++) {
    let total = 0;
    for (let index in values) {
      if (isLockdown(values[index].lockdown.lockdown_status[i])) {
        total++;
      }
    }
    totals.push(total);
  }

  return totals;
}