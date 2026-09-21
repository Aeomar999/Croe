import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add pin_hash to users
  pgm.addColumn("users", {
    pin_hash: {
      type: "CHAR(64)",
      default: null,
    },
  });

  // Create user_preferences table
  pgm.createTable(
    "user_preferences",
    {
      user_id: {
        type: "UUID",
        primaryKey: true,
        references: "users(user_id)",
        onDelete: "CASCADE",
      },
      push_notifications_enabled: { type: "BOOLEAN", notNull: true, default: true },
      email_notifications_enabled: { type: "BOOLEAN", notNull: true, default: true },
      sms_notifications_enabled: { type: "BOOLEAN", notNull: true, default: true },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true }
  );

  // Trigger to auto-create preferences for new users?
  // Or we just insert default on demand. We'll handle it in the service layer.
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("user_preferences", { ifExists: true });
  pgm.dropColumn("users", "pin_hash", { ifExists: true });
}
