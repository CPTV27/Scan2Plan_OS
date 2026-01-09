import { useState } from 'react';
import DisciplineSelector from '../DisciplineSelector';

export default function DisciplineSelectorExample() {
  const [disciplines, setDisciplines] = useState(['architecture', 'mepf']);
  const [lods, setLods] = useState({
    architecture: '300',
    mepf: '350'
  });

  const handleDisciplineChange = (disciplineId: string, checked: boolean) => {
    setDisciplines(prev =>
      checked ? [...prev, disciplineId] : prev.filter(id => id !== disciplineId)
    );
  };

  const handleLodChange = (disciplineId: string, value: string) => {
    setLods(prev => ({ ...prev, [disciplineId]: value }));
  };

  return (
    <div className="p-8 max-w-3xl">
      <DisciplineSelector
        selectedDisciplines={disciplines}
        disciplineLods={lods}
        onDisciplineChange={handleDisciplineChange}
        onLodChange={handleLodChange}
      />
    </div>
  );
}
