import { Order, OrderStatus } from '@app/payments/entities/order.entity';

export interface OrderEmailContent {
  subject: string;
  text: string;
}

const WHATSAPP = 'https://wa.me/5491134414929';

/**
 * Public storefront URL for links inside the emails. Configurable via
 * FRONTEND_URL (set it in prod, e.g. https://legasmuebles.com); falls back to
 * the legacy domain so a missing env doesn't produce broken links.
 */
const FRONTEND_URL = (
  process.env.FRONTEND_URL ?? 'https://legas.vercel.app'
).replace(/\/$/, '');
const ORDERS_URL = `${FRONTEND_URL}/orders`;
const ARREPENTIMIENTO_URL = `${FRONTEND_URL}/arrepentimiento`;

/**
 * Plain-text customer emails per order status, in the store's voice
 * (Spanish, voseo). Plain text on purpose: better deliverability from a
 * plain SMTP sender and nothing to maintain. Statuses without an entry
 * (e.g. processing_payment) don't notify.
 */
export function orderEmailFor(
  status: OrderStatus,
  orderId: string,
): OrderEmailContent | null {
  const shortId = orderId.slice(0, 8).toUpperCase();
  switch (status) {
    case OrderStatus.PENDING_TRANSFER:
      return {
        subject: `Pedido ${shortId} recibido — coordinamos el pago — Legas Muebles`,
        text:
          `¡Gracias por tu compra!\n\n` +
          `Registramos tu pedido ${shortId}. Elegiste pagar por transferencia ` +
          `o efectivo, así que te vamos a escribir por WhatsApp para pasarte los ` +
          `datos y coordinar el pago y la entrega. Tu pedido queda reservado.\n\n` +
          `Podés seguir el estado en ${ORDERS_URL}\n\n` +
          `O escribinos vos: ${WHATSAPP}\n\n— Legas Muebles`,
      };
    case OrderStatus.PAID_PREPARING:
      return {
        subject: `¡Pago confirmado! Pedido ${shortId} — Legas Muebles`,
        text:
          `¡Gracias por tu compra!\n\n` +
          `Recibimos el pago de tu pedido ${shortId} y ya estamos preparando ` +
          `todo para la fabricación. Como nuestros muebles se hacen a pedido, ` +
          `en breve te escribimos por WhatsApp para coordinar detalles y plazos.\n\n` +
          `Podés seguir el estado en ${ORDERS_URL}\n\n` +
          `Cualquier duda: ${WHATSAPP}\n\n— Legas Muebles`,
      };
    case OrderStatus.PAID_READY_TO_SHIP:
      return {
        subject: `Tu pedido ${shortId} está listo para enviar — Legas Muebles`,
        text:
          `¡Buenas noticias!\n\n` +
          `Tu pedido ${shortId} ya está terminado y listo para despachar. ` +
          `Te contactamos por WhatsApp para coordinar la entrega.\n\n` +
          `Estado: ${ORDERS_URL}\n\nCualquier duda: ${WHATSAPP}\n\n— Legas Muebles`,
      };
    case OrderStatus.PAID_SHIPPED:
      return {
        subject: `Tu pedido ${shortId} está en camino 🚚 — Legas Muebles`,
        text:
          `¡Tu pedido ${shortId} ya salió!\n\n` +
          `Está en camino a la dirección coordinada. Cualquier detalle de la ` +
          `entrega lo resolvemos por WhatsApp.\n\n` +
          `Estado: ${ORDERS_URL}\n\nCualquier duda: ${WHATSAPP}\n\n— Legas Muebles`,
      };
    case OrderStatus.PAID_DELIVERED:
      return {
        subject: `Pedido ${shortId} entregado — ¡que lo disfrutes! — Legas Muebles`,
        text:
          `Tu pedido ${shortId} fue entregado.\n\n` +
          `Esperamos que lo disfrutes muchos años. Si querés, dejanos una ` +
          `reseña desde ${ORDERS_URL} — nos ayuda un montón.\n\n` +
          `Recordá que tenés 10 días para arrepentirte de la compra sin costo ` +
          `(${ARREPENTIMIENTO_URL}) y 6 meses de garantía ` +
          `legal por defectos de fabricación.\n\n— Legas Muebles`,
      };
    case OrderStatus.REFUNDED:
      return {
        subject: `Reintegro del pedido ${shortId} en proceso — Legas Muebles`,
        text:
          `Procesamos el reintegro de tu pedido ${shortId} al mismo medio de ` +
          `pago. La acreditación depende de tu banco o tarjeta.\n\n` +
          `Cualquier duda: ${WHATSAPP}\n\n— Legas Muebles`,
      };
    default:
      return null;
  }
}

/**
 * WhatsApp message templates per status — used by the admin flow
 * (scripts/transition-order.ts prints a ready-to-send wa.me link).
 */
export function orderWhatsAppFor(
  status: OrderStatus,
  orderId: string,
  customerName?: string | null,
): string | null {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const hola = customerName ? `Hola ${customerName.split(' ')[0]}!` : 'Hola!';
  switch (status) {
    case OrderStatus.PAID_PREPARING:
      return `${hola} Soy Gonzalo de Legas Muebles 👋 Recibimos el pago de tu pedido ${shortId}. Ya arrancamos con la fabricación — te escribo por acá para coordinar detalles y plazos. ¡Gracias por tu compra!`;
    case OrderStatus.PAID_READY_TO_SHIP:
      return `${hola} Tu pedido ${shortId} de Legas ya está terminado y listo para despachar 🎉 ¿Coordinamos la entrega?`;
    case OrderStatus.PAID_SHIPPED:
      return `${hola} Tu pedido ${shortId} de Legas ya está en camino 🚚 Cualquier cosa sobre la entrega me avisás por acá.`;
    case OrderStatus.PAID_DELIVERED:
      return `${hola} ¡Pedido ${shortId} entregado! Esperamos que lo disfrutes 🙌 Si tenés un minuto, una reseña en la tienda nos ayuda muchísimo: ${ORDERS_URL}`;
    default:
      return null;
  }
}

/** Events that get an internal notification to the shop. */
export type ShopOrderEvent =
  | 'new_order'
  | 'payment_approved'
  | 'payment_rejected';

/** Address of the shop (overridable so a staging deploy doesn't spam it). */
export function shopNotificationEmail(): string {
  return process.env.SHOP_NOTIFICATION_EMAIL || 'legasmuebles@gmail.com';
}

const EVENT_TITLES: Record<ShopOrderEvent, string> = {
  new_order: 'Pedido nuevo',
  payment_approved: 'Pago acreditado',
  payment_rejected: 'Pago rechazado',
};

const money = (value: number | string) =>
  '$ ' + Math.round(Number(value)).toLocaleString('es-AR');

/**
 * Internal email to the shop: every event that needs action (new order,
 * approved payment, rejected payment) with the full detail in the body so it
 * can be read on a phone without opening the site.
 */
export function shopOrderEmailFor(
  order: Order,
  event: ShopOrderEvent,
): OrderEmailContent {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const items = (order.items || [])
    .map(
      (item) =>
        `• ${item.quantity} × ${item.title} — ${money(
          Number(item.unitPrice) * item.quantity,
        )}`,
    )
    .join('\n');

  const delivery =
    order.deliveryMethod === 'pickup'
      ? 'Retiro en persona (Juan de Herrera 2651, Villa de Mayo)'
      : `Envío a domicilio${order.deliveryAddress ? `:\n${order.deliveryAddress}` : ''}`;

  const depositLine =
    order.depositAmount && Number(order.depositAmount) > 0
      ? `\nSeña (50%): ${money(order.depositAmount)}` +
        `\nSaldo al retirar: ${money(
          order.balanceAmount ?? Number(order.totalAmount) - Number(order.depositAmount),
        )}`
      : '';

  const action = {
    new_order:
      order.deliveryMethod === 'pickup' && order.depositAmount
        ? 'Escribile por WhatsApp para pasarle los datos de la transferencia de la seña (48 hs para acreditarla).'
        : 'Escribile por WhatsApp para coordinar el pago y la entrega.',
    payment_approved:
      'El pago quedó acreditado: el pedido entra en fabricación. Confirmale por WhatsApp.',
    payment_rejected:
      'El pago no se acreditó y el stock se liberó. Si el cliente insiste, que vuelva a intentar.',
  }[event];

  return {
    subject: `[${EVENT_TITLES[event]}] Pedido ${shortId} — Legas Muebles`,
    text:
      `${EVENT_TITLES[event]} en la tienda.\n\n` +
      `Pedido: ${shortId}\n` +
      `Estado: ${order.status}\n` +
      `Fecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}\n\n` +
      `CLIENTE\n` +
      `Email: ${order.customerEmail ?? '—'}\n` +
      `Teléfono: ${order.customerPhone ?? '—'}\n` +
      `DNI: ${order.customerDni ?? '—'}\n\n` +
      `ENTREGA\n${delivery}\n\n` +
      `PRODUCTOS\n${items || '—'}\n\n` +
      `Total: ${money(order.totalAmount)}${depositLine}\n\n` +
      `QUÉ HACER\n${action}\n\n` +
      `Pedidos: ${ORDERS_URL}\n\n— Aviso automático de la tienda`,
  };
}
