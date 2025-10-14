import React, { useState, useEffect } from "react";
import "../css/Reports.css";
import supabase from "../supabaseClient";

interface Patient {
  id: string;
  name: string;
  email: string;
  doctor_id: string;
}

interface InsulinLog {
  created_at: string;
  dosage: number;
  cbg: number;
  cbg_pre_meal: number;
  cbg_post_meal: number;
  notes: string;
}

interface ActivityLog {
  created_at: string;
  activity_type: string;
  duration: number;
  start_time: string;
  end_time: string;
  notes: string;
}

interface MealLog {
  created_at: string;
  meal_type: string;
  calories: number;
  rice_cups: number;
  dish: string;
  drinks: string;
  notes: string;
}

interface DoctorNote {
  created_at: string;
  note: string;
}

const Reports: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [insulinLogs, setInsulinLogs] = useState<InsulinLog[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // ✅ Fetch patients assigned to the logged-in doctor
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        let doctorId = localStorage.getItem("doctor_id");

        if (!doctorId) {
          const doctorEmail = localStorage.getItem("doctorEmail");
          if (!doctorEmail) {
            setError("⚠️ No logged-in doctor found.");
            return;
          }

          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", doctorEmail)
            .single();

          if (userError || !userData) {
            setError("⚠️ Failed to fetch doctor account.");
            return;
          }

          const { data: doctorData, error: doctorError } = await supabase
            .from("doctors")
            .select("id")
            .eq("user_id", userData.id)
            .single();

          if (doctorError || !doctorData) {
            setError("⚠️ No doctor profile found for this user.");
            return;
          }

          doctorId = doctorData.id;
          localStorage.setItem("doctor_id", doctorId);
        }

        const { data, error } = await supabase
          .from("patients")
          .select("id, name, doctor_id")
          .eq("doctor_id", doctorId);

        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error("Error fetching patients:", err);
        setError("⚠️ Failed to fetch patients.");
      }
    };

    fetchPatients();
  }, []);

  // ✅ Fetch all logs + doctor's notes for selected patient
  useEffect(() => {
    const fetchReports = async () => {
      if (!selectedPatient) return;
      setLoading(true);
      setError("");

      try {
        const doctorId = localStorage.getItem("doctor_id");

        const [insulinRes, mealRes, activityRes, reportsRes] = await Promise.all([
          supabase.from("insulin").select("*").eq("patient_id", selectedPatient),
          supabase.from("meals").select("*").eq("patient_id", selectedPatient),
          supabase.from("activities").select("*").eq("patient_id", selectedPatient),
          supabase
            .from("doctor_reports")
            .select("report_data, created_at")
            .eq("patient_id", selectedPatient)
            .eq("doctor_id", doctorId)
            .order("created_at", { ascending: false }),
        ]);

        if (insulinRes.error) throw insulinRes.error;
        if (mealRes.error) throw mealRes.error;
        if (activityRes.error) throw activityRes.error;
        if (reportsRes.error) throw reportsRes.error;

        setInsulinLogs(insulinRes.data || []);
        setMealLogs(mealRes.data || []);
        setActivityLogs(activityRes.data || []);

        // Extract note from report_data JSON
        const notes = (reportsRes.data || [])
          .map((r: any) => ({
            created_at: r.created_at,
            note: r.report_data?.note || "",
          }))
          .filter((r) => r.note.trim() !== "");

        setDoctorNotes(notes);
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Failed to load report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedPatient]);

  const handlePrint = () => window.print();

  return (
    <div className="reports-container">
      <h2>📑 Patient Reports</h2>

      {/* Patient Dropdown */}
      <div className="dropdown-section">
        <label>Select Patient: </label>
        <select
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          style={{
            backgroundColor: "#e6f4ea",
            border: "1px solid #046307",
            borderRadius: "8px",
            padding: "10px",
            color: "#046307",
            fontWeight: "bold",
          }}
        >
          <option value="">-- Choose a patient --</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>⏳ Loading report...</p>}
      {error && <p className="error-text">⚠️ {error}</p>}

      {/* Report Display */}
      {!loading && selectedPatient && (
        <div className="report-section">
          <h3>🧾 Report for {patients.find(p => p.id === selectedPatient)?.name}</h3>
          <p>🗓 Generated on: {new Date().toLocaleString()}</p>

          {/* Insulin Logs */}
          <h4>💉 Insulin & Blood Sugar Logs</h4>
          {insulinLogs.length > 0 ? (
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Dosage</th>
                  <th>CBG</th>
                  <th>Pre-Meal</th>
                  <th>Post-Meal</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {insulinLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.dosage ?? "—"}</td>
                    <td>{log.cbg ?? "—"}</td>
                    <td>{log.cbg_pre_meal ?? "—"}</td>
                    <td>{log.cbg_post_meal ?? "—"}</td>
                    <td>{log.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No insulin logs available.</p>
          )}

          {/* Activities */}
          <h4>🏃 Physical Activities</h4>
          {activityLogs.length > 0 ? (
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Activity Type</th>
                  <th>Duration</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((a, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{new Date(a.created_at).toLocaleString()}</td>
                    <td>{a.activity_type}</td>
                    <td>{a.duration}</td>
                    <td>{a.start_time ? new Date(a.start_time).toLocaleTimeString() : "—"}</td>
                    <td>{a.end_time ? new Date(a.end_time).toLocaleTimeString() : "—"}</td>
                    <td>{a.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No activity logs available.</p>
          )}

          {/* Meals */}
          <h4>🍽 Meals</h4>
          {mealLogs.length > 0 ? (
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Meal Type</th>
                  <th>Calories</th>
                  <th>Rice (cups)</th>
                  <th>Dish</th>
                  <th>Drinks</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {mealLogs.map((m, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{new Date(m.created_at).toLocaleString()}</td>
                    <td>{m.meal_type}</td>
                    <td>{m.calories}</td>
                    <td>{m.rice_cups}</td>
                    <td>{m.dish}</td>
                    <td>{m.drinks}</td>
                    <td>{m.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No meal logs available.</p>
          )}

          {/* ✅ Doctor’s Notes */}
          <h4>🩺 Doctor’s Notes</h4>
          {doctorNotes.length > 0 ? (
            <ul className="doctor-notes-list">
              {doctorNotes.map((n, i) => (
                <li key={i} className="note-box">
                  <strong>🕒 {new Date(n.created_at).toLocaleString()}</strong>
                  <p>{n.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No doctor’s notes available.</p>
          )}

          <button className="print-btn" onClick={handlePrint}>
            🖨 Print Report
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;
