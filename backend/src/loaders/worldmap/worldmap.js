import { writeJSON } from '../../utils/file.js';

// Default lockdown status if data doesnt exist
const defaultLockdownStatus = null;

/**
 * Appends lockdown_status to each territory
 * @param {array} lockdownStatusByTerritory 
 */
export function appendLockdownStatus(lockdownStatusByTerritory) {
  const baseData = require('./base.json');
  const updatedFeatures = [];

  // We'd need a null lockdown placeholder for territories not in sheet
  const entries = Object.entries(lockdownStatusByTerritory);
  const [firstKey, firstData] = entries[0];
  const snapshotLength = firstData.lockdown.lockdown_status.length;
  const nullFilled = Array(snapshotLength).fill(null);
  
  baseData['features'].forEach(feature => {
    let lockdownStatusArray = lockdownStatusByTerritory[feature.properties.iso2]?.lockdown?.lockdown_status ?? nullFilled;
    updatedFeatures.push({
      ...feature,
      properties: {
        ...feature['properties'],
        lockdown_status: lockdownStatusArray,
      }
    });
  });

  return {
    ...baseData,
    features: updatedFeatures
  }
}

export default async function loadData(lockdownStatusByTerritory) {
  const finalWorldmapData = appendLockdownStatus(lockdownStatusByTerritory);
  writeJSON('worldmap', finalWorldmapData);
}