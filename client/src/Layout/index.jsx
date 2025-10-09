import { Outlet } from "react-router-dom";
import { TopHeader, Footer } from "../components";
import Sidebar from "../components/Sidebar/Sidebar";

const Layout = () => {
  return (
    <div className="flex flex-col h-screen">
      {/* Top Header */}
      <TopHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-100">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;
