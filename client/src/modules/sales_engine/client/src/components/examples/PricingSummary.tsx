import { useState } from 'react';
import PricingSummary from '../PricingSummary';

export default function PricingSummaryExample() {
  const [items, setItems] = useState([
    { label: "Architecture (5,000 sqft)", value: 12500, editable: true },
    { label: "MEPF (5,000 sqft)", value: 15000, editable: true },
    { label: "Base Subtotal", value: 27500, editable: false },
    { label: "Interior Only Discount (25%)", value: 6875, editable: true, isDiscount: true },
    { label: "Risk Premium - Occupied", value: 500, editable: true },
    { label: "Travel (125 miles)", value: 187.50, editable: true },
    { label: "Matterport (2 units)", value: 300, editable: true },
    { label: "Grand Total", value: 21612.50, editable: true, isTotal: true },
  ]);

  const handleEdit = (index: number, value: number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
  };

  return (
    <div className="p-8 max-w-md">
      <PricingSummary items={items} onEdit={handleEdit} />
    </div>
  );
}
