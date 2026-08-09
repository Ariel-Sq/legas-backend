/* eslint-disable no-console */
/**
 * Admin-via-chat order transition tool. Updates the order status following
 * the permitted post-payment graph, sends the customer email (if SMTP is
 * configured) and prints a ready-to-send WhatsApp link.
 *
 * Usage (point DB_* env at the target DB, e.g. Neon for prod):
 *   npx ts-node -r tsconfig-paths/register scripts/transition-order.ts <orderId|shortId> <status>
 *
 * <status>: preparing | ready | shipped | delivered | cancelled | refunded
 */
import dataSource from '../src/typeorm.config';
import { OrderStatus } from '../src/payments/entities/order.entity';
import {
  orderEmailFor,
  orderWhatsAppFor,
} from '../src/notifications/order-emails';
import { EmailService } from '../src/notifications/email.service';

const STATUS_ALIASES: Record<string, OrderStatus> = {
  preparing: OrderStatus.PAID_PREPARING,
  ready: OrderStatus.PAID_READY_TO_SHIP,
  shipped: OrderStatus.PAID_SHIPPED,
  delivered: OrderStatus.PAID_DELIVERED,
  cancelled: OrderStatus.CANCELLED,
  refunded: OrderStatus.REFUNDED,
};

// Same graph the old admin endpoint enforced: forward-only post-payment
// lifecycle; cancel/refund allowed from any paid state.
const ALLOWED: Record<string, OrderStatus[]> = {
  [OrderStatus.PROCESSING_PAYMENT]: [OrderStatus.CANCELLED],
  // Offline order: admin confirms the transfer/cash payment → preparing.
  [OrderStatus.PENDING_TRANSFER]: [
    OrderStatus.PAID_PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID_PREPARING]: [
    OrderStatus.PAID_READY_TO_SHIP,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.PAID_READY_TO_SHIP]: [
    OrderStatus.PAID_SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.PAID_SHIPPED]: [
    OrderStatus.PAID_DELIVERED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.PAID_DELIVERED]: [OrderStatus.REFUNDED],
};

async function main() {
  const [idArg, statusArg] = process.argv.slice(2);
  if (!idArg || !statusArg || !STATUS_ALIASES[statusArg]) {
    console.error(
      'Usage: transition-order.ts <orderId|shortId> <preparing|ready|shipped|delivered|cancelled|refunded>',
    );
    process.exit(2);
  }
  const next = STATUS_ALIASES[statusArg];

  await dataSource.initialize();
  try {
    // Accept the full uuid or the 8-char short id shown to customers.
    const rows: {
      id: string;
      status: OrderStatus;
      customerEmail: string | null;
      customerPhone: string | null;
      userName: string | null;
    }[] = await dataSource.query(
      `SELECT o.id, o.status, o."customerEmail", o."customerPhone",
              u."firstName" AS "userName"
       FROM orders o LEFT JOIN users u ON u.id = o."userId"
       WHERE o.id::text = $1 OR o.id::text ILIKE $2
       LIMIT 2`,
      [idArg, `${idArg}%`],
    );
    if (rows.length === 0) {
      console.error(`Order "${idArg}" not found.`);
      process.exit(1);
    }
    if (rows.length > 1) {
      console.error(`Ambiguous short id "${idArg}" — use the full uuid.`);
      process.exit(1);
    }
    const order = rows[0];

    if (!(ALLOWED[order.status] ?? []).includes(next)) {
      console.error(
        `Transition ${order.status} → ${next} not allowed. Allowed: ${(ALLOWED[order.status] ?? []).join(', ') || 'none'}`,
      );
      process.exit(1);
    }

    await dataSource.query(
      `UPDATE orders SET status = $1, "updatedAt" = now() WHERE id = $2`,
      [next, order.id],
    );
    console.log(`✔ Order ${order.id.slice(0, 8)} → ${next}`);

    // Customer email (skips silently when SMTP is not configured).
    const email = orderEmailFor(next, order.id);
    if (email && order.customerEmail) {
      const mailer = new EmailService();
      const sent = await mailer.send(
        order.customerEmail,
        email.subject,
        email.text,
      );
      console.log(
        sent
          ? `✔ Email sent to ${order.customerEmail}`
          : `— Email NOT sent (SMTP not configured or failed)`,
      );
    }

    // Ready-to-send WhatsApp link for the admin.
    const wa = orderWhatsAppFor(next, order.id, order.userName);
    if (wa && order.customerPhone) {
      const phone = order.customerPhone.replace(/[^\d]/g, '');
      const intl = phone.startsWith('54') ? phone : `54${phone}`;
      console.log(`\n📱 WhatsApp listo para enviar:`);
      console.log(`https://wa.me/${intl}?text=${encodeURIComponent(wa)}`);
    } else if (wa) {
      console.log(`\n📱 Mensaje sugerido (sin teléfono en la orden):\n${wa}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('transition-order failed:', err);
  process.exit(1);
});
