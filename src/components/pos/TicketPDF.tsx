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

// Logo isotipo RQ en SVG inline
const LogoIsotipo = () => (
  <svg
    width="70"
    height="70"
    viewBox="0 0 512 512"
    version="1.1"
    className="mx-auto"
  >
    <rect x="30" y="30" width="452" height="452" rx="116" fill="#FFF6F6" />
    <path d="M133 124 C178 73, 334 73, 379 124" fill="none" stroke="#F48CAA" strokeWidth="28" strokeLinecap="round" />
    <path d="M163 164 C200 127, 312 127, 349 164" fill="none" stroke="#FDE1E6" strokeWidth="22" strokeLinecap="round" />
    <circle cx="110" cy="174" r="20" fill="#F48CAA" />
    <circle cx="402" cy="174" r="20" fill="#F48CAA" />
    <path
      d="m 76.293185,360 0.444,-2.22 h 2.886 q 6.882,0 12.654,-2.22 5.772,-2.442 7.326,-9.99 L 126.24318,218.808 q 1.554,-7.77 1.554,-8.436 0,-4.44 -4.44,-5.55 -4.44,-1.11 -11.544,-1.11 h -2.886 l 0.666,-2.22 h 80.808 q 54.39,0 54.39,36.63 0,11.1 -3.996,19.092 -3.774,7.77 -10.212,13.098 -6.216,5.106 -13.542,8.436 -7.104,3.108 -13.764,4.662 l 19.314,47.952 q 4.218,10.434 6.66,16.206 2.442,5.772 4.884,7.992 2.664,2.22 6.66,2.22 h 1.332 l -0.444,2.22 h -7.992 q -16.65,0 -28.194,-1.998 -11.544,-1.998 -18.87,-8.658 -7.104,-6.66 -10.878,-20.202 l -11.988,-44.844 h -7.326 l -11.766,55.944 q -0.888,4.884 -1.554,7.326 -0.444,2.442 -0.444,3.552 0,4.218 4.662,5.55 4.884,1.11 11.766,1.11 h 7.326 l -0.666,2.22 z m 86.801995,-77.922 q 15.762,0 24.642,-11.1 8.88,-11.322 8.88,-34.41 0,-18.204 -4.218,-25.53 -3.996,-7.326 -12.432,-7.326 h -5.994 l -17.538,78.366 z M 340.231,413.28 q -8.436,0 -16.872,-2.22 -8.436,-2.22 -15.762,-7.992 -7.104,-5.772 -11.988,-16.206 -4.662,-10.434 -5.55,-26.64 -20.868,-5.106 -33.078,-21.312 -11.988,-16.428 -11.988,-45.51 0,-11.766 3.108,-24.864 3.33,-13.098 10.434,-25.308 7.104,-12.432 18.426,-22.422 11.544,-9.99 27.972,-15.762 16.65,-5.994 38.85,-5.994 18.204,0 32.634,6.66 14.652,6.438 23.088,20.424 8.436,13.986 8.436,36.63 0,12.432 -3.774,27.306 -3.552,14.652 -11.766,28.86 -7.992,14.208 -21.756,25.086 -13.542,10.878 -33.522,15.54 1.554,16.65 3.996,26.418 2.442,9.768 5.328,14.208 3.108,4.662 6.438,5.994 3.33,1.332 6.438,1.332 1.11,0 1.998,-0.222 0.888,0 1.776,-0.222 l 0.444,2.22 q -6.882,2.664 -12.21,3.33 -5.328,0.666 -11.1,0.666 z m -25.308,-53.058 q 12.21,0 21.312,-8.658 9.102,-8.88 15.096,-24.198 6.216,-15.318 9.102,-34.854 3.108,-19.758 3.108,-41.292 0,-27.75 -5.106,-38.85 -5.106,-11.1 -16.872,-11.1 -15.54,0 -27.306,13.32 -11.544,13.098 -17.982,37.074 -6.216,23.754 -6.216,56.166 0,26.64 6.438,39.516 6.438,12.876 18.426,12.876 z"
      fill="#b83e6c"
      stroke="#8b2e54"
      strokeWidth="1.5"
    />
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
        <h1 className="text-xl font-black mt-2 tracking-tight text-[#8b2e54]">Riquiquísimo</h1>
        <p className="text-xs font-bold tracking-wider text-[#6f4a52] uppercase">Pastelería Artesanal</p>
        <p className="text-[10px] text-[#8a6c72] italic mt-0.5">"Amor horneado diariamente"</p>
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
