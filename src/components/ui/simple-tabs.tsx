import React from "react";

// Simple Tab Component - no Radix UI conflicts
interface TabProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const SimpleTabs = ({ tabs, activeTab, onTabChange, children }: TabProps) => (
  <div className="h-full flex flex-col">
    {/* Tab Headers */}
    <div className="border-b border-border bg-background">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
    
    {/* Tab Content - explicit height for scrolling */}
    <div className="flex-1" style={{ height: "calc(100% - 49px)", overflow: "hidden" }}>
      {children}
    </div>
  </div>
);

interface TabPanelProps {
  value: string;
  activeTab: string;
  children: React.ReactNode;
}

const TabPanel = ({ value, activeTab, children }: TabPanelProps) => (
  <div 
    className={`h-full ${activeTab === value ? 'block' : 'hidden'}`}
    style={{ height: "100%", overflow: "auto" }}
  >
    <div className="p-6">
      {children}
    </div>
  </div>
);

export { SimpleTabs, TabPanel };