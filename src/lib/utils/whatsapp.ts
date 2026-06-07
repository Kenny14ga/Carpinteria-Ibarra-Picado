type WhatsAppItem = {
  nombre: string;
  precio_unitario: number;
  cantidad: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2
  }).format(value);
}

export function generateWhatsAppLink(
  pedidoId: string,
  nombre: string,
  items: WhatsAppItem[],
  total: number,
  options?: {
    telefono?: string;
    direccion?: string;
    detalles_personalizados?: string;
    fecha_entrega?: string;
    porciones?: string;
  }
): string {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "50558160986";
  const shortCode = pedidoId.split("-")[0].toUpperCase();

  let message = "";

  if (options?.detalles_personalizados) {
    message = `*NUEVA SOLICITUD A MEDIDA*\n\n` +
      `*Código:* #${shortCode}\n` +
      `*Cliente:* ${nombre.trim()}\n` +
      `*Teléfono:* ${options.telefono?.trim() || "No especificado"}\n` +
      `*Dirección:* ${options.direccion?.trim() || "No especificada"}\n\n` +
      `*Detalles del trabajo:* ${options.detalles_personalizados.trim()}\n` +
      `*Fecha Requerida:* ${options.fecha_entrega || "No especificada"}\n` +
      `*Medidas/Cantidad:* ${options.porciones || "No especificada"}\n\n` +
      `Quedo a la espera de la cotización de Carpintería Ibarra Picado.`;
  } else {
    const itemsText = items
      .map(
        (item) =>
          `*${item.cantidad}x* ${item.nombre} (${formatCurrency(
            item.precio_unitario * item.cantidad
          )})`
      )
      .join("\n");

    message = `*NUEVA COTIZACIÓN DE CARPINTERÍA*\n\n` +
      `*Código:* #${shortCode}\n` +
      `*Cliente:* ${nombre.trim()}\n` +
      `*Teléfono:* ${options?.telefono?.trim() || "No especificado"}\n` +
      `*Dirección:* ${options?.direccion?.trim() || "No especificada"}\n\n` +
      `*Detalle de productos:*\n${itemsText}\n\n` +
      `*Total Estimado:* ${formatCurrency(total)}\n\n` +
      `Quedo a la espera de confirmación.`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
