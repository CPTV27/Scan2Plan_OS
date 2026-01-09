import { useState } from 'react';
import PricingMatrixEditor from '../PricingMatrixEditor';

export default function PricingMatrixEditorExample() {
  const [rates, setRates] = useState<Record<string, number>>({});

  const handleRateChange = (key: string, value: number) => {
    setRates(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-8">
      <PricingMatrixEditor
        buildingType="Commercial / Office"
        rates={rates}
        onRateChange={handleRateChange}
      />
    </div>
  );
}
