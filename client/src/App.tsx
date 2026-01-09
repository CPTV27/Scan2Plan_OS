import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/RoleGuard";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import Production from "@/pages/Production";
import Analytics from "@/pages/Analytics";
import Financial from "@/pages/Financial";
import Tools from "@/pages/Tools";
import AirtableInsights from "@/pages/AirtableInsights";
import RegionalIntel from "@/pages/RegionalIntel";
import Settings from "@/pages/Settings";
import ScanTech from "@/pages/ScanTech";
import FieldHub from "@/pages/FieldHub";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import CPQCalculator from "@/features/cpq/Calculator";
import DealWorkspace from "@/pages/DealWorkspace";
import ProposalBuilder from "@/pages/ProposalBuilder";
import Marketing from "@/pages/Marketing";
import HelpCenter from "@/pages/HelpCenter";
import ClientInput from "@/pages/ClientInput";

function Router() {
  const { user, isLoading } = useAuth();
  
  const path = window.location.pathname;
  if (path === "/privacy") {
    return <PrivacyPolicy />;
  }
  if (path === "/terms") {
    return <TermsOfService />;
  }
  if (path.startsWith("/client-input/")) {
    return <ClientInput />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Production role redirect to Field Hub
  const userRole = (user.role as string) || 'ceo';
  if (userRole === 'production' && window.location.pathname === '/') {
    window.location.href = '/field';
    return null;
  }

  return (
    <Switch>
      <Route path="/">
        <RoleGuard allowedRoles={["ceo", "sales", "accounting"]} redirectTo="/field">
          <Dashboard />
        </RoleGuard>
      </Route>
      <Route path="/sales">
        <RoleGuard allowedRoles={["ceo", "sales"]}>
          <Sales />
        </RoleGuard>
      </Route>
      <Route path="/sales/calculator">
        <RoleGuard allowedRoles={["ceo", "sales"]}>
          <div className="h-screen bg-background">
            <CPQCalculator onClose={() => window.history.back()} />
          </div>
        </RoleGuard>
      </Route>
      <Route path="/sales/calculator/:leadId">
        {(params) => (
          <RoleGuard allowedRoles={["ceo", "sales"]}>
            <div className="h-screen bg-background">
              <CPQCalculator leadId={parseInt(params.leadId)} onClose={() => window.history.back()} />
            </div>
          </RoleGuard>
        )}
      </Route>
      <Route path="/deals/:id">
        {() => (
          <RoleGuard allowedRoles={["ceo", "sales"]}>
            <DealWorkspace />
          </RoleGuard>
        )}
      </Route>
      <Route path="/deals/:leadId/proposal">
        {() => (
          <RoleGuard allowedRoles={["ceo", "sales"]}>
            <ProposalBuilder />
          </RoleGuard>
        )}
      </Route>
      <Route path="/production">
        <RoleGuard allowedRoles={["ceo", "production"]}>
          <Production />
        </RoleGuard>
      </Route>
      <Route path="/analytics">
        <RoleGuard allowedRoles={["ceo"]}>
          <Analytics />
        </RoleGuard>
      </Route>
      <Route path="/marketing">
        <RoleGuard allowedRoles={["ceo", "sales"]}>
          <Marketing />
        </RoleGuard>
      </Route>
      <Route path="/financial">
        <RoleGuard allowedRoles={["ceo"]}>
          <Financial />
        </RoleGuard>
      </Route>
      <Route path="/tools" component={Tools} />
      <Route path="/airtable">
        <RoleGuard allowedRoles={["ceo"]}>
          <AirtableInsights />
        </RoleGuard>
      </Route>
      <Route path="/regional-intel">
        <RoleGuard allowedRoles={["ceo", "sales"]}>
          <RegionalIntel />
        </RoleGuard>
      </Route>
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={HelpCenter} />
      <Route path="/scan-tech" component={ScanTech} />
      <Route path="/field">
        <RoleGuard allowedRoles={["ceo", "production"]} redirectTo="/">
          <FieldHub />
        </RoleGuard>
      </Route>
      <Route path="/field/:universalId">
        {(params) => (
          <RoleGuard allowedRoles={["ceo", "production"]} redirectTo="/">
            <FieldHub missionId={params.universalId} />
          </RoleGuard>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
