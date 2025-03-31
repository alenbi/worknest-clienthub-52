
import { Outlet } from "react-router-dom";
import { ClientSidebar } from "./ClientSidebar";
import { ClientHeader } from "./ClientHeader";

const ClientLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ClientSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ClientHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
