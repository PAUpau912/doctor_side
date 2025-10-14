import React, { useState, useEffect } from "react";
import "../css/settings.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import supabase from "../supabaseClient";

const Settings: React.FC = () => {
  const [doctorName, setDoctorName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      const storedUserId = localStorage.getItem("user_id");
      if (!storedUserId) return;

      // 🟢 Step 1: Fetch from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("id", storedUserId)
        .single();

      if (userError || !userData) {
        console.error("Error fetching user:", userError);
        return;
      }

      const userId = userData.id;
      setEmail(userData.email || "");

      // 🟢 Step 2: Fetch doctor data from doctors table
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("name, specialization, gender, address, phone_number")
        .eq("user_id", userId)
        .single();

      if (doctorError) {
        console.error("Error fetching doctor:", doctorError);
      } else if (doctorData) {
        setDoctorName(doctorData.name || userData.full_name || "");
        setSpecialization(doctorData.specialization || "");
        setGender(doctorData.gender || "");
        setAddress(doctorData.address || "");
        setPhoneNumber(doctorData.phone_number || "");
      }
    };

    fetchDoctorProfile();
  }, []);

  const handleSaveChanges = async () => {
    if (!doctorName || !specialization || !phoneNumber || !gender || !address) {
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
      const userId = storedUserId;

      // 🟢 Step 1: Update or insert doctor info
      const { data: existingDoctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingDoctor) {
        // 🔄 Update existing doctor
        await supabase
          .from("doctors")
          .update({
            name: doctorName,
            specialization,
            gender,
            address,
            phone_number: phoneNumber,
          })
          .eq("user_id", userId);
      } else {
        // 🆕 Insert if none exists
        await supabase.from("doctors").insert([
          {
            user_id: userId,
            name: doctorName,
            specialization,
            gender,
            address,
            phone_number: phoneNumber,
          },
        ]);
      }

      // 🟢 Step 2: Update users table (password + name sync)
      const userUpdateData: any = { full_name: doctorName };
      if (password) userUpdateData.password = password;

      await supabase.from("users").update(userUpdateData).eq("id", userId);

      alert("✅ Doctor profile updated successfully!");
    } catch (err) {
      console.error("Error updating doctor profile:", err);
      alert("Failed to update profile.");
    }
  };

  return (
    <div className="layout-container">
      <div className="main-content">
        <div className="page-content">
          <h2>Doctor Account Settings</h2>

          <div className="settings-item">
            <label>Full Name</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="settings-item">
            <label>Email (read-only)</label>
            <input
              type="email"
              value={email}
              disabled
              placeholder="Your registered email"
            />
          </div>

          <div className="settings-item">
            <label>Specialization</label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Enter your specialization"
            />
          </div>

          <div className="settings-item">
            <label>Phone Number</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="settings-item">
            <label>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your address"
            />
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

          {/* Password Section */}
          <div className="settings-item">
            <label>New Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className="settings-item">
            <label>Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <span
                className="password-toggle-icon"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button className="save-settings-btn" onClick={handleSaveChanges}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
