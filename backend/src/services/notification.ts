import type { PoolClient } from "pg";
import { getTransactionClient } from "../db/pool.js";
import { logger } from "../config/logger.js";

export type NotifyContext = {
  transactionId?: string;
  vendorId?: string;
  buyerId?: string;
  offenderId?: string;
  userId?: string;
  variables?: Record<string, string>;
};

type NotificationRow = {
  notification_id: string;
  user_id: string;
  transaction_id: string | null;
  channel: string;
  template_key: string;
  status: string;
  sent_at: Date | null;
  variables: Record<string, unknown> | null;
  retry_count: number;
  created_at: Date;
};

type UserRow = {
  user_id: string;
  phone_number: string | null;
  push_token: string | null;
};

type NotificationMatrixEntry = {
  recipients: "vendor" | "buyer" | "both" | "offender" | "user" | "recipient";
  channels: Array<"PUSH" | "SMS">;
  templateKey: string;
};

export const NOTIFICATION_MATRIX: Record<string, NotificationMatrixEntry> = {
  FUNDS_SECURED: {
    recipients: "both",
    channels: ["PUSH", "SMS"],
    templateKey: "funds_secured",
  },
  SHIPPED: {
    recipients: "buyer",
    channels: ["PUSH"],
    templateKey: "order_shipped",
  },
  DELIVERY_CONFIRMED: {
    recipients: "vendor",
    channels: ["PUSH"],
    templateKey: "delivery_confirmed",
  },
  FUNDS_RELEASED: {
    recipients: "both",
    channels: ["PUSH", "SMS"],
    templateKey: "funds_released",
  },
  DISPUTE_OPENED: {
    recipients: "both",
    channels: ["PUSH", "SMS"],
    templateKey: "dispute_opened",
  },
  UNDER_HUMAN_REVIEW: {
    recipients: "both",
    channels: ["PUSH"],
    templateKey: "dispute_review",
  },
  FUNDS_REFUNDED: {
    recipients: "both",
    channels: ["PUSH", "SMS"],
    templateKey: "funds_refunded",
  },
  FRAUD_LOCKOUT: {
    recipients: "offender",
    channels: ["PUSH"],
    templateKey: "account_flagged",
  },
  EXPIRED: {
    recipients: "both",
    channels: ["PUSH"],
    templateKey: "deposit_expired",
  },
  PAYOUT_FAILED: {
    recipients: "recipient",
    channels: ["PUSH", "SMS"],
    templateKey: "payout_failed",
  },
  KYC_APPROVED: {
    recipients: "user",
    channels: ["PUSH"],
    templateKey: "kyc_result",
  },
  KYC_REJECTED: {
    recipients: "user",
    channels: ["PUSH"],
    templateKey: "kyc_result",
  },
};

const CRITICAL_PUSH_FALLBACK_TEMPLATES = new Set([
  "funds_secured",
  "funds_released",
  "funds_refunded",
  "dispute_opened",
]);

function buildVariables(
  transactionId: string | undefined,
  provided: Record<string, string> | undefined,
): Record<string, string> {
  const base: Record<string, string> = {};
  if (transactionId) {
    base.ref = transactionId.slice(0, 8);
  }
  if (provided) {
    Object.assign(base, provided);
  }
  return base;
}

function resolveUserIds(
  config: NotificationMatrixEntry,
  ctx: NotifyContext,
): string[] {
  switch (config.recipients) {
    case "vendor":
      return ctx.vendorId ? [ctx.vendorId] : [];
    case "buyer":
      return ctx.buyerId ? [ctx.buyerId] : [];
    case "both": {
      const ids: string[] = [];
      if (ctx.vendorId) ids.push(ctx.vendorId);
      if (ctx.buyerId) ids.push(ctx.buyerId);
      return ids;
    }
    case "offender":
      return ctx.offenderId ? [ctx.offenderId] : [];
    case "user":
      return ctx.userId ? [ctx.userId] : [];
    case "recipient":
      return ctx.vendorId ? [ctx.vendorId] : [];
  }
}

async function fetchUsers(
  client: PoolClient,
  userIds: string[],
): Promise<Map<string, UserRow>> {
  if (userIds.length === 0) return new Map();
  const { rows } = await client.query<UserRow>(
    `SELECT user_id, phone_number, push_token FROM users WHERE user_id = ANY($1)`,
    [userIds],
  );
  const map = new Map<string, UserRow>();
  for (const row of rows) {
    map.set(row.user_id, row);
  }
  return map;
}

async function dispatchPush(
  templateKey: string,
  variables: Record<string, string>,
): Promise<void> {
  logger.info({ templateKey, variables }, "Push notification sent: " + templateKey);
}

async function dispatchSms(
  templateKey: string,
  variables: Record<string, string>,
): Promise<void> {
  logger.info({ templateKey, variables }, "SMS notification sent: " + templateKey);
}

async function insertAndDispatch(
  client: PoolClient,
  p: {
    userId: string;
    transactionId: string | null;
    channel: "PUSH" | "SMS";
    templateKey: string;
    variables: Record<string, string>;
    user: UserRow;
  },
): Promise<void> {
  const { rows } = await client.query<NotificationRow>(
    `INSERT INTO notifications (user_id, transaction_id, channel, template_key, status, variables)
     VALUES ($1, $2, $3, $4, 'QUEUED', $5)
     RETURNING *`,
    [p.userId, p.transactionId, p.channel, p.templateKey, JSON.stringify(p.variables)],
  );

  const notificationId = rows[0]!.notification_id;

  try {
    if (p.channel === "PUSH") {
      await dispatchPush(p.templateKey, p.variables);
    } else {
      await dispatchSms(p.templateKey, p.variables);
    }

    await client.query(
      `UPDATE notifications SET status = 'SENT', sent_at = NOW() WHERE notification_id = $1`,
      [notificationId],
    );
  } catch (err) {
    await client.query(
      `UPDATE notifications SET status = 'FAILED' WHERE notification_id = $1`,
      [notificationId],
    );
    logger.warn({ err, notificationId, templateKey: p.templateKey }, "Notification dispatch failed");
  }
}

export async function notify(
  stateChange: string,
  ctx: NotifyContext,
): Promise<void> {
  const config = NOTIFICATION_MATRIX[stateChange];
  if (!config) {
    logger.debug({ stateChange }, "No notification matrix entry for state change");
    return;
  }

  const userIds = resolveUserIds(config, ctx);
  if (userIds.length === 0) {
    logger.debug({ stateChange }, "No recipients resolved for notification");
    return;
  }

  const variables = buildVariables(ctx.transactionId, ctx.variables);

  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const userMap = await fetchUsers(client, userIds);

    for (const userId of userIds) {
      const user = userMap.get(userId);
      if (!user) {
        logger.warn({ userId, stateChange }, "User not found for notification");
        continue;
      }

      for (const channel of config.channels) {
        if (channel === "PUSH" && !user.push_token) {
          if (CRITICAL_PUSH_FALLBACK_TEMPLATES.has(config.templateKey)) {
            await insertAndDispatch(client, {
              userId,
              transactionId: ctx.transactionId ?? null,
              channel: "SMS",
              templateKey: config.templateKey,
              variables,
              user,
            });
          } else {
            logger.debug(
              { userId, templateKey: config.templateKey },
              "Skipping PUSH: no push_token and not critical",
            );
          }
          continue;
        }

        await insertAndDispatch(client, {
          userId,
          transactionId: ctx.transactionId ?? null,
          channel,
          templateKey: config.templateKey,
          variables,
          user,
        });
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function retryFailedNotifications(): Promise<{ retried: number }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<NotificationRow>(
      `SELECT * FROM notifications
       WHERE status = 'FAILED' AND retry_count < 3 AND created_at > NOW() - INTERVAL '1 hour'
       FOR UPDATE`,
    );

    let retried = 0;

    for (const notification of rows) {
      await client.query(
        `UPDATE notifications SET retry_count = retry_count + 1 WHERE notification_id = $1`,
        [notification.notification_id],
      );

      try {
        const variables =
          notification.variables && typeof notification.variables === "object"
            ? (notification.variables as Record<string, string>)
            : {};

        if (notification.channel === "PUSH") {
          await dispatchPush(notification.template_key, variables);
        } else {
          await dispatchSms(notification.template_key, variables);
        }

        await client.query(
          `UPDATE notifications SET status = 'SENT', sent_at = NOW() WHERE notification_id = $1`,
          [notification.notification_id],
        );
      } catch (err) {
        logger.warn(
          { err, notificationId: notification.notification_id },
          "Notification retry dispatch failed",
        );
      }

      retried++;
    }

    await client.query("COMMIT");
    return { retried };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getNotificationHistory(
  userId: string,
  limit: number = 50,
): Promise<
  Array<{
    notificationId: string;
    channel: string;
    templateKey: string;
    status: string;
    createdAt: Date;
  }>
> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<NotificationRow>(
      `SELECT notification_id, channel, template_key, status, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    return rows.map((row) => ({
      notificationId: row.notification_id,
      channel: row.channel,
      templateKey: row.template_key,
      status: row.status,
      createdAt: row.created_at,
    }));
  } finally {
    client.release();
  }
}
