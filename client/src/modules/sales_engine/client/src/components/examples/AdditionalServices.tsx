import { useState } from 'react';
import AdditionalServices from '../AdditionalServices';

export default function AdditionalServicesExample() {
  const [services, setServices] = useState({
    matterport: 2,
    georeferencing: 0,
    scanHalf: 0,
    scanFull: 1,
  });

  const handleServiceChange = (serviceId: string, quantity: number) => {
    setServices(prev => ({ ...prev, [serviceId]: quantity }));
  };

  return (
    <div className="p-8 max-w-3xl">
      <AdditionalServices services={services} onServiceChange={handleServiceChange} />
    </div>
  );
}
