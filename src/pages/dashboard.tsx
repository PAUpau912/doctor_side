import React, { useState, useEffect } from "react";
import "../css/Dashboard.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Patients from "./patients";
import Reports from "./reports";
import Settings from "./settings";
import supabase from "../supabaseClient";

const Dashboard: React.FC = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState<string>("");

  // ✅ Fetch patients assigned to logged-in doctor
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const doctorId = localStorage.getItem("doctor_id");
        if (!doctorId) {
          console.warn("⚠️ No logged-in doctor found.");
          setLoading(false);
          return;
        }

        // ✅ Fetch all patients assigned to this doctor (sorted by created_at)
        const { data: patientsData, error: patientsError } = await supabase
          .from("patients")
          .select("id, full_name, age, diabetes_type, risk_level, created_at")
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false }); // 🔥 sort by latest

        if (patientsError) throw patientsError;
        setPatients(patientsData || []);
        setTotalPatients(patientsData?.length || 0);

        // ✅ Fetch doctor name
        const { data: doctorData, error: doctorError } = await supabase
          .from("doctors")
          .select("name")
          .eq("id", doctorId)
          .single();

        if (doctorError) throw doctorError;
        if (doctorData) setDoctorName(doctorData.name);
      } catch (err) {
        console.error("❌ Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="main-content">
        <div className="topbar">
          <Topbar activePage={activePage} />
        </div>

        {activePage === "dashboard" && (
          <>
            {/* ✅ Statistics */}
            <div className="stat-row">
              <div className="stat-card">
                <h3>Total Patients</h3>
                <p className="stat-value">
                  {loading ? "Loading..." : totalPatients}
                </p>
              </div>
              <div className="stat-card">
                <h3>Critical Alerts</h3>
                <p className="stat-value">5</p>
              </div>
              <div className="stat-card">
                <h3>New Logs Today</h3>
                <p className="stat-value">10</p>
              </div>
            </div>

            {/* ✅ Patients Section */}
            <div className="patients-row">
              {/* 🔹 Top Risk Patients */}
              <div className="stat-card">
                <h3>🔥 Top Risk Patients</h3>
                {loading ? (
                  <p>Loading...</p>
                ) : patients.length > 0 ? (
                  <ul className="risk-list">
                    {patients
                      .filter((p) => p.risk_level === "High")
                      .slice(0, 5)
                      .map((p) => (
                        <li key={p.id}>
                          <strong>{p.full_name}</strong> — {p.risk_level} Risk (
                          {p.diabetes_type || "Unknown"})
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No high-risk patients yet.</p>
                )}
              </div>

              {/* 🔹 Recent Patients */}
              <div className="stat-card">
                <h3>🩺 Recent Patients</h3>
                {loading ? (
                  <p>Loading...</p>
                ) : patients.length > 0 ? (
                  <ul className="recent-list">
                    {patients
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime()
                      )
                      .slice(0, 5)
                      .map((p) => (
                        <li key={p.id} className="recent-item">
                          <strong>{p.full_name}</strong>
                          <p className="condition">
                            {p.diabetes_type || "Unknown Type"} •{" "}
                            {p.risk_level || "Normal"} Risk
                          </p>
                          <p className="timestamp">
                            Added on{" "}
                            {new Date(p.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No patients available.</p>
                )}
              </div>
            </div>
          </>
        )}

        {activePage === "patients" && <Patients />}
        {activePage === "reports" && <Reports />}
        {activePage === "settings" && <Settings />}
      </div>
    </div>
  );
};

export default Dashboard;
