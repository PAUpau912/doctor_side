import { useState } from "react";
import "../css/startup.css";
import logo from "../assets/images.png";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

const StartPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // ✅ Check email in users table
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error || !data) {
        alert("Invalid email address.");
        return;
      }

      if (data.password !== password) {
        alert("Incorrect password.");
        return;
      }

      // 🚫 Restrict login only for DOCTOR accounts
      if (data.role !== "doctor") {
        alert("Access denied. Only doctors are allowed to log in.");
        return;
      }

      // ✅ Save session info
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user_id", data.id);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("doctorEmail", data.email); // 🟢 ADD THIS LINE

      // 🔎 Fetch doctor details if role = doctor
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", data.id)
        .maybeSingle();

      if (doctorData) {
        localStorage.setItem("doctor_id", doctorData.id);
      }

      alert(`Welcome back, Dr. ${data.full_name || data.username || "User"}!`);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error:", err.message);
      alert("Server error. Please try again.");
    }
  };

  const isMobile = window.matchMedia("(max-width: 767.98px)").matches;

  return (
    <div
      className="StartPage"
      style={{ transition: "all 0.5s cubic-bezier(.4,2.3,.3,1)" }}
    >
      {!isMobile && (
        <div className="Left">
          <img src={logo} alt="Logo" className="Logo mb-3" />
          <h2 className="text-center">Welcome to SPC Medical Diabetic App!</h2>
        </div>
      )}

      <div className="Right">
        <div className="LoginContainer w-100" style={{ maxWidth: 400 }}>
          {isMobile && (
            <img src={logo} alt="Logo" className="Logo mb-3 d-block mx-auto" />
          )}
          <h3 className="text-center">Doctor Login</h3>

          <form className="LoginForm" onSubmit={handleLogin}>
            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-envelope IconOutside"></i>
              <input
                type="email"
                placeholder="Email Address"
                className="InputField form-control ps-5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-lock IconOutside"></i>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="InputField form-control ps-5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <i
                className={`fas ${
                  showPassword ? "fa-eye-slash" : "fa-eye"
                } TogglePasswordIcon`}
                onClick={togglePasswordVisibility}
                style={{
                  cursor: "pointer",
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              ></i>
            </div>

            <div className="ForgotPassword text-end mb-3">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            <button type="submit" className="LoginButton btn w-100">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StartPage;
