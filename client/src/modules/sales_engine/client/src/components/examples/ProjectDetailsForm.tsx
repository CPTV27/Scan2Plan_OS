import { useState } from 'react';
import ProjectDetailsForm from '../ProjectDetailsForm';

export default function ProjectDetailsFormExample() {
  const [details, setDetails] = useState({
    clientName: 'ABC Construction',
    projectName: 'Downtown Office Tower',
    projectAddress: '123 Main St',
    notes: 'Rush project - need within 2 weeks',
  });

  const handleFieldChange = (field: string, value: string) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-3xl">
      <ProjectDetailsForm {...details} onFieldChange={handleFieldChange} />
    </div>
  );
}
