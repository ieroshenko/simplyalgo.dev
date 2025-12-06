import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Code } from "lucide-react";
import { AdminDashboardNew } from "@/components/admin/AdminDashboardNew";
import AdminProblemManagement from "@/components/admin/AdminProblemManagement";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b">
          <div className="container mx-auto px-6">
            <TabsList className="h-14 bg-transparent border-b-0">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="problems"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Code className="h-4 w-4 mr-2" />
                Problems
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <AdminDashboardNew />
        </TabsContent>

        <TabsContent value="problems" className="mt-0">
          <AdminProblemManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;