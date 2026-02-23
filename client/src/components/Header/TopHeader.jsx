import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { LogoutBtn, LoginButton } from "../../utils";
import HeaderData from "../../Data/HeaderData.jsx";
import api from "../../api/index.jsx";

const Header = () => {
  const navigate = useNavigate();
  const authStatus = useSelector((state) => state.auth.status);
  const userData = useSelector((state) => state.auth.userData);
  const userName = userData?.name;
  const [pendingCount, setPendingCount] = useState(0);

  const { topHeader } = HeaderData;
  const { logo, appName } = topHeader;

  const handleLogoClick = () => {
    navigate("/");
  };

  // Fetch pending verification count
  useEffect(() => {
    if (authStatus) {
      const fetchPendingCount = async () => {
        try {
          const response = await api.get("/api/admin/members/pending-count");
          if (response.data.success) {
            setPendingCount(response.data.data.count);
          }
        } catch (err) {
          console.error("Failed to fetch pending count:", err);
        }
      };
      fetchPendingCount();
      // Poll every 60 seconds
      const interval = setInterval(fetchPendingCount, 60000);
      return () => clearInterval(interval);
    }
  }, [authStatus]);

  return (
    <header className="sticky top-0 left-0 w-full z-50 flex justify-between items-center py-4 px-6 bg-gray-900 text-white shadow-lg border-b-4 border-gray-800">
      {/* Logo Section */}
      <div
        className="flex items-center justify-start cursor-pointer gap-2 hover:shadow-lg rounded-lg transition-all duration-300"
        onClick={handleLogoClick}
      >
        <img
          src={logo}
          alt="Koperasi"
          className="w-auto h-10 md:h-12 transition-transform duration-300 hover:scale-105"
        />
        <div className="ml-2 text-xl md:text-2xl font-semibold text-white hover:text-indigo-400 transition-all duration-300">
          {appName}
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4">
        {authStatus ? (
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button
              onClick={() => navigate("/master/anggota?filter=unverified")}
              className="relative p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              title={pendingCount > 0 ? `${pendingCount} pendaftaran menunggu verifikasi` : "Tidak ada pendaftaran baru"}
            >
              <svg className="w-6 h-6 text-gray-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>
            <div className="text-sm md:text-base font-medium">
              Hello, {userName}
            </div>
            <LogoutBtn />
          </div>
        ) : (
          <LoginButton />
        )}
      </div>
    </header>
  );
};

export default Header;
