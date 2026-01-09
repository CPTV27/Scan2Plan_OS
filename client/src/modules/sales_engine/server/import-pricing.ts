import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { db } from './db';
import { pricingMatrix } from '../shared/schema';
import { sql } from 'drizzle-orm';

interface PricingEntry {
  buildingTypeId: number;
  areaTier: string;
  discipline: string;
  lod: string;
  ratePerSqFt: string;
}

async function importPricingData() {
  console.log('Starting pricing data import...');

  const tsvPath = path.join(process.cwd(), 'attached_assets', 'Pricing Matrix 2025 Last Edited 03.07 - SCAN 2 PLAN PRICES - Mar 25_1763520919255.tsv');
  
  // Read and pre-process the file
  let fileContent = fs.readFileSync(tsvPath, 'utf-8');
  // Convert Windows CRLF to LF and normalize Unicode
  fileContent = fileContent.replace(/\r\n/g, '\n').normalize('NFC');

  const pricingEntries: PricingEntry[] = [];
  let currentBuildingType = 0;
  let haveDisciplineHeader = false;
  let haveAreaHeader = false;

  const disciplines = ['architecture', 'structure', 'mepf', 'site'];
  const lods = ['200', '300', '350', '350+'];

  // Parse TSV
  const parser = parse(fileContent, {
    delimiter: '\t',
    relax_column_count: true,
    bom: true,
    skip_empty_lines: true,
  });

  for await (const row of parser) {
    // Trim all values
    const cleanRow = row.map((cell: string) => cell.trim());

    // Check for "Price Matrix for Scan-to-CAD" marker - stop parsing
    if (cleanRow.some((cell: string) => cell.includes('Price Matrix for Scan-to-CAD'))) {
      break;
    }

    // Check for building type header: [empty] [number] [description]
    if (cleanRow[1] && cleanRow[1].match(/^\d+$/) && cleanRow[2]) {
      const typeId = parseInt(cleanRow[1]);
      if (typeId >= 1 && typeId <= 13) {
        currentBuildingType = typeId;
        haveDisciplineHeader = false;
        haveAreaHeader = false;
        console.log(`Processing Building Type ${typeId}: ${cleanRow[2]}`);
        continue;
      }
    }

    // Check for "Discipline →" header line
    if (cleanRow.some((cell: string) => cell.includes('Discipline'))) {
      haveDisciplineHeader = true;
      continue;
    }

    // Check for "Area ↓" header line with LOD levels
    if (cleanRow.some((cell: string) => cell.includes('Area')) && cleanRow.some((cell: string) => cell.includes('LOD'))) {
      haveAreaHeader = true;
      continue;
    }

    // Parse data lines: [empty] [empty] [area tier] [16 numeric values]
    if (currentBuildingType > 0 && haveDisciplineHeader && haveAreaHeader) {
      // Area tier should be in column 2
      const areaTier = cleanRow[2];
      
      // Check if this looks like an area tier (0-5k, 5k-10k, etc.)
      if (areaTier && areaTier.match(/^\d+k?-?\d*k?\+?$/)) {
        // Extract numeric values starting from column 3
        const rates: number[] = [];
        for (let i = 3; i < cleanRow.length && rates.length < 16; i++) {
          const val = cleanRow[i];
          if (val && val.match(/^\d+(\.\d+)?$/)) {
            rates.push(parseFloat(val));
          }
        }

        // Validate we have exactly 16 rates
        if (rates.length === 16) {
          // Map to 4 disciplines × 4 LOD levels
          for (let discIdx = 0; discIdx < 4; discIdx++) {
            for (let lodIdx = 0; lodIdx < 4; lodIdx++) {
              const rateIdx = discIdx * 4 + lodIdx;
              const rate = rates[rateIdx];

              pricingEntries.push({
                buildingTypeId: currentBuildingType,
                areaTier,
                discipline: disciplines[discIdx],
                lod: lods[lodIdx],
                ratePerSqFt: rate.toFixed(4),
              });
            }
          }
        } else if (rates.length > 0) {
          console.warn(`Warning: Building Type ${currentBuildingType}, Area ${areaTier} has ${rates.length} rates (expected 16)`);
        }
      }
    }
  }

  console.log(`Parsed ${pricingEntries.length} pricing entries`);

  // Clear existing pricing data
  console.log('Clearing existing pricing data...');
  await db.execute(sql`TRUNCATE TABLE pricing_matrix`);

  // Insert new pricing data in batches
  console.log('Inserting new pricing data...');
  const batchSize = 200;
  for (let i = 0; i < pricingEntries.length; i += batchSize) {
    const batch = pricingEntries.slice(i, i + batchSize);
    await db.insert(pricingMatrix).values(batch.map((entry, idx) => ({
      id: i + idx + 1,
      buildingTypeId: entry.buildingTypeId,
      areaTier: entry.areaTier,
      discipline: entry.discipline,
      lod: entry.lod,
      ratePerSqFt: entry.ratePerSqFt,
    })));
  }

  console.log(`✓ Successfully imported ${pricingEntries.length} pricing entries`);
}

// Run import
importPricingData()
  .then(() => {
    console.log('Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
