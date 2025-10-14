import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartPage from "../src/pages/startup";
import Dashboard from "../src/pages/dashboard";
import Patients from '../src/pages/patients';
import Reports from '../src/pages/reports';
import Settings from '../src/pages/settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path= "/patients" element = {<Patients/>} />
        <Route path= "/reports" element = {<Reports/>} />
        <Route path= "/settings" element = {<Settings/>} />

      </Routes>
    </Router>
  );
}

export default App;
