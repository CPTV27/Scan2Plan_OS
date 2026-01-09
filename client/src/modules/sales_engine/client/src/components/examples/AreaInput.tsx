import { useState } from 'react';
import AreaInput from '../AreaInput';

export default function AreaInputExample() {
  const [area, setArea] = useState({
    id: '1',
    name: 'Main Building',
    buildingType: '4',
    squareFeet: '5000',
    scope: 'full'
  });

  const handleChange = (id: string, field: string, value: string) => {
    setArea(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-2xl">
      <AreaInput
        area={area}
        index={0}
        onChange={handleChange}
        onRemove={() => console.log('Remove area')}
        canRemove={true}
      />
    </div>
  );
}
