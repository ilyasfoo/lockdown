import getDocument, { getWorksheetByTitle } from './googlesheet';
import GoogleSpreadsheetWorksheet from 'google-spreadsheet/lib/GoogleSpreadsheetWorksheet';
import { transposeRows, transposeColumns } from '../../utils/dataHelper';
import { letterToColumn, columnToLetter } from 'google-spreadsheet/lib/utils';
import logger from '../../utils/logger';
import { writeJSON } from '../../utils/file';
import { getCachedCellsRange, getGridRanges } from '../../utils/sheet';
import find from 'lodash/find';
import { SimpleGridSheet, SimpleGrid } from '../../utils/SimpleGrid';
import { toMeasureEnum, toTravelEnum } from '../../utils/enumHelper';

// Constants
const entryColumnLength = 5;

/**
 * Gets data from "Global" sheet.
 * Expected structure from gsheet as such:
 * [ 
 *    [ 'Afghanistan', 'AF', 'AFG' ],
 *    [ 'Albania', 'AL', 'ALB' ],
 *    [ 'Algeria', 'DZ', 'DZA' ],
 * ...
 * @returns {array}
 */
export async function getGlobalData() {
  logger.log('[Lockdown:Global] start');
  const sheet = await getWorksheetByTitle('Global');
  const rows = await sheet.getCellsInRange('D5:F253');
  const headers = ['territory', 'iso2', 'iso3'];
  return transposeRows(headers, rows);
}

/**
 * Parses entry structure with appended label,
 * strips null end and start
 * @param {array} rows 
 * @param {any} labelsWithTransformFn 
 */
function parseEntryStructure(rows, labelsWithTransformFn) {
  const associativeRows = transposeRows([
    'start',
    'end',
    'value'
  ], rows);

  // Strip null start & end
  const associativeRowsStripped = [];
  associativeRows.forEach((associativeRow) => {
    let o = { value: associativeRow['value'] || null };
    if (associativeRow['start']) {
      o['start'] = associativeRow['start'];
    }
    if (associativeRow['end']) {
      o['end'] = associativeRow['end'];
    }
    associativeRowsStripped.push(o);
  });

  // Parse all values with enum function
  const associativeRowsStrippedParsed = associativeRowsStripped.map((row, index) => {
    if (labelsWithTransformFn[index] === undefined) {
      // No label given for this row, skip?
      return row;
    }

    let transformFn = labelsWithTransformFn[index]?.transformFn;
    let transformedValue = typeof transformFn == 'function' ? transformFn(row['value']) : row['value'];
    return {
      ...row,
      value: transformedValue,
    };
  });

  const labels = labelsWithTransformFn.map(l => l['label']);
  const values = transposeColumns(labels, associativeRowsStrippedParsed);
  const array = []
  for (const [label, row] of Object.entries(values)) {
    array.push({
      label: label,
      ...row
    })
  }
  return array;
}

/**
 * Converts row range to A1 range according to entry structure
 * '2:10' will get 'H2:J10', etc.
 * @param {string} rowRange Row range, such as '2:10'
 * @param {number} entryIndex N-th index for entry
 * @param {string} initialColumnLetter The first entry in sheet
 */
function getEntryCellRange(rowRange, entryIndex = 0, initialColumnLetter = 'H') {
  // Column length between entry start and end
  const initialColumnIndex = letterToColumn(initialColumnLetter);
  const offset = entryIndex * entryColumnLength;
  const startColumnIndex = initialColumnIndex + offset;
  const endColumnIndex = startColumnIndex + 2;
  const startLetter = columnToLetter(startColumnIndex);
  const endLetter = columnToLetter(endColumnIndex);

  const [rowStart, rowEnd] = rowRange.split(':');
  return `${startLetter}${rowStart}:${endLetter}${rowEnd}`;
}

/**
 * Gets fully parsed entry data
 * @param {GoogleSpreadsheetWorksheet|SimpleGrid} sheet 
 * @param {integer} entryIndex 
 */
function getEntry(sheet, entryIndex) {
  let entryMetaRange = getEntryCellRange('2:6', entryIndex, 'I');
  let entryInfoRange = getEntryCellRange('9:12', entryIndex);
  let entryMeasureRange = getEntryCellRange('14:24', entryIndex);
  let entryLandRange = getEntryCellRange('32:38', entryIndex);
  let entryFlightRange = getEntryCellRange('42:48', entryIndex);
  let entrySeaRange = getEntryCellRange('52:58', entryIndex);

  // Entry meta section
  const entryMetaRows = getCachedCellsRange(sheet, entryMetaRange, false);
  const entryMetaData = transposeColumns(['editor', 'reviewed_by', 'status', 'type', 'date_of_entry'], entryMetaRows, true);

  // Should skip status != 'Ready'
  if (entryMetaData['status'] != 'Ready') {
    return;
  }

  // Entry entry section
  const entryInfoRows = getCachedCellsRange(sheet, entryInfoRange, false);
  const entryInfoData = transposeColumns(['name', 'url', 'title', 'date'], entryInfoRows, true);

  // Measures section
  const measures = parseEntryStructure(getCachedCellsRange(sheet, entryMeasureRange, false), [
    { label: 'max_gathering', transformFn: toMeasureEnum }, // Max gathering number allowed (PAX)?
    { label: 'lockdown_status', transformFn: toMeasureEnum }, // Is there a mandate for self-isolation?
    { label: 'city_movement_restriction', transformFn: toMeasureEnum }, // Is going on the street allowed?
    { label: 'attending_religious_sites', transformFn: toMeasureEnum }, // Is attenting religiouns sites allowed?
    { label: 'going_to_work', transformFn: toMeasureEnum }, // Is going to work allowed?
    { label: 'military_not_deployed', transformFn: toMeasureEnum }, // Is the Military NOT deployed?
    { label: 'academia_allowed', transformFn: toMeasureEnum }, // Is going to academia allowed?
    { label: 'going_to_shops', transformFn: toMeasureEnum }, // Is going to shops allowed?
    { label: 'electricity_nominal', transformFn: toMeasureEnum }, // Is Electricity operating nominally?
    { label: 'water_nominal', transformFn: toMeasureEnum }, // Is Water operating nominally?
    { label: 'internet_nominal', transformFn: toMeasureEnum }, // Is Internet operating nominally?
  ]);

  // In & out section
  const land = parseEntryStructure(getCachedCellsRange(sheet, entryLandRange, false), [
    { label: 'local', transformFn: toTravelEnum }, // Local destinations?
    { label: 'nationals_inbound', transformFn: toTravelEnum }, // Nationals inbound?
    { label: 'nationals_outbound', transformFn: toTravelEnum }, // Nationals outbound?
    { label: 'foreigners_inbound', transformFn: toTravelEnum }, // Foreigners inbound?
    { label: 'foreigners_outbound', transformFn: toTravelEnum }, // Foreigners outbound?
    { label: 'cross_border_workers', transformFn: toTravelEnum }, // Cross border workers?
    { label: 'commerce', transformFn: toTravelEnum }, // Commerce?
  ]);

  const flight = parseEntryStructure(getCachedCellsRange(sheet, entryFlightRange, false), [
    { label: 'local', transformFn: toTravelEnum }, // Local destinations?
    { label: 'nationals_inbound', transformFn: toTravelEnum }, // Nationals inbound?
    { label: 'nationals_outbound', transformFn: toTravelEnum }, // Nationals outbound?
    { label: 'foreigners_inbound', transformFn: toTravelEnum }, // Foreigners inbound?
    { label: 'foreigners_outbound', transformFn: toTravelEnum }, // Foreigners outbound?
    { label: 'stopovers', transformFn: toTravelEnum }, // Stopovers?
    { label: 'commerce', transformFn: toTravelEnum }, // Commerce?
  ]);

  const sea = parseEntryStructure(getCachedCellsRange(sheet, entrySeaRange, false), [
    { label: 'local', transformFn: toTravelEnum }, // Local destinations?
    { label: 'nationals_inbound', transformFn: toTravelEnum }, // Nationals inbound?
    { label: 'nationals_outbound', transformFn: toTravelEnum }, // Nationals outbound?
    { label: 'foreigners_inbound', transformFn: toTravelEnum }, // Foreigners inbound?
    { label: 'foreigners_outbound', transformFn: toTravelEnum }, // Foreigners outbound?
    { label: 'cross_border_workers', transformFn: toTravelEnum }, // Cross border workers?
    { label: 'commerce', transformFn: toTravelEnum }, // Commerce?
  ]);
  
  return {
    ...entryMetaData,
    ...entryInfoData,
    measures: measures,
    travel: {
      land,
      flight,
      sea,
    }
  }
}

/**
 * Groups territories and request data from google API at batch size
 * @param {array} territories 
 */
export async function batchGetTerritoriesEntryData(territories) {
  const batchSize = 25;
  const entriesToGrab = 10;
  const endCacheColumn = columnToLetter(letterToColumn('H') + (entriesToGrab * entryColumnLength));
  const rangeToCache = `H1:${endCacheColumn}60`;
  const doc = await getDocument();
  const result = [];
  var batch;
  
  while (batch = territories.splice(0, batchSize)) {
    if (batch.length < 1) break;
    // TODO: Uncomment the following when country tab sheets are ready with ISO3 naming
    // let gridRanges = batch.map(territory => `${territory['iso3']}!${rangeToCache}`);
    let gridRanges = batch.map(territory => `DEMO!${rangeToCache}`);
    logger.log(`[Lockdown:WorkSheet] ${batch.map(t => t['iso3']).join(' ')}`);
    let gridData = await doc.batchGetGridRanges(gridRanges);
    
    for (let i = 0; i < batch.length; i++) {
      // TODO: Uncomment the following when country tab sheets are ready with ISO3 naming
      // let workSheet = await getWorksheetByTitle(batch[i]['iso3']);
      let workSheet = await getWorksheetByTitle('DEMO');
      let gridSheet = new SimpleGridSheet(rangeToCache, gridData[i], workSheet);
      let entries = [];
      for (let entryIndex = 0; entryIndex < entriesToGrab; entryIndex++) {
        // Cell ranges
        let entryData = getEntry(gridSheet, entryIndex);
        if (entryData) {
          entries.push(entryData);
        }
      }

      result.push({
        isoCode: batch[i]['iso2'],
        lockdown: {
          // TODO: change this to support multiple entries after MVP
          ...entries[0]
        }
      });
    }
  }

  return result;
}

/**
 * Gets lockdown data for all territories
 * @returns {array}
 */
export async function getTerritoriesLockdownData() {
  const territories = await getGlobalData();
  return await batchGetTerritoriesEntryData(territories);
}

export default async function loadData() {
  const territories = await getTerritoriesLockdownData();

  // Loads separate json files per territory iso code
  territories.forEach((territory) => {
    writeJSON(`territories/${territory['isoCode']}`, {
      lockdown: territory['lockdown']
    });
  });

  // Load summarized datafile
  const summarizedTerritories = {};
  territories.forEach((territory) => {
    let measures = territory['lockdown']['measures'];
    let lockdownStatus = find(measures, { 'label': 'lockdown_status' });
    summarizedTerritories[territory['isoCode']] = {
      lockdown: {
        lockdown_status: lockdownStatus['value'],
      }
    };
  });

  writeJSON('datafile', summarizedTerritories);

  return {
    lockdownTerritories: territories,
    lockdownStatusByTerritory: summarizedTerritories
  };
}