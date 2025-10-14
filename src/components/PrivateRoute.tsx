import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: JSX.Element;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const token = localStorage.getItem("doctorToken");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
