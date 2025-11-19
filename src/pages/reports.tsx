import React, { useState, useEffect } from "react";
import "../css/Reports.css";
import supabase from "../supabaseClient";

interface Patient {
  id: string;
  name: string;
  gender?: string;
  condition?: string;
  doctor_id: string;
  date_of_birth?: string;
  address?: string;
  phone_number?: string;
  profile_picture?: string;
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

interface SleepLog {
  created_at: string;
  hours_slept: number;
  notes?: string;
}

interface StressLog {
  created_at: string;
  stress_score: number;
  notes?: string;
}

interface DoctorNote {
  created_at: string;
  note: string;
}

const Reports: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [insulinLogs, setInsulinLogs] = useState<InsulinLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [stressLogs, setStressLogs] = useState<StressLog[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);

  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [collapsedSections, setCollapsedSections] = useState({
    insulin: false,
    activities: false,
    meals: false,
    sleep: false,
    stress: false,
    doctorNotes: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const doctorId = localStorage.getItem("doctor_id");
        if (!doctorId) return setError("⚠️ No logged-in doctor found.");

        const { data, error } = await supabase
          .from("patients")
          .select("*")
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

  const fetchPatientReports = async (pid: string) => {
    setLoading(true);
    setError("");

    try {
      const doctorId = localStorage.getItem("doctor_id");

      const [insulinRes, mealRes, activityRes, sleepRes, stressRes, reportsRes] =
        await Promise.all([
          supabase.from("insulin").select("*").eq("patient_id", pid),
          supabase.from("meals").select("*").eq("patient_id", pid),
          supabase.from("activities").select("*").eq("patient_id", pid),
          supabase.from("patient_sleep").select("*").eq("patient_id", pid),
          supabase.from("patient_stress").select("*").eq("patient_id", pid),
          supabase
            .from("doctor_reports")
            .select("report_data, created_at")
            .eq("patient_id", pid)
            .eq("doctor_id", doctorId)
            .order("created_at", { ascending: false }),
        ]);

      if (insulinRes.error) throw insulinRes.error;
      if (mealRes.error) throw mealRes.error;
      if (activityRes.error) throw activityRes.error;
      if (sleepRes.error) throw sleepRes.error;
      if (stressRes.error) throw stressRes.error;
      if (reportsRes.error) throw reportsRes.error;

      setInsulinLogs(insulinRes.data || []);
      setMealLogs(mealRes.data || []);
      setActivityLogs(activityRes.data || []);
      setSleepLogs(sleepRes.data || []);
      setStressLogs(stressRes.data || []);

      const notes = (reportsRes.data || [])
        .map((r: any) => ({
          created_at: r.created_at,
          note: r.report_data?.note || "",
        }))
        .filter((r) => r.note.trim() !== "");

      setDoctorNotes(notes);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError("⚠️ Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const ageDiff = Date.now() - birthDate.getTime();
    return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const filterByDate = (logs: any[]) => {
    return logs.filter((log) => {
      const logDate = new Date(log.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      return (!start || logDate >= start) && (!end || logDate <= end);
    });
  };

  const handlePrint = () => window.print();

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="reports-container">
      {!selectedPatient ? (
        <>
          <h2>📑 Patient Reports</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          {filteredPatients.length === 0 ? (
            <p className="empty">No patients found.</p>
          ) : (
            <div className="patients-grid">
              {filteredPatients.map((p) => (
                <div className="patient-card" key={p.id}>
                  <img
                    src={p.profile_picture || "src/assets/default-user.png"}
                    alt="Profile"
                    className="patient-img"
                  />
                  <div className="patient-info">
                    <h3>{p.name}</h3>
                    <p>{p.condition || "No condition listed"}</p>
                    <p>{calculateAge(p.date_of_birth)} years old</p>
                  </div>
                  <button
                    className="view-btn"
                    onClick={() => {
                      setSelectedPatient(p);
                      fetchPatientReports(p.id);
                    }}
                  >
                    View Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="patient-report-view">
          <button
            className="back-btn"
            onClick={() => {
              setSelectedPatient(null);
              setInsulinLogs([]);
              setMealLogs([]);
              setActivityLogs([]);
              setSleepLogs([]);
              setStressLogs([]);
              setDoctorNotes([]);
            }}
          >
            ⬅ Back to Patients
          </button>

          <div className="report-header">
            <img
              src={selectedPatient.profile_picture || "src/assets/default-user.png"}
              alt="Profile"
              className="report-avatar"
            />
            <div>
              <h2>{selectedPatient.name}</h2>
              <p>{selectedPatient.condition}</p>
              <p>
                {selectedPatient.gender || "N/A"} |{" "}
                {calculateAge(selectedPatient.date_of_birth)} years old
              </p>
              <p>📍 {selectedPatient.address || "N/A"}</p>
              <p>📞 {selectedPatient.phone_number || "N/A"}</p>
            </div>
          </div>

          <div className="filter-controls">
            <label>
              Filter by Type:{" "}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All</option>
                <option value="insulin">Insulin</option>
                <option value="activities">Activities</option>
                <option value="meals">Meals</option>
                <option value="sleep">Sleep</option>
                <option value="stress">Stress</option>
              </select>
            </label>

            <label>
              Start Date:{" "}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label>
              End Date:{" "}
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <div className="report-sections">
            {loading ? (
              <p>⏳ Loading data...</p>
            ) : (
              <>
                {(filterType === "all" || filterType === "insulin") && (
                  <section className="report-section">
                    <h3
                      onClick={() => toggleSection("insulin")}
                      style={{ cursor: "pointer" }}
                    >
                      💉 Insulin & Blood Sugar Logs {collapsedSections.insulin ? "🔽" : "🔼"}
                    </h3>
                    {!collapsedSections.insulin &&
                      (filterByDate(insulinLogs).length > 0 ? (
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
                            {filterByDate(insulinLogs).map((log, i) => (
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
                        <p>No insulin logs found for selected filters.</p>
                      ))}
                  </section>
                )}

                {/* Repeat collapsible pattern for activities, meals, sleep, stress, doctor notes */}
                {(filterType === "all" || filterType === "activities") && (
                  <section className="report-section">
                    <h3
                      onClick={() => toggleSection("activities")}
                      style={{ cursor: "pointer" }}
                    >
                      🏃 Physical Activities {collapsedSections.activities ? "🔽" : "🔼"}
                    </h3>
                    {!collapsedSections.activities &&
                      (filterByDate(activityLogs).length > 0 ? (
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Date</th>
                              <th>Activity</th>
                              <th>Duration</th>
                              <th>Start</th>
                              <th>End</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filterByDate(activityLogs).map((a, i) => (
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
                        <p>No activity logs found for selected filters.</p>
                      ))}
                  </section>
                )}

                {/* Meals */}
                {(filterType === "all" || filterType === "meals") && (
                  <section className="report-section">
                    <h3
                      onClick={() => toggleSection("meals")}
                      style={{ cursor: "pointer" }}
                    >
                      🍽 Meals {collapsedSections.meals ? "🔽" : "🔼"}
                    </h3>
                    {!collapsedSections.meals &&
                      (filterByDate(mealLogs).length > 0 ? (
                        <table className="report-table">
                          <thead>
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
                          </thead>
                          <tbody>
                            {filterByDate(mealLogs).map((m, i) => (
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
                        <p>No meal logs found for selected filters.</p>
                      ))}
                  </section>
                )}

                {/* Sleep */}
                {(filterType === "all" || filterType === "sleep") && (
                  <section className="report-section">
                    <h3
                      onClick={() => toggleSection("sleep")}
                      style={{ cursor: "pointer" }}
                    >
                      🛌 Sleep Logs {collapsedSections.sleep ? "🔽" : "🔼"}
                    </h3>
                    {!collapsedSections.sleep &&
                      (filterByDate(sleepLogs).length > 0 ? (
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Date</th>
                              <th>Hours Slept</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filterByDate(sleepLogs).map((s, i) => (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{new Date(s.created_at).toLocaleString()}</td>
                                <td>{s.sleep_hours}</td>
                                <td>{s.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p>No sleep logs found for selected filters.</p>
                      ))}
                  </section>
                )}

                {/* Stress */}
                {(filterType === "all" || filterType === "stress") && (
                  <section className="report-section">
                    <h3
                      onClick={() => toggleSection("stress")}
                      style={{ cursor: "pointer" }}
                    >
                      😰 Stress Logs {collapsedSections.stress ? "🔽" : "🔼"}
                    </h3>
                    {!collapsedSections.stress &&
                      (filterByDate(stressLogs).length > 0 ? (
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Date</th>
                              <th>Stress Score</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filterByDate(stressLogs).map((s, i) => (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{new Date(s.created_at).toLocaleString()}</td>
                                <td>{s.stress_score}</td>
                                <td>{s.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p>No stress logs found for selected filters.</p>
                      ))}
                  </section>
                )}

                {/* Doctor Notes */}
                <section className="report-section">
                  <h3
                    onClick={() => toggleSection("doctorNotes")}
                    style={{ cursor: "pointer" }}
                  >
                    🩺 Doctor’s Notes {collapsedSections.doctorNotes ? "🔽" : "🔼"}
                  </h3>
                  {!collapsedSections.doctorNotes &&
                    (doctorNotes.length > 0 ? (
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
                    ))}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
