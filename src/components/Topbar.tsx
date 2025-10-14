import React, { useEffect, useState } from "react";
import "../css/Topbar.css";
import supabase from "../supabaseClient";

interface DoctorProfile {
  name: string;
  specialization: string;
}

const Topbar: React.FC<{ activePage: string }> = ({ activePage }) => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const doctorId = localStorage.getItem("doctor_id");
        if (!doctorId) {
          console.warn("⚠️ No doctor ID found in localStorage.");
          return;
        }

        // ✅ Fetch doctor info directly using doctor_id
        const { data: doctorData, error } = await supabase
          .from("doctors")
          .select("name, specialization")
          .eq("id", doctorId)
          .single();

        if (error) {
          console.error("❌ Error fetching doctor profile:", error);
          return;
        }

        if (doctorData) {
          setDoctorProfile({
            name: doctorData.name,
            specialization: doctorData.specialization || "Not specified",
          });
        }

        // Optional: cache locally for faster reloads
        localStorage.setItem("doctorProfile", JSON.stringify(doctorData));
      } catch (err) {
        console.error("Error loading doctor profile:", err);
      }
    };

    fetchDoctorProfile();
  }, []);

  return (
    <div className="topbar-content">
      {/* ✅ Dashboard Page */}
      {activePage === "dashboard" && (
        <div className="topbar-center dashboard">
          <h3>
            Welcome, {doctorProfile?.name || "Doctor"}{" "}
            <span style={{ fontSize: "14px", color: "gray" }}>
              ({doctorProfile?.specialization || "Specialization"})
            </span>
          </h3>
          <div className="profile">
            <img src="src/assets/doctor.jpg" alt="Profile" />
          </div>
        </div>
      )}

      {/* ✅ Patients Page */}
      {activePage === "patients" && (
        <div className="topbar-center patients">
          <h3>Patients List</h3>
          <div className="search-bar">
            <span className="search-icon">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              placeholder="Search patients..."
              className="search-input"
            />
          </div>
        </div>
      )}

      {/* ✅ Reports Page */}
      {activePage === "reports" && (
        <div className="topbar-center">
          <h3>Reports Overview</h3>
        </div>
      )}

      {/* ✅ Settings Page */}
      {activePage === "settings" && (
        <div className="topbar-center">
          <h3>Settings</h3>
        </div>
      )}
    </div>
  );
};

export default Topbar;
