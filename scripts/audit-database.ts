// Quick script to audit database table usage
// Run this to see what's actually being used

import { db } from "../shared/db";
import { sql } from "drizzle-orm";

interface TableStats {
  tableName: string;
  rowCount: number;
  lastUpdated: Date | null;
  sizeKb: number;
}

const TABLES_TO_AUDIT = [
  // Brand Engine (suspicious)
  'brand_personas', 'brand_voices', 'brand_values',
  'governance_red_lines', 'standard_definitions',
  'solution_mappings', 'negotiation_playbook',
  'intelligence_generated_content', 'generation_audit_logs',

  // Intel/Research (suspicious)
  'intel_news_items', 'intel_pipeline_runs', 'intel_agent_outputs',
  'intel_feed_sources', 'ai_research_memory', 'ai_learning_logs',

  // Integrations (check usage)
  'x_connections', 'x_monitored_accounts', 'x_saved_searches',
  'rfp_submissions', 'company_capabilities',

  // Legacy CPQ (might be unused)
  'cpq_pricing_matrix', 'cpq_upteam_pricing_matrix',
  'cpq_cad_pricing_matrix', 'cpq_pricing_parameters',

  // AI experimental
  'ai_analytics', 'ai_fact_citations', 'deal_predictions',
  'project_embeddings',

  // Marketing (to extract)
  'marketing_posts', 'case_studies', 'sequences',
  'events', 'personas',
];

async function auditTable(tableName: string): Promise<TableStats> {
  try {
    // Get row count
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`
    );
    const rowCount = Number(countResult.rows[0]?.count || 0);

    // Try to get last updated (assumes updated_at or created_at column)
    let lastUpdated: Date | null = null;
    try {
      const dateResult = await db.execute(
        sql`SELECT MAX(COALESCE(updated_at, created_at)) as last_updated FROM ${sql.identifier(tableName)}`
      );
      lastUpdated = dateResult.rows[0]?.last_updated || null;
    } catch {
      // Column might not exist
    }

    // Get table size
    const sizeResult = await db.execute(
      sql`SELECT pg_total_relation_size(${tableName}::regclass) / 1024 as size_kb`
    );
    const sizeKb = Number(sizeResult.rows[0]?.size_kb || 0);

    return { tableName, rowCount, lastUpdated, sizeKb };
  } catch (error) {
    console.error(`Error auditing ${tableName}:`, error);
    return { tableName, rowCount: -1, lastUpdated: null, sizeKb: 0 };
  }
}

async function main() {
  console.log('🔍 DATABASE AUDIT REPORT');
  console.log('========================\n');

  const stats: TableStats[] = [];

  for (const table of TABLES_TO_AUDIT) {
    const stat = await auditTable(table);
    stats.push(stat);
  }

  // Sort by row count (ascending - likely unused first)
  stats.sort((a, b) => a.rowCount - b.rowCount);

  console.log('📊 TABLES BY ROW COUNT (likely unused first):\n');
  console.log('Table Name'.padEnd(40), 'Rows'.padEnd(10), 'Last Updated'.padEnd(25), 'Size (KB)');
  console.log('-'.repeat(90));

  const now = new Date();
  const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));

  const candidatesForDeletion: string[] = [];

  for (const stat of stats) {
    const lastUpdatedStr = stat.lastUpdated
      ? stat.lastUpdated.toISOString().split('T')[0]
      : 'N/A';

    const rowsStr = stat.rowCount === -1 ? 'ERROR' : stat.rowCount.toString();
    const sizeStr = stat.sizeKb.toFixed(2);

    console.log(
      stat.tableName.padEnd(40),
      rowsStr.padEnd(10),
      lastUpdatedStr.padEnd(25),
      sizeStr
    );

    // Flag for deletion if:
    // - 0 rows, OR
    // - < 5 rows AND not updated in 6 months
    if (stat.rowCount === 0 ||
        (stat.rowCount < 5 && stat.lastUpdated && stat.lastUpdated < sixMonthsAgo)) {
      candidatesForDeletion.push(stat.tableName);
    }
  }

  console.log('\n\n🗑️  CANDIDATES FOR DELETION:\n');
  if (candidatesForDeletion.length === 0) {
    console.log('✅ All audited tables have data and recent activity!');
  } else {
    console.log(`Found ${candidatesForDeletion.length} tables that appear unused:\n`);
    candidatesForDeletion.forEach(table => {
      console.log(`  - ${table}`);
    });
    console.log('\n⚠️  Review these carefully before dropping!');
  }

  console.log('\n\n💡 RECOMMENDATIONS:\n');
  console.log('1. Tables with 0 rows → DROP immediately');
  console.log('2. Tables with < 5 rows and old data → Consider archiving to JSON + DROP');
  console.log('3. Tables with < 100 rows → Might be experimental/unused features');
  console.log('4. Review your code for references before dropping anything!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
