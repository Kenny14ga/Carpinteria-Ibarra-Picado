"use client";

import React from "react";

interface TicketPDFProps {
  data: {
    saleId: string;
    items: {
      productId: string;
      name: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[];
    total: number;
    timestamp: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    maximumFractionDigits: 2,
  }).format(value);
}

// Logo de comprobante en SVG inline para impresión/PDF.
const LogoIsotipo = () => (
  <svg
    width="70"
    height="70"
    viewBox="0 0 512 512"
    version="1.1"
    className="mx-auto"
  >
    <rect x="30" y="30" width="452" height="452" rx="96" fill="#F7F4EF" />
    <rect x="112" y="128" width="288" height="256" rx="34" fill="#C89A5B" stroke="#4A2E20" strokeWidth="20" />
    <path d="M158 186H354M158 256H354M158 326H354" stroke="#4A2E20" strokeWidth="18" strokeLinecap="round" />
    <text x="256" y="292" textAnchor="middle" fontSize="112" fontWeight="900" fill="#4A2E20">IP</text>
  </svg>
);

export const TicketPDF: React.FC<TicketPDFProps> = ({ data }) => {
  const formattedDate = new Date(data.timestamp).toLocaleDateString("es-NI");
  const formattedTime = new Date(data.timestamp).toLocaleTimeString("es-NI", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div
      id="ticket-pdf"
      className="absolute -left-[9999px] top-0 w-[380px] p-6 bg-white text-[#4a2b32] font-sans flex flex-col gap-4"
      style={{
        boxSizing: "border-box",
        minHeight: "450px"
      }}
    >
      {/* Header */}
      <div className="text-center flex flex-col items-center justify-center">
        <LogoIsotipo />
        <h1 className="text-xl font-black mt-2 tracking-tight text-[#4a2e20]">Carpintería Ibarra Picado</h1>
        <p className="text-xs font-bold tracking-wider text-[#6f4a52] uppercase">Puertas, muebles y acabados</p>
        <p className="text-[10px] text-[#8a6c72] italic mt-0.5">&quot;madera trabajada con precisión&quot;</p>
      </div>

      <div className="border-t border-dashed border-[#f2d6de] my-1" />

      {/* Info Pedido */}
      <div className="text-xs flex flex-col gap-1 text-[#6f4a52]">
        <div className="text-center font-bold text-xs text-[#8b2e54] uppercase mb-1 tracking-wider">
          Comprobante de Pedido
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Nº Pedido:</span>
          <span className="font-mono text-[#4a2b32]">{data.saleId.replace("sale-", "").toUpperCase().slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Fecha:</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Hora:</span>
          <span>{formattedTime}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-[#f2d6de] my-1" />

      {/* Desglose */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-bold text-[#8b2e54] border-b border-solid border-[#f2d6de] pb-1">
          <span>Artículo</span>
          <span className="w-12 text-center">Cant.</span>
          <span className="w-20 text-right">Subtotal</span>
        </div>

        {data.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-xs items-start py-0.5">
            <div className="flex flex-col flex-1 pr-2">
              <span className="font-medium text-[#4a2b32]">{item.name}</span>
              <span className="text-[10px] text-[#8a6c72]">
                {formatCurrency(item.unitPrice)} c/u
              </span>
            </div>
            <span className="w-12 text-center text-[#4a2b32] font-mono">{item.quantity}</span>
            <span className="w-20 text-right text-[#4a2b32] font-mono font-semibold">
              {formatCurrency(item.subtotal)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-[#f2d6de] my-1" />

      {/* Total */}
      <div className="flex justify-between items-baseline pt-1">
        <span className="text-sm font-bold text-[#8b2e54]">TOTAL</span>
        <span className="text-lg font-black text-[#8b2e54] font-mono">
          {formatCurrency(data.total)}
        </span>
      </div>

      <div className="border-t border-dashed border-[#f2d6de] my-1" />

      {/* Footer */}
      <div className="text-center flex flex-col gap-1 text-[10px] text-[#8a6c72] mt-1">
        <p className="font-bold text-xs text-[#8b2e54] tracking-wide">¡Gracias por preferirnos!</p>
        <p>Para consultas o pedidos especiales:</p>
        <p className="font-bold text-[#8b2e54]">WhatsApp: +505 5816 0986</p>
        <p className="text-[8px] text-[#8a6c72]/60 mt-1">Este no es un comprobante fiscal fiscalizable.</p>
      </div>
    </div>
  );
};
