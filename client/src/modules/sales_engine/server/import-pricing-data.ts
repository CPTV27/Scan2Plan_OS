import { db } from "./db";
import { pricingMatrix, upteamPricingMatrix, cadPricingMatrix, pricingParameters } from "@shared/schema";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

async function importPricingData() {
  try {
    console.log("Starting pricing data import...");

    // Import pricing_matrix.csv
    console.log("Importing pricing_matrix...");
    const pricingMatrixData = readFileSync("attached_assets/pricing_matrix_1763343524159.csv", "utf-8");
    const pricingRecords = parse(pricingMatrixData, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of pricingRecords) {
      await db.insert(pricingMatrix).values({
        id: parseInt(record.id),
        buildingTypeId: parseInt(record.building_type_id),
        areaTier: record.area_tier,
        discipline: record.discipline,
        lod: record.lod,
        ratePerSqFt: record.rate_per_sq_ft,
      }).onConflictDoNothing();
    }
    console.log(`Imported ${pricingRecords.length} pricing matrix records`);

    // Import upteam_pricing_matrix.csv
    console.log("Importing upteam_pricing_matrix...");
    const upteamPricingData = readFileSync("attached_assets/upteam_pricing_matrix_1763343524159.csv", "utf-8");
    const upteamRecords = parse(upteamPricingData, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of upteamRecords) {
      await db.insert(upteamPricingMatrix).values({
        id: parseInt(record.id),
        buildingTypeId: parseInt(record.building_type_id),
        areaTier: record.area_tier,
        discipline: record.discipline,
        lod: record.lod,
        ratePerSqFt: record.rate_per_sq_ft,
      }).onConflictDoNothing();
    }
    console.log(`Imported ${upteamRecords.length} upteam pricing matrix records`);

    // Import cad_pricing_matrix.csv
    console.log("Importing cad_pricing_matrix...");
    const cadPricingData = readFileSync("attached_assets/cad_pricing_matrix (1)_1763343524158.csv", "utf-8");
    const cadRecords = parse(cadPricingData, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of cadRecords) {
      await db.insert(cadPricingMatrix).values({
        id: parseInt(record.id),
        buildingTypeId: parseInt(record.building_type_id),
        areaTier: record.area_tier,
        packageType: record.package_type,
        ratePerSqFt: record.rate_per_sq_ft,
      }).onConflictDoNothing();
    }
    console.log(`Imported ${cadRecords.length} CAD pricing matrix records`);

    // Import pricing_parameters.csv
    console.log("Importing pricing_parameters...");
    const parametersData = readFileSync("attached_assets/pricing_parameters_1763343524159.csv", "utf-8");
    const parameterRecords = parse(parametersData, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of parameterRecords) {
      await db.insert(pricingParameters).values({
        id: parseInt(record.id),
        parameterKey: record.parameter_key,
        parameterValue: record.parameter_value,
        parameterType: record.parameter_type,
        description: record.description,
        category: record.category,
      }).onConflictDoNothing();
    }
    console.log(`Imported ${parameterRecords.length} pricing parameter records`);

    console.log("Pricing data import completed successfully!");
  } catch (error) {
    console.error("Error importing pricing data:", error);
    process.exit(1);
  }
}

importPricingData();
