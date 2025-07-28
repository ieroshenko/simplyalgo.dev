import { Card, CardContent } from '@/components/ui/card';

const ProgressRadar = () => {
  // Mock progress data
  const progressData = {
    overall: 75,
    patterns: 80,
    problems: 70,
    systemDesign: 65
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
            {/* Outer ring */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 144 144">
              {/* Background circle */}
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(progressData.overall * 4.02)} 402`}
                className="transition-all duration-300"
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{progressData.overall}%</div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
            </div>
          </div>
          
          <div className="text-lg font-semibold text-foreground mb-2">Progress</div>
          <div className="text-sm text-muted-foreground text-center">
            Keep pushing forward!
            <br />
            System Design needs work
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressRadar;