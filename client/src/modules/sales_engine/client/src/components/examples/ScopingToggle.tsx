import { useState } from 'react';
import ScopingToggle from '../ScopingToggle';

export default function ScopingToggleExample() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="p-8 max-w-2xl">
      <ScopingToggle enabled={enabled} onChange={setEnabled} />
    </div>
  );
}
