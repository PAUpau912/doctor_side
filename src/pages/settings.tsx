import React, { useState, useEffect } from "react";
import "../css/settings.css";
import { FaEye, FaEyeSlash, FaCamera } from "react-icons/fa";
import supabase from "../supabaseClient";
import anonymousProfilePic from "../assets/anonymous.jpg";

const Settings: React.FC = () => {
  // ===== TAB CONTROL =====
  const [activeTab, setActiveTab] = useState<"personal" | "report" | "email">("personal");

  // ===== PERSONAL SETTINGS STATES =====
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [doctorName, setDoctorName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");

  // ===== ADDRESS STATES =====
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Laguna");
  const [lagunaData, setLagunaData] = useState<Record<string, string[]>>({});

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileUrl, setProfileUrl] = useState<string>("");
  const [newProfileFile, setNewProfileFile] = useState<File | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ===== REPORT TO ADMIN STATES =====
  const [reportSubject, setReportSubject] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<{ id: string; email: string; full_name: string } | null>(null);


  useEffect(() => {
      const fetchAdmins = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("id, email, full_name, role")
          .eq("role", "admin");

        if (!error && data) {
          setAdminList(data);
        }
      };

      fetchAdmins();
    }, []);
  // Fetch Laguna barangays JSON
  useEffect(() => {
    fetch("/laguna-barangays.json")
      .then((res) => res.json())
      .then((data) => setLagunaData(data))
      .catch((err) => console.error("Error loading barangays:", err));
  }, []);

  // ===== FETCH DOCTOR INFO =====
 // ===== FETCH DOCTOR INFO =====
useEffect(() => {
  const fetchDoctorProfile = async () => {
    const storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) return;

    try {
      // 1️⃣ Fetch user info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("id", storedUserId)
        .single();

      if (userError) throw userError;
      setEmail(userData?.email || "");

      // 2️⃣ Fetch doctor info safely
      const { data: doctorDataArray, error: doctorError } = await supabase
        .from("doctors")
        .select(
          "first_name, middle_name, last_name, full_name, specialization, gender, address, phone_number, profile_picture_url"
        )
        .eq("user_id", storedUserId)
        .limit(1); // <-- take only first row

      if (doctorError) throw doctorError;

      const doctorData = doctorDataArray?.[0];
      if (doctorData) {
        setFirstName(doctorData.first_name || "");
        setMiddleName(doctorData.middle_name || "");
        setLastName(doctorData.last_name || "");
        setDoctorName(doctorData.full_name || (userData ? userData.full_name : ""));
        setSpecialization(doctorData.specialization || "");
        setGender(doctorData.gender || "");
        setPhoneNumber(doctorData.phone_number || "");
        setProfileUrl(doctorData.profile_picture_url || "");

        // Parse address safely
        if (doctorData.address) {
          const parts = doctorData.address.split(",").map((p) => p.trim());
          setStreet(parts[0] || "");
          setBarangay(parts[1] || "");
          setCity(parts[2] || "");
          setProvince(parts[3] || "Laguna");
        }
      }
    } catch (err) {
      console.error("❌ Error fetching doctor profile:", err);
    }
  };

  fetchDoctorProfile();
}, []);


  // ===== UPLOAD PROFILE PICTURE =====
  const handleUploadProfile = async (): Promise<string> => {
    if (!newProfileFile) return profileUrl;

    const storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) return profileUrl;

    const fileExt = newProfileFile.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png"].includes(fileExt || "")) {
      alert("Only JPG, JPEG, and PNG formats are allowed.");
      return profileUrl;
    }

    const filePath = `avatars/${storedUserId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile_pictures")
      .upload(filePath, newProfileFile, { upsert: true });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      alert("Failed to upload profile picture.");
      return profileUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profile_pictures")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    await supabase
      .from("doctors")
      .update({ profile_picture_url: publicUrl })
      .eq("user_id", storedUserId);

    return publicUrl;
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewProfileFile(file);
      setProfileUrl(URL.createObjectURL(file));
    }
  };

  // ===== SAVE PERSONAL SETTINGS =====
  const handleSaveChanges = async () => {
    if (!firstName || !lastName || !doctorName || !specialization || !phoneNumber || !gender || !street || !barangay || !city) {
      alert("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) {
      alert("No logged-in doctor found!");
      return;
    }

    try {
      const uploadedProfileUrl = await handleUploadProfile();

      const fullAddress = [street, barangay, city, province].filter(Boolean).join(", ");

      await supabase.from("doctors").upsert({
        user_id: storedUserId,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        full_name: doctorName,
        specialization,
        gender,
        address: fullAddress,
        phone_number: phoneNumber,
        profile_picture_url: uploadedProfileUrl || profileUrl,
      });

      const userUpdateData: any = { full_name: doctorName };
      if (password) userUpdateData.password = password;

      await supabase.from("users").update(userUpdateData).eq("id", storedUserId);

      alert("✅ Doctor profile updated successfully!");
    } catch (err) {
      console.error("❌ Error updating doctor profile:", err);
      alert("Failed to update profile.");
    }
  };

const handleSubmitReport = async () => {
  const storedUserId = localStorage.getItem("user_id");

  if (!reportSubject || !reportMessage) {
    alert("Please fill in both subject and message.");
    return;
  }

  try {
    // 1️⃣ Insert into reports table
    const { error: reportError } = await supabase
      .from("reports")
      .insert([
        {
          user_id: storedUserId,
          title: reportSubject,
          report_data: reportMessage,
        },
      ]);

    if (reportError) throw reportError;

    // 2️⃣ Fetch the doctor's id safely
    const { data: doctorData, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", storedUserId)
      .limit(1); // take only the first row

    if (doctorError || !doctorData || doctorData.length === 0) {
      throw new Error("Doctor profile not found.");
    }

    const doctorId = doctorData[0].id; // ✅ take first element

    // 3️⃣ Insert into notifications_report table
    const { error: notifError } = await supabase
      .from("notifications_report")
      .insert([
        {
          doctor_id: doctorId,
          message: `New report submitted by Dr. ${doctorName}: ${reportSubject}`,
        },
      ]);

    if (notifError) throw notifError;

    alert("✅ Report submitted successfully!");
    setReportSubject("");
    setReportMessage("");
  } catch (err) {
    console.error("❌ Error submitting report:", err);
    alert("Failed to send report.");
  }
};
const handleSendEmail = async () => {
  const storedUserId = localStorage.getItem("user_id");

  if (!selectedAdmin || !emailSubject || !emailMessage) {
    alert("Please select an admin and fill in subject and message.");
    return;
  }

  try {
    const { error } = await supabase.from("emails_to_admin").insert([
      {
        sender_user_id: storedUserId,
        recipient_email: selectedAdmin.email, // required NOT NULL
        subject: emailSubject,
        message: emailMessage,
        is_read: false,
      },
    ]);

    if (error) throw error;

    alert("📧 Email sent to admin!");
    setEmailSubject("");
    setEmailMessage("");
    setSelectedAdmin(null);
  } catch (err) {
    console.error("❌ Error sending email:", err);
    alert("Failed to send email.");
  }
};
  return (
    <div className="layout-container">
      <div className="main-content">
        <div className="page-content">

          {/* ===== TABS ===== */}
          <div className="settings-tabs">
            <button
              className={activeTab === "personal" ? "active-tab" : ""}
              onClick={() => setActiveTab("personal")}
            >
              Personal Settings
            </button>
            <button
              className={activeTab === "report" ? "active-tab" : ""}
              onClick={() => setActiveTab("report")}
            >
              Report to Admin
            </button>
              <button
                className={activeTab === "email" ? "active-tab" : ""}
                onClick={() => setActiveTab("email")}
              >
                Email to Admin
              </button>
          </div>
          {/* PERSONAL SETTINGS */}
          {activeTab === "personal" && (
            <div className="tab-content">

              {/* PROFILE PIC */}
              <div className="profile-section">
                <div className="profile-pic-wrapper">
                  <div className="profile-pic-container">
                    <img
                      src={profileUrl || anonymousProfilePic}
                      alt="Profile"
                      className="profile-pic"
                    />
                    <label htmlFor="uploadProfile" className="upload-overlay">
                      <FaCamera className="camera-icon" />
                    </label>
                    <input
                      id="uploadProfile"
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      style={{ display: "none" }}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <p className="profile-text">Upload Profile Photo</p>
                </div>
              </div>

              {/* NAME FIELDS */}
              <div className="name-row">
                <div className="settings-item">
                  <label>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="settings-item">
                  <label>Middle Name (optional)</label>
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </div>
                <div className="settings-item">
                  <label>Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="settings-item">
                <label>Email (read-only)</label>
                <input type="email" value={email} disabled />
              </div>

              <div className="settings-item">
                <label>Specialization</label>
                <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                  <option value="">Select specialization</option>
                  <option value="General Endocrinologist">General Endocrinologist</option>
                  <option value="Pediatric Endocrinologist">Pediatric Endocrinologist</option>
                  <option value="Endocrinologist">Endocrinologist</option>
                </select>
              </div>

              <div className="settings-item">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d{0,11}$/.test(value)) setPhoneNumber(value);
                  }}
                  onBlur={() => {
                    if (phoneNumber && !/^09\d{9}$/.test(phoneNumber)) {
                      alert("Phone number must start with '09' and be 11 digits.");
                    }
                  }}
                  placeholder="e.g. 09123456789"
                />
              </div>

              {/* ===== ADDRESS FIELDS ===== */}
              <div className="settings-item address-fields">
                <label>Street / House No.</label>
                <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} />

                <label>City / Municipality</label>
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setBarangay(""); // reset barangay
                  }}
                >
                  <option value="">Select City</option>
                  {Object.keys(lagunaData).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label>Barangay</label>
                <select value={barangay} onChange={(e) => setBarangay(e.target.value)} disabled={!city}>
                  <option value="">Select Barangay</option>
                  {city && lagunaData[city]?.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <label>Province</label>
                <input type="text" value={province} disabled />
              </div>

              <div className="settings-item">
                <label>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* PASSWORD */}
              <div className="settings-item">
                <label>New Password</label>
                <div className="password-wrapper">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <span className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <div className="settings-item">
                <label>Confirm Password</label>
                <div className="password-wrapper">
                  <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <span className="password-toggle-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <button className="save-settings-btn" onClick={handleSaveChanges}>
                Save Changes
              </button>
            </div>
          )}

          {/* REPORT TAB */}
          {activeTab === "report" && (
            <div className="tab-content">
              <h2>Report to Admin</h2>

              <div className="settings-item">
                <label>Subject</label>
                <select value={reportSubject} onChange={(e) => setReportSubject(e.target.value)} className="title-dropdown">
                  <option value="">Select Report Title</option>
                  <option value="System Login Issue">System Login Issue</option>
                  <option value="Account Registration Problem">Account Registration Problem</option>
                  <option value="Data Sync Error">Data Sync Error</option>
                  <option value="Patient Record Update">Patient Record Update</option>
                  <option value="Doctor Profile Update">Doctor Profile Update</option>
                  <option value="Report Generation Issue">Report Generation Issue</option>
                  <option value="Access Rights Concern">Access Rights Concern</option>
                  <option value="System Performance Feedback">System Performance Feedback</option>
                  <option value="Other System Concern">Other System Concern</option>
                </select>
              </div>

              <div className="settings-item">
                <label>Message</label>
                <textarea value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} rows={6} placeholder="Describe your concern..."></textarea>
              </div>

              <button className="save-settings-btn" onClick={handleSubmitReport}>
                Submit Report
              </button>
            </div>
          )}
          {/* EMAIL TO ADMIN TAB */}
          {activeTab === "email" && (
            <div className="tab-content">
              <h2>Email to Admin</h2>

              <div className="settings-item">
                <label>Recipient</label>
                <select
                  value={selectedAdmin?.id || ""}
                  onChange={(e) => {
                    const admin = adminList.find((a) => a.id === e.target.value) || null;
                    setSelectedAdmin(admin);
                  }}
                >
                  <option value="">Select Admin</option>
                  {adminList.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name || admin.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-item">
                <label>Email Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              <div className="settings-item">
                <label>Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={6}
                  placeholder="Write your message to the admin..."
                ></textarea>
              </div>

              <button className="save-settings-btn" onClick={handleSendEmail}>
                Send Email
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
