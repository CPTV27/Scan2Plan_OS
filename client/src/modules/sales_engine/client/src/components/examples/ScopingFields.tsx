import { useState } from 'react';
import ScopingFields from '../ScopingFields';

export default function ScopingFieldsExample() {
  const [data, setData] = useState({
    buildingAge: '15',
    floorsAbove: '8',
    floorsBelow: '2',
    elevatorCount: '3',
    parkingSpaces: '150',
    occupancyStatus: 'fully-occupied',
    accessRestrictions: 'Access only during business hours (9am-5pm). Security escort required.',
    safetyRequirements: 'Hard hat, safety vest, and steel-toed boots required at all times.',
    deliverables: 'Revit 2024 models, PDF floor plans, point cloud data in E57 format',
  });

  const handleChange = (field: string, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-3xl">
      <ScopingFields data={data} onChange={handleChange} />
    </div>
  );
}
