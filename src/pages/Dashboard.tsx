import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MissionStrip from "@/components/MissionStrip";
import CoreBattleCards from "@/components/CoreBattleCards";
import ProgressRadar from "@/components/ProgressRadar";
import RecentActivity from "@/components/RecentActivity";
import { PersonalPlanCard } from "@/components/PersonalPlanCard";
import { useAuth } from "@/hooks/useAuth";
import { useSurveyData } from "@/hooks/useSurveyData";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { surveyData } = useSurveyData();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <DashboardHeader />

        <div className="flex flex-col xl:flex-row gap-6 p-6">
          <div className="flex-1 space-y-6">
            <MissionStrip />
            <CoreBattleCards />
            <RecentActivity />
          </div>

          <div className="w-full xl:w-80 xl:flex-shrink-0 space-y-6">
            <PersonalPlanCard 
              surveyData={surveyData}
              onUpdatePlan={() => navigate('/survey/1')}
            />
            <ProgressRadar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
