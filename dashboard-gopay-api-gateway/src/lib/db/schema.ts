import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  apiKey: text('api_key').unique(),
  qrisStatic: text('qris_static'),
  encryptedQrisStatic: text('encrypted_qris_static'),
  emailHash: text('email_hash').notNull().unique(),
  phoneHash: text('phone_hash').notNull().unique(),
  encryptedEmail: text('encrypted_email').notNull(),
  encryptedPhoneNumber: text('encrypted_phone_number').notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  pinSalt: text('pin_salt').notNull(),
  encryptedDekByPin: text('encrypted_dek_by_pin').notNull(),
  encryptedDekByPassword: text('encrypted_dek_by_password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const merchantSessionsTable = pgTable('merchant_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  encryptedMerchantId: text('encrypted_merchant_id'),
  encryptedOutletName: text('encrypted_outlet_name'),
  encryptedPhoneNumber: text('encrypted_phone_number'),
  encryptedAccessToken: text('encrypted_access_token'),
  encryptedRefreshToken: text('encrypted_refresh_token'),
  encryptedCookie: text('encrypted_cookie'),
  tokenStatus: text('token_status').default('invalid'),
  expiresAt: timestamp('expires_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const qrisOrdersTable = pgTable('qris_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  qrisId: text('qris_id').notNull(),
  trxId: text('trx_id').notNull(),
  nominal: integer('nominal').notNull(),
  encryptedQrisPayload: text('encrypted_qris_payload').notNull(),
  status: text('status').default('PENDING').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactionsTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  gojekTransactionId: text('gojek_transaction_id'),
  orderId: text('order_id'),
  nominal: integer('nominal').notNull(),
  metodeBayar: text('metode_bayar'),
  issuer: text('issuer'),
  status: text('status').default('success').notNull(),
  waktuTransaksi: timestamp('waktu_transaksi'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogsTable = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  logType: text('log_type').notNull(),
  encryptedMessage: text('encrypted_message').notNull(),
  detailsJson: text('details_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserRecord = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type MerchantSessionRecord = typeof merchantSessionsTable.$inferSelect;
export type QrisOrderRecord = typeof qrisOrdersTable.$inferSelect;
export type TransactionRecord = typeof transactionsTable.$inferSelect;
export type ActivityLogRecord = typeof activityLogsTable.$inferSelect;
