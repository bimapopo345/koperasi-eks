import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="h-screen overflow-hidden">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
