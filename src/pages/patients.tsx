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
  // Group logs by date
  const grouped: Record<string, { cbg: number[]; pre: number[]; post: number[] }> = {};

  logs.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString("en-US");
    if (!grouped[date]) grouped[date] = { cbg: [], pre: [], post: [] };

    if (log.cbg) grouped[date].cbg.push(Number(log.cbg));
    if (log.cbg_pre_meal) grouped[date].pre.push(Number(log.cbg_pre_meal));
    if (log.cbg_post_meal) grouped[date].post.push(Number(log.cbg_post_meal));
  });

  const labels = Object.keys(grouped);
  const average = (arr: number[]) =>
    arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;

  const cbgData = labels.map((d) => average(grouped[d].cbg));
  const preData = labels.map((d) => average(grouped[d].pre));
  const postData = labels.map((d) => average(grouped[d].post));

  return {
    labels,
    datasets: [
      {
        label: "CBG",
        data: cbgData,
        borderColor: "#007b55",
        backgroundColor: "rgba(0,123,85,0.2)",
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Pre-Meal CBG",
        data: preData,
        borderColor: "#FF9900",
        backgroundColor: "rgba(255,153,0,0.2)",
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Post-Meal CBG",
        data: postData,
        borderColor: "#3366CC",
        backgroundColor: "rgba(51,102,204,0.2)",
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
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
    const labels = Object.keys(grouped);
    const data = labels.map((d) => grouped[d]);
    return {
      labels,
      datasets: [
        {
          label: "Total Duration (minutes)",
          data,
          backgroundColor: "#34a853",
        },
      ],
    };
  };

  const getMealStackedData = (logs: any[]) => {
    const filteredLogs =
      mealTypeFilter === "all"
        ? logs
        : logs.filter((log) => log.meal_type?.toLowerCase() === mealTypeFilter);

    const grouped: Record<string, Record<string, number>> = {};
    filteredLogs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleDateString("en-US");
      if (!grouped[date]) grouped[date] = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
      const type = log.meal_type?.toLowerCase();
      if (type && grouped[date][type] !== undefined) grouped[date][type] += 1;
    });

    const labels = Object.keys(grouped);
    return {
      labels,
      datasets: [
        {
          label: "Breakfast",
          data: labels.map((d) => grouped[d].breakfast),
          backgroundColor: "#FFD700",
        },
        {
          label: "Lunch",
          data: labels.map((d) => grouped[d].lunch),
          backgroundColor: "#FF8C00",
        },
        {
          label: "Dinner",
          data: labels.map((d) => grouped[d].dinner),
          backgroundColor: "#FF4500",
        },
        {
          label: "Snacks",
          data: labels.map((d) => grouped[d].snacks),
          backgroundColor: "#32CD32",
        },
      ],
    };
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const ageDiff = Date.now() - birthDate.getTime();
    return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const renderLogDetails = (type: string) => {
    if (!selectedPatient) return null;
    const logs = patientLogs[selectedPatient.id] || {};
    let list: any[] = [];

    if (type === "insulin") list = logs.insulinLogs || [];
    if (type === "activity") list = logs.activityLogs || [];
    if (type === "meal")
      list =
        mealTypeFilter === "all"
          ? logs.mealLogs || []
          : (logs.mealLogs || []).filter(
              (log) => log.meal_type?.toLowerCase() === mealTypeFilter
            );

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

          {type === "meal" && (
            <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
              <label htmlFor="meal-filter" style={{ fontWeight: 500, color: "#046307" }}>
                Filter by Meal Type:
              </label>
              <select
                id="meal-filter"
                value={mealTypeFilter}
                onChange={(e) => setMealTypeFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #046307",
                  background: "#f8fff8",
                  cursor: "pointer",
                  color: "#046307",
                }}
              >
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
                    <th>Activity</th>
                    <th>Duration (minutes)</th>
                    <th>Notes</th>
                  </tr>
                )}
                {type === "meal" && (
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Meal Type</th>
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
                        <td>{new Date(log.created_at).toLocaleString("en-US", { 
                              weekday: "short", 
                              year: "numeric", 
                              month: "short", 
                              day: "numeric", 
                              hour: "2-digit", 
                              minute: "2-digit" 
                          })}</td>
                        <td>{log.dosage ?? "—"}</td>
                        <td>{log.cbg ?? "—"}</td>
                        <td>{log.cbg_pre_meal ?? "—"}</td>
                        <td>{log.cbg_post_meal ?? "—"}</td>
                        <td>{log.notes || "—"}</td>
                      </>
                    )}
                    {type === "activity" && (
                      <>
                        <td>{new Date(log.created_at).toLocaleString("en-US", { 
                              weekday: "short", 
                              year: "numeric", 
                              month: "short", 
                              day: "numeric", 
                              hour: "2-digit", 
                              minute: "2-digit" 
                          })}</td>
                        <td>{log.activity_type || "—"}</td>
                        <td>{log.duration || "—"}</td>
                        <td>{log.notes || "—"}</td>
                      </>
                    )}
                    {type === "meal" && (
                      <>
                        <td>{new Date(log.created_at).toLocaleString("en-US", { 
                              weekday: "short", 
                              year: "numeric", 
                              month: "short", 
                              day: "numeric", 
                              hour: "2-digit", 
                              minute: "2-digit" 
                          })}</td>
                        <td>{log.meal_type || "—"}</td>
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
            <p>No logs available for selected filter.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="patients-container">
      <h2>👩‍⚕️ My Assigned Patients</h2>
      {patients.filter(
        (p) =>
          p &&
          typeof p.name === "string" &&
          p.name.toLowerCase().includes((searchTerm || "").toLowerCase())
      ).length === 0 ? (
        <p className="empty">No patients found.</p>
      ) : (
        <div className="patients-grid">
          {patients
            .filter(
              (p) =>
                p &&
                typeof p.name === "string" &&
                p.name.toLowerCase().includes((searchTerm || "").toLowerCase())
            )
            .map((p) => (
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
            <button className="close-btn" onClick={() => setSelectedPatient(null)}>
              ✖
            </button>

            {/* Sidebar */}
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
                  <tr>
                    <td>Gender:</td>
                    <td>{selectedPatient.gender}</td>
                  </tr>
                  <tr>
                    <td>Age:</td>
                    <td>{calculateAge(selectedPatient.date_of_birth)}</td>
                  </tr>
                  <tr>
                    <td>Height:</td>
                    <td>{selectedPatient.height || "N/A"} cm</td>
                  </tr>
                  <tr>
                    <td>Weight:</td>
                    <td>{selectedPatient.weight || "N/A"} kg</td>
                  </tr>
                  <tr>
                    <td>Address:</td>
                    <td>{selectedPatient.address}</td>
                  </tr>
                  <tr>
                    <td>Phone:</td>
                    <td>{selectedPatient.phone_number}</td>
                  </tr>
                </tbody>
              </table>
            </aside>

            {/* Main Content */}
            <main className="modal-details">
              {/* Charts */}
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
                    <h4>Physical Activities (Duration per Day)</h4>
                    <Bar
                      data={getActivityPerDateData(
                        patientLogs[selectedPatient.id]?.activityLogs || []
                      )}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>

                  <div className="chart-card full" onClick={() => setActiveChart("meal")}>
                    <h4>Meal Distribution (Stacked)</h4>
                    <Bar
                      data={getMealStackedData(patientLogs[selectedPatient.id]?.mealLogs || [])}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: { legend: { position: "bottom" } },
                        scales: { x: { stacked: true }, y: { stacked: true } },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Notes */}
              <div className="notes-section">
                <h3>Doctor Notes</h3>
                <div className="add-note">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Write a note..."
                  />
                  <button onClick={() => handleAddNote(selectedPatient.id)}>Save Note</button>
                </div>
                <ul className="notes-list">
                  {(notes[selectedPatient.id] || []).map((n, idx) => (
                    <li key={idx}>{n}</li>
                  ))}
                </ul>
              </div>

               {/* Insulin Photos */}
              <div className="gallery-section">
                <h3>Insulin Photo Gallery</h3>
                {insulinPhotos.length > 0 ? (
                  <div className="gallery-grid">
                    {insulinPhotos.map((photo, i) => (
                      <div className="gallery-item" key={i}>
                        <img
                          src={photo.url}
                          alt={`Insulin ${i + 1}`}
                          onClick={() => setSelectedPhoto(photo.url)}
                          className="clickable-photo"
                        />
                        <div className="photo-date">
                          {photo.date ? new Date(photo.date).toLocaleString() : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No insulin photos uploaded yet.</p>
                )}
                {selectedPhoto && (
                  <div className="photo-modal" onClick={() => setSelectedPhoto(null)}>
                    <div
                      className="photo-modal-content"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="close-photo"
                        onClick={() => setSelectedPhoto(null)}
                      >
                        X
                      </button>
                      <img src={selectedPhoto} alt="Enlarged Insulin" />
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
