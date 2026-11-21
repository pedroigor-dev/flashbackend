import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { RefundCase } from './support.types';

@Injectable()
export class SupportStore implements OnModuleDestroy {
  readonly db: DatabaseSync;

  constructor(config: ConfigService) {
    const file = config.get<string>('SUPPORT_DATABASE', './data/support.sqlite');
    if (file !== ':memory:') {
      mkdirSync(dirname(resolve(file)), { recursive: true });
    }
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS refund_cases (id TEXT PRIMARY KEY, session TEXT NOT NULL, transaction_id TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(session, transaction_id));
      CREATE TABLE IF NOT EXISTS support_requests (session TEXT NOT NULL, request_key TEXT NOT NULL, fingerprint TEXT NOT NULL, case_id TEXT NOT NULL, PRIMARY KEY(session, request_key));
      CREATE TABLE IF NOT EXISTS support_outbox (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS support_processed (id TEXT PRIMARY KEY);
    `);
  }

  transaction<T>(action: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = action();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  find(id: string): RefundCase | undefined {
    const row = this.db.prepare('SELECT payload FROM refund_cases WHERE id = ?').get(id);
    return row ? JSON.parse(row.payload as string) : undefined;
  }

  save(item: RefundCase) {
    this.db
      .prepare(
        'INSERT INTO refund_cases (id, session, transaction_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
      )
      .run(item.id, item.session, item.transactionId, JSON.stringify(item));
  }

  list(session: string): RefundCase[] {
    return this.db
      .prepare('SELECT payload FROM refund_cases WHERE session = ? ORDER BY rowid DESC')
      .all(session)
      .map((row) => JSON.parse(row.payload as string));
  }

  onModuleDestroy() {
    this.db.close();
  }
}
