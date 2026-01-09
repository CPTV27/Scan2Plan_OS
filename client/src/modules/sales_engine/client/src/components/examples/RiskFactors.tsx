import { useState } from 'react';
import RiskFactors from '../RiskFactors';

export default function RiskFactorsExample() {
  const [risks, setRisks] = useState(['occupied']);

  const handleRiskChange = (riskId: string, checked: boolean) => {
    setRisks(prev =>
      checked ? [...prev, riskId] : prev.filter(id => id !== riskId)
    );
  };

  return (
    <div className="p-8 max-w-2xl">
      <RiskFactors selectedRisks={risks} onRiskChange={handleRiskChange} />
    </div>
  );
}
