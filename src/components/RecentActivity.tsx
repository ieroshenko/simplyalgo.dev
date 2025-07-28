import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus } from 'lucide-react';

const RecentActivity = () => {
  const activities = [
    {
      title: 'Patterns Arena: Sliding Window',
      score: '16 / 20',
      timeAgo: '',
      type: 'pattern'
    },
    {
      title: 'System-Design War-Room: Pastebin',
      score: '8 / 10', 
      timeAgo: '',
      type: 'system-design'
    },
    {
      title: 'Problem Grind: Two Sum',
      score: '',
      timeAgo: '1m',
      type: 'problem'
    }
  ];

  const quickActions = [
    {
      title: 'Random Pattern Drill',
      icon: Plus,
      action: () => console.log('Random Pattern Drill')
    },
    {
      title: 'Random LC Problem',
      icon: Plus,
      action: () => console.log('Random LC Problem')
    }
  ];

  return (
    <div className="flex gap-6 p-6">
      {/* Recent Activity */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">{activity.title}</div>
                  {activity.score && (
                    <div className="text-sm text-muted-foreground">Score: {activity.score}</div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {activity.timeAgo && (
                    <span className="text-sm text-muted-foreground">{activity.timeAgo}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="w-80 space-y-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button 
              key={index}
              variant="outline"
              className="w-full justify-start h-auto p-4 border-dashed hover:bg-accent/5 hover:border-accent transition-colors"
              onClick={action.action}
            >
              <Icon className="w-4 h-4 mr-3 text-accent" />
              <span className="font-medium">{action.title}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivity;