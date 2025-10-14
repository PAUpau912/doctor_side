import React, { useState, useEffect } from "react";
import "../css/Patients.css";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import supabase from "../supabaseClient";

ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

interface Patient {
  id: string;
  name: string;
  gender: string;
  condition: string;
  doctor_id: string;
  date_of_birth: string;
  address: string;
  phone_number: string;
  profile_picture?: string;
  weight?: number;
  height?: number;
  doctor?: string;
}

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientLogs, setPatientLogs] = useState<any>({});
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [activeChart, setActiveChart] = useState<string | null>(null);

  // ✅ Fetch doctor’s assigned patients
  useEffect(() => {
    const fetchPatients = async () => {
      const doctorId = localStorage.getItem("doctor_id");
      if (!doctorId) return alert("⚠️ No logged-in doctor found.");

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("doctor_id", doctorId);

      if (error) console.error("Error fetching patients:", error);
      else setPatients(data || []);
    };

    fetchPatients();
  }, []);

  // ✅ Fetch all logs per patient
  const fetchPatientLogs = async (patientId: string) => {
    try {
      const [insulinRes, mealRes, activityRes] = await Promise.all([
        supabase.from("insulin").select("*").eq("patient_id", patientId),
        supabase.from("meals").select("*").eq("patient_id", patientId),
        supabase.from("activities").select("*").eq("patient_id", patientId),
      ]);

      setPatientLogs((prev) => ({
        ...prev,
        [patientId]: {
          insulinLogs: insulinRes.data || [],
          mealLogs: mealRes.data || [],
          activityLogs: activityRes.data || [],
        },
      }));
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  // ✅ Fetch doctor notes from Supabase for selected patient
  const fetchDoctorNotes = async (patientId: string) => {
    const doctorId = localStorage.getItem("doctor_id");
    if (!doctorId) return;

    const { data, error } = await supabase
      .from("doctor_reports")
      .select("report_data, created_at")
      .eq("doctor_id", doctorId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching doctor notes:", error);
    } else {
      const notesArr = data.map((r) => r.report_data?.note || "");
      setNotes((prev) => ({ ...prev, [patientId]: notesArr }));
    }
  };

  // ✅ Add a new doctor note
  const handleAddNote = async (pid: string) => {
    if (!noteInput.trim()) return alert("Please write a note before saving.");

    const doctorId = localStorage.getItem("doctor_id");
    if (!doctorId) return alert("⚠️ No logged-in doctor found.");

    const { error } = await supabase.from("doctor_reports").insert([
      {
        doctor_id: doctorId,
        patient_id: pid,
        title: `Doctor Note for Patient ${pid}`,
        report_data: { note: noteInput },
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Error saving note:", error);
      alert("❌ Failed to save note.");
    } else {
      setNotes((prev) => ({
        ...prev,
        [pid]: [...(prev[pid] || []), noteInput],
      }));
      setNoteInput("");
      alert("✅ Note saved successfully!");
    }
  };

  // ✅ Chart data helpers
  const getBloodSugarData = (logs: any[]) => ({
    labels: logs.map((_, i) => `Log ${i + 1}`),
    datasets: [
      {
        label: "Blood Sugar (mg/dL)",
        data: logs.map((l) => l.cbg || 0),
        borderColor: "#007b55",
        backgroundColor: "rgba(0,123,85,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  });

  const getActivityData = (logs: any[]) => ({
    labels: logs.map((l) => l.activity_type || "N/A"),
    datasets: [
      {
        label: "Minutes",
        data: logs.map((l) => Number(l.duration) || 0),
        backgroundColor: ["#0f9d58", "#34a853", "#81c995"],
      },
    ],
  });

  const getMealData = (logs: any[]) => {
    const types: Record<string, number> = {};
    logs.forEach((log) => {
      types[log.meal_type] = (types[log.meal_type] || 0) + 1;
    });
    return {
      labels: Object.keys(types),
      datasets: [
        {
          label: "Meal Count",
          data: Object.values(types),
          backgroundColor: ["#a8e6cf", "#dcedc1", "#81c784"],
        },
      ],
    };
  };

  // ✅ Utility: calculate age
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const ageDiff = Date.now() - birthDate.getTime();
    return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
  };

  // ✅ Log detail modal renderer
  const renderLogDetails = (type: string) => {
    if (!selectedPatient) return null;
    const logs = patientLogs[selectedPatient.id] || {};
    let list: any[] = [];

    if (type === "insulin") list = logs.insulinLogs || [];
    if (type === "activity") list = logs.activityLogs || [];
    if (type === "meal") list = logs.mealLogs || [];

    return (
      <div className="log-detail-modal">
        <div className="log-detail-content">
          <h3>
            {type === "insulin"
              ? "🩸 Insulin & Blood Sugar Logs"
              : type === "activity"
              ? "🏃 Activity Logs"
              : "🍽️ Meal Logs"}
          </h3>
          <button className="close-submodal" onClick={() => setActiveChart(null)}>
            ✖
          </button>

          {list.length > 0 ? (
            <table className="log-table">
              <thead>
                {type === "insulin" && (
                  <tr>
                    <th>#</th>
                    <th>Date and Time</th>
                    <th>Dosage</th>
                    <th>CBG</th>
                    <th>Pre-Meal CBG</th>
                    <th>Post-Meal CBG</th>
                    <th>Notes</th>
                  </tr>
                )}
                {type === "activity" && (
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Activity Type</th>
                    <th>Duration</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Notes</th>
                  </tr>
                )}
                {type === "meal" && (
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Meal Type</th>
                    <th>Calories</th>
                    <th>Rice</th>
                    <th>Dish</th>
                    <th>Drinks</th>
                    <th>Notes</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {list.map((log, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    {type === "insulin" && (
                      <>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.dosage ?? "—"}</td>
                        <td>{log.cbg ?? "—"}</td>
                        <td>{log.cbg_pre_meal ?? "—"}</td>
                        <td>{log.cbg_post_meal ?? "—"}</td>
                        <td>{log.notes || "—"}</td>
                      </>
                    )}
                    {type === "activity" && (
                      <>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.activity_type || "—"}</td>
                        <td>{log.duration || "—"}</td>
                        <td>
                          {log.start_time
                            ? new Date(log.start_time).toLocaleTimeString()
                            : "—"}
                        </td>
                        <td>
                          {log.end_time
                            ? new Date(log.end_time).toLocaleTimeString()
                            : "—"}
                        </td>
                        <td>{log.notes || "—"}</td>
                      </>
                    )}
                    {type === "meal" && (
                      <>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.meal_type || "—"}</td>
                        <td>{log.calories || "—"}</td>
                        <td>{log.rice_cups || "—"}</td>
                        <td>{log.dish || "—"}</td>
                        <td>{log.drinks || "—"}</td>
                        <td>{log.notes || "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No logs available.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="patients-container">
      <h2>👩‍⚕️ My Assigned Patients</h2>

      {patients.length === 0 ? (
        <p className="empty">No patients assigned yet.</p>
      ) : (
        <div className="patients-grid">
          {patients.map((p) => (
            <div className="patient-card" key={p.id}>
              <img
                src={p.profile_picture || "src/assets/default-user.png"}
                alt="Profile"
                className="patient-img"
              />
              <div className="patient-info">
                <h3>{p.name}</h3>
                <p>{p.condition}</p>
                <p>{calculateAge(p.date_of_birth)} years old</p>
              </div>
              <button
                className="view-btn"
                onClick={() => {
                  setSelectedPatient(p);
                  fetchPatientLogs(p.id);
                  fetchDoctorNotes(p.id); // ✅ Fetch notes when viewing patient
                }}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedPatient && (
        <div className="patient-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setSelectedPatient(null)}>
              ✖
            </button>

            {/* SIDEBAR */}
            <aside className="modal-sidebar">
              <img
                src={selectedPatient.profile_picture || "src/assets/default-user.png"}
                alt="Profile"
                className="modal-avatar"
              />
              <h2>{selectedPatient.name}</h2>
              <p>{selectedPatient.condition}</p>
              <table className="patient-info-table">
                <tbody>
                  <tr><td>Gender:</td><td>{selectedPatient.gender}</td></tr>
                  <tr><td>Age:</td><td>{calculateAge(selectedPatient.date_of_birth)}</td></tr>
                  <tr><td>Height:</td><td>{selectedPatient.height || "N/A"} cm</td></tr>
                  <tr><td>Weight:</td><td>{selectedPatient.weight || "N/A"} kg</td></tr>
                  <tr><td>Address:</td><td>{selectedPatient.address}</td></tr>
                  <tr><td>Phone:</td><td>{selectedPatient.phone_number}</td></tr>
                </tbody>
              </table>
            </aside>

            {/* MAIN CONTENT */}
            <main className="modal-details">
              <div className="chart-section">
                <h3>Patient Health Overview</h3>
                <div className="chart-grid">
                  <div className="chart-card" onClick={() => setActiveChart("insulin")}>
                    <h4>Blood Sugar Levels</h4>
                    <Line
                      data={getBloodSugarData(
                        patientLogs[selectedPatient.id]?.insulinLogs || []
                      )}
                      options={{ maintainAspectRatio: false }}
                    />
                  </div>
                  <div className="chart-card" onClick={() => setActiveChart("activity")}>
                    <h4>Physical Activities</h4>
                    <Bar
                      data={getActivityData(
                        patientLogs[selectedPatient.id]?.activityLogs || []
                      )}
                      options={{ maintainAspectRatio: false }}
                    />
                  </div>
                  <div className="chart-card full" onClick={() => setActiveChart("meal")}>
                    <h4>Meal Distribution</h4>
                    <Pie
                      data={getMealData(
                        patientLogs[selectedPatient.id]?.mealLogs || []
                      )}
                      options={{ maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>

              {/* ✅ DOCTOR NOTES */}
              <div className="notes-section">
                <h3>Doctor’s Notes</h3>
                <textarea
                  placeholder="Write a note..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                />
                <button onClick={() => handleAddNote(selectedPatient.id)}>
                  Save Note
                </button>
                <ul className="notes-list">
                  {notes[selectedPatient.id]?.length ? (
                    notes[selectedPatient.id].map((n, i) => <li key={i}>{n}</li>)
                  ) : (
                    <p>No notes yet.</p>
                  )}
                </ul>
              </div>
            </main>
          </div>

          {/* ✅ TABLE DETAIL MODAL */}
          {activeChart && renderLogDetails(activeChart)}
        </div>
      )}
    </div>
  );
};

export default Patients;
