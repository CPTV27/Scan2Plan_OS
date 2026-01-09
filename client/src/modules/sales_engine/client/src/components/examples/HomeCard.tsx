import HomeCard from '../HomeCard';
import { Calculator } from 'lucide-react';

export default function HomeCardExample() {
  return (
    <div className="p-8 max-w-md">
      <HomeCard
        title="Quick Quote Calculator"
        description="Get instant pricing estimates for your Scan-to-BIM project with our streamlined calculator"
        icon={Calculator}
        href="/calculator"
        testId="button-calculator"
      />
    </div>
  );
}
