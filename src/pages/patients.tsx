import React, { useState, useEffect } from "react";
import "../css/Patients.css";
import { Bar, Line } from "react-chartjs-2";
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
import anonymousProfilePic from "../assets/anonymous.jpg";
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

interface Logs {
  insulinLogs: any[];
  mealLogs: any[];
  activityLogs: any[];
  sleepLogs?: any[];
  stressLogs?: any[];
}

const Patients: React.FC<{ searchTerm: string }> = ({ searchTerm }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientLogs, setPatientLogs] = useState<Record<string, Logs>>({});
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [activeChart, setActiveChart] = useState<string | null>(null);
  const [insulinPhotos, setInsulinPhotos] = useState<{ url: string; date: any }[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [mealTypeFilter, setMealTypeFilter] = useState<string>("all");

  // Fetch patients
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

  // Fetch logs
  const fetchPatientLogs = async (patientId: string) => {
    try {
      const [insulinRes, mealRes, activityRes, sleepRes, stressRes] = await Promise.all([
        supabase.from("insulin").select("*").eq("patient_id", patientId),
        supabase.from("meals").select("*").eq("patient_id", patientId),
        supabase.from("activities").select("*").eq("patient_id", patientId),
        supabase.from("patient_sleep").select("*").eq("patient_id", patientId),
        supabase.from("patient_stress").select("*").eq("patient_id", patientId),
      ]);

      setPatientLogs((prev) => ({
        ...prev,
        [patientId]: {
          insulinLogs: insulinRes.data || [],
          mealLogs: mealRes.data || [],
          activityLogs: activityRes.data || [],
          sleepLogs: sleepRes.data || [],
          stressLogs: stressRes.data || [],
        },
      }));
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchDoctorNotes = async (patientId: string) => {
    const doctorId = localStorage.getItem("doctor_id");
    if (!doctorId) return;

    const { data, error } = await supabase
      .from("doctor_reports")
      .select("report_data, created_at")
      .eq("doctor_id", doctorId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching doctor notes:", error);
    else {
      const notesArr = data.map((r: any) => r.report_data?.note || "");
      setNotes((prev) => ({ ...prev, [patientId]: notesArr }));
    }
  };

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

  const fetchInsulinPhotos = async (patientId: string) => {
    try {
      const { data: photoData, error: metaError } = await supabase
        .from("insulin_photos_metadata")
        .select("file_name, uploaded_at")
        .eq("patient_id", patientId);

      if (metaError) {
        console.error("Error fetching metadata:", metaError);
        return;
      }

      if (photoData && photoData.length > 0) {
        const urls = photoData.map((p) => {
          const { data: publicUrl } = supabase.storage
            .from("insulin_photos")
            .getPublicUrl(p.file_name);
          return { url: publicUrl.publicUrl, date: p.uploaded_at };
        });
        setInsulinPhotos(urls);
      } else setInsulinPhotos([]);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  // Chart data helpers
  const getBloodSugarData = (logs: any[]) => {
    const grouped: Record<string, { cbg: number[]; pre: number[]; post: number[] }> = {};
    logs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleDateString("en-US");
      if (!grouped[date]) grouped[date] = { cbg: [], pre: [], post: [] };
      if (log.cbg) grouped[date].cbg.push(Number(log.cbg));
      if (log.cbg_pre_meal) grouped[date].pre.push(Number(log.cbg_pre_meal));
      if (log.cbg_post_meal) grouped[date].post.push(Number(log.cbg_post_meal));
    });
    const labels = Object.keys(grouped).sort((a,b)=> new Date(a).getTime() - new Date(b).getTime());
    const average = (arr: number[]) => (arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0);
    return {
      labels,
      datasets: [
        { label: "CBG", data: labels.map(d => average(grouped[d].cbg)), borderColor: "#007b55", backgroundColor: "rgba(0,123,85,0.2)", tension: 0.4, fill: false },
        { label: "Pre-Meal CBG", data: labels.map(d => average(grouped[d].pre)), borderColor: "#FF9900", backgroundColor: "rgba(255,153,0,0.2)", tension: 0.4, fill: false },
        { label: "Post-Meal CBG", data: labels.map(d => average(grouped[d].post)), borderColor: "#3366CC", backgroundColor: "rgba(51,102,204,0.2)", tension: 0.4, fill: false },
      ],
    };
  };

  const getActivityPerDateData = (logs: any[]) => {
    const grouped: Record<string, number> = {};
    logs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleDateString("en-US");
      if (!grouped[date]) grouped[date] = 0;
      grouped[date] += Number(log.duration) || 0;
    });
    const labels = Object.keys(grouped).sort((a,b)=> new Date(a).getTime() - new Date(b).getTime());
    return {
      labels,
      datasets: [{ label: "Total Duration (minutes)", data: labels.map(d => grouped[d]), backgroundColor: "#34a853" }],
    };
  };

  const getMealStackedData = (logs: any[]) => {
    const filteredLogs = mealTypeFilter === "all" ? logs : logs.filter(log => log.meal_type?.toLowerCase() === mealTypeFilter);
    const grouped: Record<string, Record<string, number>> = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString("en-US");
      if (!grouped[date]) grouped[date] = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
      const type = log.meal_type?.toLowerCase();
      if (type && grouped[date][type] !== undefined) grouped[date][type] += 1;
    });
    const labels = Object.keys(grouped).sort((a,b)=> new Date(a).getTime() - new Date(b).getTime());
    return {
      labels,
      datasets: [
        { label: "Breakfast", data: labels.map(d => grouped[d].breakfast), backgroundColor: "#FFD700" },
        { label: "Lunch", data: labels.map(d => grouped[d].lunch), backgroundColor: "#FF8C00" },
        { label: "Dinner", data: labels.map(d => grouped[d].dinner), backgroundColor: "#FF4500" },
        { label: "Snacks", data: labels.map(d => grouped[d].snacks), backgroundColor: "#32CD32" },
      ],
    };
  };

  const getSleepData = (logs: any[]) => {
    const grouped: Record<string, number> = {};
    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString("en-US");
      grouped[date] = Number(log.sleep_hours) || 0;
    });
    const labels = Object.keys(grouped).sort((a,b)=> new Date(a).getTime() - new Date(b).getTime());
    return {
      labels,
      datasets: [{ label: "Hours Slept", data: labels.map(d => grouped[d]), borderColor: "#6a1b9a", backgroundColor: "rgba(106,27,154,0.2)", tension: 0.4, fill: false }],
    };
  };

  const getStressData = (logs: any[]) => {
    const grouped: Record<string, number> = {};
    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString("en-US");
      grouped[date] = Number(log.stress_score) || 0;
    });
    const labels = Object.keys(grouped).sort((a,b)=> new Date(a).getTime() - new Date(b).getTime());
    return {
      labels,
      datasets: [{ label: "Stress Level", data: labels.map(d => grouped[d]), borderColor: "#e53935", backgroundColor: "rgba(229,57,53,0.2)", tension: 0.4, fill: false }],
    };
  };

  const calculateAge = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));

      const [startDateFilter, setStartDateFilter] = useState<string | null>(null);
    const [endDateFilter, setEndDateFilter] = useState<string | null>(null);
  const renderLogDetails = (type: string) => {

    if (!selectedPatient) return null;
    const logs = patientLogs[selectedPatient.id] || {};
    let list: any[] = [];

    if (type === "insulin") list = logs.insulinLogs || [];
    if (type === "activity") list = logs.activityLogs || [];
    if (type === "meal") list = mealTypeFilter === "all" ? logs.mealLogs || [] : (logs.mealLogs || []).filter(l => l.meal_type?.toLowerCase() === mealTypeFilter);
    if (type === "sleep") list = logs.sleepLogs || [];
    if (type === "stress") list = logs.stressLogs || [];

     // ✅ Apply date filter if set
        if (startDateFilter) {
          list = list.filter(
            (l) => new Date(l.created_at) >= new Date(startDateFilter)
          );
        }
        if (endDateFilter) {
          list = list.filter(
            (l) => new Date(l.created_at) <= new Date(endDateFilter)
          );
        }

        // ✅ Sort logs by date ascending
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return (
  <div className="log-detail-modal">
        <div className="log-detail-content">
          <h3>
            {type === "insulin" ? "🩸 Insulin & Blood Sugar Logs" :
             type === "activity" ? "🏃 Activity Logs" :
             type === "meal" ? "🍽️ Meal Logs" :
             type === "sleep" ? "💤 Sleep Logs" : "😓 Stress Logs"}
          </h3>
          <button className="close-submodal" onClick={() => setActiveChart(null)}>✖</button>

        {/* Date filter inputs */}
        <div className="date-filter">
          <label>From: </label>
          <input
            type="date"
            value={startDateFilter || ""}
            onChange={(e) => setStartDateFilter(e.target.value)}
          />
          <label>To: </label>
          <input
            type="date"
            value={endDateFilter || ""}
            onChange={(e) => setEndDateFilter(e.target.value)}
          />
          <button onClick={() => {setStartDateFilter(null); setEndDateFilter(null);}}>Clear</button>
        </div>
          {/* Meal type filter dropdown */}
          {type === "meal" && (
            <div className="meal-filter-dropdown">
              <label>Filter by Meal Type: </label>
              <select value={mealTypeFilter} onChange={(e) => setMealTypeFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snacks">Snacks</option>
              </select>
            </div>
          )}

          {list.length > 0 ? (
            <table className="log-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date and Time</th>
                  {type === "insulin" && <>
                    <th>Dosage</th><th>CBG</th><th>Pre-Meal CBG</th><th>Post-Meal CBG</th><th>Notes</th>
                  </>}
                  {type === "activity" && <>
                    <th>Activity</th><th>Duration (minutes)</th><th>Notes</th>
                  </>}
                  {type === "meal" && <>
                    <th>Meal Type</th><th>Rice</th><th>Dish</th><th>Drinks</th><th>Notes</th>
                  </>}
                  {type === "sleep" && <th>Hours Slept</th>}
                  {type === "stress" && <th>Stress Level</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((log, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{new Date(log.created_at).toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true
                      })}</td>
                    {type === "insulin" && <>
                      <td>{log.dosage ?? "—"}</td><td>{log.cbg ?? "—"}</td><td>{log.cbg_pre_meal ?? "—"}</td><td>{log.cbg_post_meal ?? "—"}</td><td>{log.notes || "—"}</td>
                    </>}
                    {type === "activity" && <>
                      <td>{log.activity_type || "—"}</td><td>{log.duration || "—"}</td><td>{log.notes || "—"}</td>
                    </>}
                    {type === "meal" && <>
                      <td>{log.meal_type || "—"}</td><td>{log.rice_cups || "—"}</td><td>{log.dish || "—"}</td><td>{log.drinks || "—"}</td><td>{log.notes || "—"}</td>
                    </>}
                    {type === "sleep" && <td>{log.sleep_hours || "—"}</td>}
                    {type === "stress" && <td>{log.stress_score || "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p>No logs available.</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="patients-container">
      <h2>👩‍⚕️ My Assigned Patients</h2>
      {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
        <p className="empty">No patients found.</p>
      ) : (
          <div className="patients-grid">
            {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(p => (
                <div className="patient-card" key={p.id}>
                  <img 
                    src={p.profile_picture || anonymousProfilePic} 
                    alt="Profile" 
                    className="patient-img"
                  />
                  <div className="patient-info-container">
                    <h3>{p.name}</h3>
                    <p>{p.condition}</p>
                    <p>{calculateAge(p.date_of_birth)} years old</p>
                  </div>
                  <button 
                    className="view-btn" 
                    onClick={() => { 
                      setSelectedPatient(p); 
                      fetchPatientLogs(p.id); 
                      fetchDoctorNotes(p.id); 
                      fetchInsulinPhotos(p.id); 
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
          </div>

      )}

      {selectedPatient && (
        <div className="patient-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setSelectedPatient(null)}>✖</button>
            <aside className="modal-sidebar">
              <img src={selectedPatient.profile_picture || anonymousProfilePic} alt="Profile" className="modal-avatar"/>
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

            <main className="modal-details">
              <div className="chart-section">
                <h3>Patient Health Overview</h3>
                <div className="chart-grid">
                  <div className="chart-card" onClick={() => setActiveChart("insulin")}>
                    <h4>Blood Sugar Levels</h4>
                    <Line data={getBloodSugarData(patientLogs[selectedPatient.id]?.insulinLogs || [])} options={{ maintainAspectRatio: false }}/>
                  </div>
                  <div className="chart-card" onClick={() => setActiveChart("activity")}>
                    <h4>Physical Activities</h4>
                    <Bar data={getActivityPerDateData(patientLogs[selectedPatient.id]?.activityLogs || [])} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}/>
                  </div>
                  <div className="chart-card full" onClick={() => setActiveChart("meal")}>
                    <h4>Meal Distribution</h4>
                    <Bar data={getMealStackedData(patientLogs[selectedPatient.id]?.mealLogs || [])} options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { x: { stacked: true }, y: { stacked: true } } }}/>
                  </div>
                  <div className="chart-card" onClick={() => setActiveChart("sleep")}>
                    <h4>Sleep Hours</h4>
                    <Line data={getSleepData(patientLogs[selectedPatient.id]?.sleepLogs || [])} options={{ maintainAspectRatio: false }}/>
                  </div>
                  <div className="chart-card" onClick={() => setActiveChart("stress")}>
                    <h4>Stress Levels</h4>
                    <Line data={getStressData(patientLogs[selectedPatient.id]?.stressLogs || [])} options={{ maintainAspectRatio: false }}/>
                  </div>
                </div>
              </div>

              <div className="notes-section">
                <h3>Doctor Notes</h3>
                <div className="add-note">
                  <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a note..."/>
                  <button onClick={() => handleAddNote(selectedPatient.id)}>Save Note</button>
                </div>
                <ul className="notes-list">
                  {(notes[selectedPatient.id] || []).map((n, idx) => <li key={idx}>{n}</li>)}
                </ul>
              </div>

              <div className="gallery-section">
                <h3>Insulin Photo Gallery</h3>
                {insulinPhotos.length > 0 ? (
                  <div className="gallery-grid">
                    {insulinPhotos.map((photo, i) => (
                      <div className="gallery-item" key={i}>
                        <img src={photo.url} alt={`Insulin ${i + 1}`} onClick={() => setSelectedPhoto(photo.url)} className="clickable-photo"/>
                        <div className="photo-date">{photo.date ? new Date(photo.date).toLocaleString() : ""}</div>
                      </div>
                    ))}
                  </div>
                ) : <p>No insulin photos uploaded yet.</p>}
                {selectedPhoto && (
                  <div className="photo-modal" onClick={() => setSelectedPhoto(null)}>
                    <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
                      <button className="close-photo" onClick={() => setSelectedPhoto(null)}>X</button>
                      <img src={selectedPhoto} alt="Enlarged Insulin"/>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {activeChart && renderLogDetails(activeChart)}
    </div>
  );
};

export default Patients;
