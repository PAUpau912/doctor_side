import React, { useState, useEffect } from "react";
import "../css/Dashboard.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Patients from "./patients";
import Reports from "./reports";
import Settings from "./settings";
import supabase from "../supabaseClient";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard: React.FC = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const doctorId = localStorage.getItem("doctor_id");
        if (!doctorId) {
          setLoading(false);
          return;
        }

        const { data: doctorData } = await supabase
          .from("doctors")
          .select("full_name")
          .eq("id", doctorId)
          .single();

        if (doctorData) setDoctorName(doctorData.full_name);

        const { data: patientsData } = await supabase
          .from("patients")
          .select("*")
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false });

        const list = patientsData || [];
        setPatients(list);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Prepare chart data whenever patients or year changes
  useEffect(() => {
    const riskPatients = patients.filter(
      (p) => p.condition === "Type 1 Diabetes" || p.condition === "Type 2 Diabetes"
    );

    // Initialize month counts
    const monthCounts = Array(12).fill(0);

    riskPatients.forEach((p) => {
      if (!p.created_at) return;
      const date = new Date(p.created_at);
      if (date.getFullYear() === selectedYear) {
        const month = date.getMonth(); // 0-11
        monthCounts[month]++;
      }
    });

    setChartData({
      labels: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ],
      datasets: [
        {
          label: `Risk Patients (${selectedYear})`,
          data: monthCounts,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
      ],
    });
  }, [patients, selectedYear]);

  // Generate available years from patient data
  const availableYears = Array.from(
    new Set(patients.map((p) => new Date(p.created_at).getFullYear()))
  ).sort((a, b) => b - a);

  return (
    <div className="dashboard-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="main-content">
        <div className="topbar">
          <Topbar activePage={activePage} onSearchChange={setSearchTerm} />
          {activePage === "patients" && <Patients searchTerm={searchTerm} />}
        </div>

        {activePage === "dashboard" && (
          <div className="dashboard-body">
            {/* 🔹 Three Boxes Row */}
            <div className="three-box-row">
              {/* Type 1 Diabetes */}
              <div className="dashboard-box type1">
                <h3>Type 1 Diabetes Patients</h3>
                <span className="total-count">
                  Total patients: {patients.filter(p => p.condition === "Type 1 Diabetes").length}
                </span>
                {loading ? (
                  <p>Loading...</p>
                ) : patients.filter(p => p.condition === "Type 1 Diabetes").length === 0 ? (
                  <p>No patients found.</p>
                ) : (
                  <ul>
                    {patients
                      .filter(p => p.condition === "Type 1 Diabetes")
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(p => (
                        <li key={p.id} className="patient-item">
                          <span className="patient-name">{p.name}</span>
                          <span className="patient-info">{p.age} yrs, {p.gender}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Type 2 Diabetes */}
              <div className="dashboard-box type2">
                <h3>Type 2 Diabetes Patients</h3>
                <span className="total-count">
                  Total Patients: {patients.filter(p => p.condition === "Type 2 Diabetes").length}
                </span>
                {loading ? (
                  <p>Loading...</p>
                ) : patients.filter(p => p.condition === "Type 2 Diabetes").length === 0 ? (
                  <p>No patients found.</p>
                ) : (
                  <ul>
                    {patients
                      .filter(p => p.condition === "Type 2 Diabetes")
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(p => (
                        <li key={p.id} className="patient-item">
                          <span className="patient-name">{p.name}</span>
                          <span className="patient-info">{p.age} yrs, {p.gender}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Risk Patients */}
              <div className="dashboard-box reports">
                <h3>Risk Patients</h3>
                {loading ? (
                  <p>Loading...</p>
                ) : (
                  <ul>
                    {patients
                      .filter(p => p.condition === "Type 1 Diabetes" || p.condition === "Type 2 Diabetes")
                      .map(p => {
                        let riskLevel = "";
                        let riskClass = "";
                        if (p.risk_score >= 80) {
                          riskLevel = "High Risk";
                          riskClass = "risk-high";
                        } else if (p.risk_score >= 50) {
                          riskLevel = "Moderate Risk";
                          riskClass = "risk-moderate";
                        } else {
                          riskLevel = "Low Risk";
                          riskClass = "risk-low";
                        }
                        return (
                          <li key={p.id} className="risk-item">
                            {p.name} <span className={`risk-badge ${riskClass}`}>{riskLevel}</span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>

            {/* 🔹 Graph Section */}
            <div className="dashboard-graph">
              <div className="graph-header">
                <label>Select Year:</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  {availableYears.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
                {/* Chart Name */}
              <h2 className="chart-name">Monthly Risk Patients Overview</h2>

              {chartData && <Bar data={chartData} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                },
              }} />}
            </div>
          </div>
        )}

        {activePage === "reports" && <Reports />}
        {activePage === "settings" && <Settings />}
      </div>
    </div>
  );
};

export default Dashboard;
