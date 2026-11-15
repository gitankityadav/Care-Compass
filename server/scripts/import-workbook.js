
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import XLSX from 'xlsx';

const { Pool } = pg;

const file =
  process.argv[2] ||
  path.resolve('data/Care_Compass_Synthetic_Data.xlsx');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (!fs.existsSync(file)) {
  throw new Error(`Workbook not found: ${file}`);
}

const wb = XLSX.readFile(file, { cellDates: true });

const ignored = new Set([
  'START_HERE',
  'relationship_map',
  'QA_validation',
  'data_dictionary',
  'Golden_scenarios'
]);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.PGSSLMODE === 'require'
      ? { rejectUnauthorized: false }
      : undefined
});

const client = await pool.connect();

let inserted = 0;

try {
  await client.query('BEGIN');
  await client.query('SET CONSTRAINTS ALL DEFERRED');

  if (process.argv.includes('--replace')) {
    const tables = wb.SheetNames.filter(
      sheet => !ignored.has(sheet)
    );

    await client.query(
      `TRUNCATE ${tables
        .map(table => `"${table.replaceAll('"', '""')}"`)
        .join(',')} RESTART IDENTITY CASCADE`
    );
  }

  for (const sheet of wb.SheetNames) {
    if (ignored.has(sheet)) continue;

    const rows = XLSX.utils.sheet_to_json(
      wb.Sheets[sheet],
      { defval: null, raw: true }
    );

    if (!rows.length) continue;

    const columns = Object.keys(rows[0]);

    const colSql = columns
      .map(column => `"${column.replaceAll('"', '""')}"`)
      .join(',');

    for (let offset = 0; offset < rows.length; offset += 300) {
      const batch = rows.slice(offset, offset + 300);

      const values = [];
      const tuples = [];

      for (const row of batch) {
        const marks = columns.map(column => {
          let value = row[column];

          if (value instanceof Date) {
            value = value.toISOString();
          }

          // Convert blank or missing cells into SQL NULL.
          if (
            value === undefined ||
            value === null ||
            (typeof value === 'string' && value.trim() === '')
          ) {
            value = null;
          }

          values.push(value);

          return `$${values.length}`;
        });

        tuples.push(`(${marks.join(',')})`);
      }

      await client.query(
        `INSERT INTO "${sheet}" (${colSql})
         VALUES ${tuples.join(',')}
         ON CONFLICT DO NOTHING`,
        values
      );

      inserted += batch.length;
    }

    console.log(`${sheet}: ${rows.length} rows`);
  }

  await client.query('COMMIT');

  console.log(
    `Import complete. Source rows processed: ${inserted}`
  );

} catch (error) {
  await client.query('ROLLBACK');

  console.error('Import rolled back:', error.message);

  process.exitCode = 1;

} finally {
  client.release();
  await pool.end();
}
