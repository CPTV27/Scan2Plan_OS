import { useState } from 'react';
import BuildingTypeSelect from '../BuildingTypeSelect';

export default function BuildingTypeSelectExample() {
  const [buildingType, setBuildingType] = useState("4");

  return (
    <div className="p-8 max-w-md">
      <BuildingTypeSelect value={buildingType} onChange={setBuildingType} />
    </div>
  );
}
