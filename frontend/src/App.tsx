import { Switch, Route } from "wouter";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "12px",
            fontSize: "13px",
          },
        }}
      />
      <Router />
    </TooltipProvider>
  );
}

export default App;
