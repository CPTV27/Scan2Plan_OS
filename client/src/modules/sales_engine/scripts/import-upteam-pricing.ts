import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { db } from '../server/db';
import { upteamPricingMatrix } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const AREA_TIERS = [
  '0-5k',
  '5k-10k',
  '10k-20k',
  '20k-30k',
  '30k-40k',
  '40k-50k',
  '50k-75k',
  '75k-100k',
  '100k+'
];

const DISCIPLINES = ['architecture', 'structure', 'mepf', 'site'];
const LODS = ['200', '300', '350', '350+'];

interface PricingUpdate {
  buildingTypeId: number;
  areaTier: string;
  discipline: string;
  lod: string;
  ratePerSqFt: string;
}

async function importUpteamPricing() {
  const csvContent = readFileSync('attached_assets/Pricing Matrix 2025 Last Edited 03.07 - UppT PRICING SCAN TO BIM (1)_1763604534747.csv', 'utf-8');
  
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true
  });

  const updates: PricingUpdate[] = [];
  let currentBuildingType: number | null = null;
  let inDataSection = false;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    
    // Check if this is a building type header row
    if (row[0] && !isNaN(parseInt(row[0])) && row[1] && row[1].length > 10) {
      currentBuildingType = parseInt(row[0]);
      inDataSection = false;
      continue;
    }

    // Check if this is the column header row with "Discipline →"
    if (row[1] === 'Discipline →') {
      inDataSection = false;
      continue;
    }

    // Check if this is the area header row with "Area ↓"
    if (row[1] === 'Area ↓') {
      inDataSection = true;
      continue;
    }

    // Process data rows
    if (inDataSection && currentBuildingType && row[1] && AREA_TIERS.includes(row[1])) {
      const areaTier = row[1];
      
      // Architecture: columns 2-5 (LOD 200, 300, 350, 350+)
      for (let lodIdx = 0; lodIdx < 4; lodIdx++) {
        const colIdx = 2 + lodIdx;
        if (row[colIdx]) {
          const rate = parseFloat(row[colIdx]);
          if (!isNaN(rate)) {
            updates.push({
              buildingTypeId: currentBuildingType,
              areaTier,
              discipline: 'architecture',
              lod: LODS[lodIdx],
              ratePerSqFt: rate.toFixed(4)
            });
          }
        }
      }

      // Structure: columns 6-9 (LOD 200, 300, 350, 350+)
      for (let lodIdx = 0; lodIdx < 4; lodIdx++) {
        const colIdx = 6 + lodIdx;
        if (row[colIdx]) {
          const rate = parseFloat(row[colIdx]);
          if (!isNaN(rate)) {
            updates.push({
              buildingTypeId: currentBuildingType,
              areaTier,
              discipline: 'structure',
              lod: LODS[lodIdx],
              ratePerSqFt: rate.toFixed(4)
            });
          }
        }
      }

      // MEPF: columns 10-13 (LOD 200, 300, 350, 350+)
      for (let lodIdx = 0; lodIdx < 4; lodIdx++) {
        const colIdx = 10 + lodIdx;
        if (row[colIdx]) {
          const rate = parseFloat(row[colIdx]);
          if (!isNaN(rate)) {
            updates.push({
              buildingTypeId: currentBuildingType,
              areaTier,
              discipline: 'mepf',
              lod: LODS[lodIdx],
              ratePerSqFt: rate.toFixed(4)
            });
          }
        }
      }

      // Site/topography: columns 14-17 (LOD 200, 300, 350, 350+)
      for (let lodIdx = 0; lodIdx < 4; lodIdx++) {
        const colIdx = 14 + lodIdx;
        if (row[colIdx]) {
          const rate = parseFloat(row[colIdx]);
          if (!isNaN(rate)) {
            updates.push({
              buildingTypeId: currentBuildingType,
              areaTier,
              discipline: 'site',
              lod: LODS[lodIdx],
              ratePerSqFt: rate.toFixed(4)
            });
          }
        }
      }
    }
  }

  console.log(`Parsed ${updates.length} pricing records from CSV`);

  // Update database
  let updateCount = 0;
  let insertCount = 0;
  for (const update of updates) {
    try {
      const [existing] = await db
        .select()
        .from(upteamPricingMatrix)
        .where(
          and(
            eq(upteamPricingMatrix.buildingTypeId, update.buildingTypeId),
            eq(upteamPricingMatrix.areaTier, update.areaTier),
            eq(upteamPricingMatrix.discipline, update.discipline),
            eq(upteamPricingMatrix.lod, update.lod)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(upteamPricingMatrix)
          .set({ 
            ratePerSqFt: update.ratePerSqFt,
            updatedAt: new Date()
          })
          .where(eq(upteamPricingMatrix.id, existing.id));
        updateCount++;
      } else {
        // Insert new record
        await db.insert(upteamPricingMatrix).values({
          buildingTypeId: update.buildingTypeId,
          areaTier: update.areaTier,
          discipline: update.discipline,
          lod: update.lod,
          ratePerSqFt: update.ratePerSqFt,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        insertCount++;
      }
    } catch (error) {
      console.error(`Error processing record:`, update, error);
    }
  }

  console.log(`Updated ${updateCount} upteam pricing records in database`);
  console.log(`Inserted ${insertCount} new upteam pricing records in database`);
  process.exit(0);
}

importUpteamPricing().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
