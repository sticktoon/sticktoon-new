import React from "react";

const renderInvoiceJSX = (items: any[] = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p>No items found</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border"
        >
          {/* IMAGE */}
          <img
            src={item.image}
            alt={item.name}
            className="w-16 h-16 object-cover rounded-md"
          />

          {/* DETAILS */}
          <div className="flex-1">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-500">
              ₹{item.price} × {item.quantity}
            </p>
          </div>

          {/* TOTAL */}
          <p className="font-semibold">
            ₹{item.price * item.quantity}
          </p>
        </div>
      ))}
    </div>
  );
};

export default renderInvoiceJSX;





