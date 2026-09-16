import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const migration = join(
  testsDirectory,
  "..",
  "..",
  "prisma",
  "migrations",
  "20261204000000_whatsapp_incoming_event_inbox",
  "migration.sql"
);
const outgoingMigration = join(
  testsDirectory,
  "..",
  "..",
  "prisma",
  "migrations",
  "20261206000000_whatsapp_outgoing_event_outbox",
  "migration.sql"
);

test("WhatsApp incoming events have a durable deduplicated retry inbox", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());

  await database.exec(`
    CREATE FUNCTION gen_random_uuid() RETURNS uuid LANGUAGE SQL AS $$
      SELECT '00000000-0000-0000-0000-000000000001'::uuid;
    $$;
  `);
  await database.exec(await readFile(migration, "utf8"));
  await database.exec(
    'CREATE TABLE "chat_conversations" ("id" UUID PRIMARY KEY);'
  );
  await database.exec(await readFile(outgoingMigration, "utf8"));
  await database.exec(`
    INSERT INTO "incoming_whatsapp_events" (
      "wa_message_id", "kind", "whatsapp_phone", "payload", "received_at"
    ) VALUES (
      'wamid.inbox-1', 'message', '5215550000000', '{"text":"Hola"}', CURRENT_TIMESTAMP
    );
    UPDATE "incoming_whatsapp_events"
    SET
      "status" = 'fallido',
      "attempts_count" = 1,
      "last_error" = 'Temporary gateway error',
      "available_at" = CURRENT_TIMESTAMP
    WHERE "wa_message_id" = 'wamid.inbox-1';
  `);

  const persisted = await database.query(`
    SELECT "status", "attempts_count", "last_error"
    FROM "incoming_whatsapp_events"
    WHERE "wa_message_id" = 'wamid.inbox-1';
  `);
  assert.deepEqual(persisted.rows, [
    {
      status: "fallido",
      attempts_count: 1,
      last_error: "Temporary gateway error"
    }
  ]);

  await assert.rejects(() =>
    database.exec(`
      INSERT INTO "incoming_whatsapp_events" (
        "wa_message_id", "kind", "whatsapp_phone", "payload", "received_at"
      ) VALUES (
        'wamid.inbox-1', 'message', '5215550000000', '{"text":"Duplicado"}', CURRENT_TIMESTAMP
      );
    `)
  );

  await database.exec(`
    UPDATE "incoming_whatsapp_events"
    SET "status" = 'procesado', "processed_at" = CURRENT_TIMESTAMP
    WHERE "wa_message_id" = 'wamid.inbox-1';
    INSERT INTO "outgoing_whatsapp_events" (
      "incoming_event_id", "sequence", "whatsapp_phone", "content_text"
    )
    SELECT "id", 0, '5215550000000', 'Respuesta pendiente'
    FROM "incoming_whatsapp_events"
    WHERE "wa_message_id" = 'wamid.inbox-1';
    UPDATE "outgoing_whatsapp_events"
    SET "status" = 'fallido', "attempts_count" = 1
    WHERE "sequence" = 0;
  `);

  const outbound = await database.query(`
    SELECT
      "incoming_whatsapp_events"."status" AS "incoming_status",
      "outgoing_whatsapp_events"."status",
      "outgoing_whatsapp_events"."attempts_count",
      "outgoing_whatsapp_events"."content_text"
    FROM "outgoing_whatsapp_events"
    JOIN "incoming_whatsapp_events"
      ON "incoming_whatsapp_events"."id" = "outgoing_whatsapp_events"."incoming_event_id";
  `);
  assert.deepEqual(outbound.rows, [
    {
      incoming_status: "procesado",
      status: "fallido",
      attempts_count: 1,
      content_text: "Respuesta pendiente"
    }
  ]);
  await assert.rejects(() =>
    database.exec(`
      INSERT INTO "outgoing_whatsapp_events" (
        "incoming_event_id", "sequence", "whatsapp_phone", "content_text"
      )
      SELECT "id", 0, '5215550000000', 'Respuesta duplicada'
      FROM "incoming_whatsapp_events"
      WHERE "wa_message_id" = 'wamid.inbox-1';
    `)
  );
});
