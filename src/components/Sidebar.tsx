import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Sidebar.css';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("doctorToken");
    sessionStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* 🔥 Hamburger Button (mobile) */}
      <button className="hamburger-btn" onClick={() => setIsOpen(!isOpen)}>
        <i className="fas fa-bars"></i>
      </button>

      {/* 🔥 Sidebar */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div>
          <img src="src/assets/images.png" alt="App Logo" className="sidebar-logo" />
          <h3>SPC Medical</h3>

          <ul className="sidebar-menu">
            <li
              className={activePage === "dashboard" ? "active" : ""}
              onClick={() => { setActivePage("dashboard"); setIsOpen(false); }}
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </li>

            <li
              className={activePage === "patients" ? "active" : ""}
              onClick={() => { setActivePage("patients"); setIsOpen(false); }}
            >
              <i className="fas fa-user-injured"></i>
              <span>Patients</span>
            </li>

            <li
              className={activePage === "reports" ? "active" : ""}
              onClick={() => { setActivePage("reports"); setIsOpen(false); }}
            >
              <i className="fas fa-file-medical"></i>
              <span>Reports</span>
            </li>

            <li
              className={activePage === "settings" ? "active" : ""}
              onClick={() => { setActivePage("settings"); setIsOpen(false); }}
            >
              <i className="fas fa-cog"></i>
              <span>Settings</span>
            </li>
          </ul>
        </div>

        {/* Logout Button */}
        <div className="sidebar-logout">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
