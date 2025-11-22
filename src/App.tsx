import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartPage from "../src/pages/startup";
import Dashboard from "../src/pages/dashboard";
import Patients from '../src/pages/patients';
import Reports from '../src/pages/reports';
import Settings from '../src/pages/settings';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/resetpassword";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        {/*PROTECTED PAGES */}

        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path= "/patients" element = {
          <PrivateRoute><Patients searchTerm={""}/></PrivateRoute>} />
        <Route path= "/reports" element = {
          <PrivateRoute><Reports SearchTerm={""}/></PrivateRoute>} />
        <Route path= "/settings" element = {
          <PrivateRoute><Settings/></PrivateRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;
