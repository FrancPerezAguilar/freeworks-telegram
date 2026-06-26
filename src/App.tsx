import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TrabajoView from "./pages/TrabajoView";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TrabajoView />
    </QueryClientProvider>
  );
}
