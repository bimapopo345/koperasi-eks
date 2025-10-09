import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";

const PrivateRoute = ({ children }) => {
  PrivateRoute.propTypes = {
    children: PropTypes.node.isRequired,
  };
  
  // Check both Redux state and localStorage token
  const { status } = useSelector((state) => state.auth);
  const token = localStorage.getItem("token");
  const isAuthenticated = status || !!token;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
