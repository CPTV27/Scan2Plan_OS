import { useState } from 'react';
import TravelCalculator from '../TravelCalculator';

export default function TravelCalculatorExample() {
  const [dispatch, setDispatch] = useState('troy');
  const [address, setAddress] = useState('123 Main St, Boston, MA');
  const [distance] = useState(125);

  return (
    <div className="p-8 max-w-2xl">
      <TravelCalculator
        dispatchLocation={dispatch}
        projectAddress={address}
        distance={distance}
        isCalculating={false}
        onDispatchChange={setDispatch}
        onAddressChange={setAddress}
      />
    </div>
  );
}
