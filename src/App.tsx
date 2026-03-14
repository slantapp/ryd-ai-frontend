import { QueryClientProvider } from "@tanstack/react-query";
import Pages from "./routes";
import { queryClient } from "./lib/queryClient";
import { ToastContainer } from "react-toastify";
// import SessionManager from './components/shared/SessionManager';
// import ScreenSizeGuard from './lib/ScreenSizeGuard';

function App() {
  return (
    // <ScreenSizeGuard>
    <QueryClientProvider client={queryClient}>
      <ToastContainer hideProgressBar />
      <Pages />
      {/* <SessionManager /> */}
    </QueryClientProvider>
    // </ScreenSizeGuard>
  );
}

export default App;
