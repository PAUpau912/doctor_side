import React from 'react';
import { useNavigate } from 'react-router-dom'; // ⚠️ palitan depende sa gamit mong router
import '../css/Sidebar.css';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // optional: clear local storage/session kung may login tokens ka
    localStorage.removeItem("doctorToken");
    sessionStorage.clear();

    // redirect sa login/startup page
    navigate("/", {replace: true}); 
  };

  return (
    <div className="sidebar">
      <div>
        <img src="src/assets/images.png" alt="App Logo" className="sidebar-logo" />
        <h3>SPC Medical</h3>
        <ul className="sidebar-menu">
          <li
            className={activePage === "dashboard" ? "active" : ""}
            onClick={() => setActivePage("dashboard")}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </li>
          <li
            className={activePage === "patients" ? "active" : ""}
            onClick={() => setActivePage("patients")}
          >
            <i className="fas fa-user-injured"></i>
            <span>Patients</span>
          </li>
          <li
            className={activePage === "reports" ? "active" : ""}
            onClick={() => setActivePage("reports")}
          >
            <i className="fas fa-file-medical"></i>
            <span>Reports</span>
          </li>
          <li
            className={activePage === "settings" ? "active" : ""}
            onClick={() => setActivePage("settings")}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </li>
        </ul>
      </div>

      {/* 🔴 Logout button sa baba */}
      <div className="sidebar-logout">
        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
