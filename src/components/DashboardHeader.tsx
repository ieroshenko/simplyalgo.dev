import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

const DashboardHeader = () => {
  return (
    <div className="flex items-center justify-between p-6 border-b border-border">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-accent/10 rounded-lg">
          <div className="w-6 h-6 bg-accent rounded-md"></div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      </div>
      
      <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
        <BarChart3 className="w-4 h-4" />
        <span>Analytics</span>
      </Button>
    </div>
  );
};

export default DashboardHeader;