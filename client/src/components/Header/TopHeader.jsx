import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { LogoutBtn, LoginButton } from "../../utils";
import HeaderData from "../../Data/HeaderData.jsx";

const Header = () => {
  const navigate = useNavigate();
  const authStatus = useSelector((state) => state.auth.status);
  const userData = useSelector((state) => state.auth.userData);
  const userName = userData?.name;

  const { topHeader } = HeaderData;
  const { logo, appName } = topHeader;

  const handleLogoClick = () => {
    navigate("/");
  };

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
