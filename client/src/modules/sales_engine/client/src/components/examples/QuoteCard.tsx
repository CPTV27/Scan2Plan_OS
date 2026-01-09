import QuoteCard from '../QuoteCard';

export default function QuoteCardExample() {
  return (
    <div className="p-8 max-w-2xl space-y-4">
      <QuoteCard
        id="Q-2024-001"
        projectName="Downtown Office Tower"
        clientName="ABC Construction"
        totalPrice={45250}
        dateCreated="Nov 15, 2024"
        onView={() => console.log('View quote')}
        onExport={() => console.log('Export PDF')}
        onDelete={() => console.log('Delete quote')}
      />
      <QuoteCard
        id="Q-2024-002"
        projectName="Residential Complex Phase 2"
        clientName="XYZ Developers"
        totalPrice={78900}
        dateCreated="Nov 14, 2024"
        onView={() => console.log('View quote')}
        onExport={() => console.log('Export PDF')}
        onDelete={() => console.log('Delete quote')}
      />
    </div>
  );
}
