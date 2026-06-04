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
  items: any[],
  total: number,
  options?: {
    telefono?: string;
    direccion?: string;
    detalles_personalizados?: string;
    fecha_entrega?: string;
    porciones?: string;
  }
): string {
  const phone = "50558160986"; // Número oficial de Riquiquísimo
  const shortCode = pedidoId.split("-")[0].toUpperCase();

  let message = "";

  if (options?.detalles_personalizados) {
    // Caso de encargo personalizado al repostero
    message = `*NUEVO ENCARGO PERSONALIZADO* 🎂\n\n` +
      `*Código:* #${shortCode}\n` +
      `*Cliente:* ${nombre.trim()}\n` +
      `*Teléfono:* ${options.telefono?.trim() || "No especificado"}\n` +
      `*Dirección:* ${options.direccion?.trim() || "No especificada"}\n\n` +
      `*Detalles del Postre:* ${options.detalles_personalizados.trim()}\n` +
      `*Fecha Requerida:* ${options.fecha_entrega || "No especificada"}\n` +
      `*Porciones/Cantidad:* ${options.porciones || "No especificada"}\n\n` +
      `¡Quedo a la espera de la cotización del repostero! 👩‍🍳`;
  } else {
    // Caso de pedido tradicional de vitrina
    const itemsText = items
      .map(
        (item) =>
          `🎂 *${item.cantidad}x* ${item.nombre} (${formatCurrency(
            item.precio_unitario * item.cantidad
          )})`
      )
      .join("\n");

    message = `*NUEVO PEDIDO DE VITRINA* 🛍️\n\n` +
      `*Código:* #${shortCode}\n` +
      `*Cliente:* ${nombre.trim()}\n` +
      `*Teléfono:* ${options?.telefono?.trim() || "No especificado"}\n` +
      `*Dirección:* ${options?.direccion?.trim() || "No especificada"}\n\n` +
      `*Detalle del Pedido:*\n${itemsText}\n\n` +
      `*Total Estimado:* ${formatCurrency(total)}\n\n` +
      `¡Quedo a la espera de su confirmación! 🥧`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
