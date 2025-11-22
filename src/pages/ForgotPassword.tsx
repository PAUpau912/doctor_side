import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import logo from "../assets/images.png";
import "../css/startup.css";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // step 1: verify email, step 2: reset password
  const navigate = useNavigate();

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) {
      alert("No account found with that email.");
      return;
    }

    localStorage.setItem("reset_user_id", data.id);
    setStep(2);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const userId = localStorage.getItem("reset_user_id");
    if (!userId) {
      alert("Error: user not found. Please try again.");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", userId);

    if (error) {
      console.error("Error updating password:", error);
      alert("Failed to reset password.");
      return;
    }

    localStorage.removeItem("reset_user_id");
    alert("✅ Password has been reset successfully!");
    navigate("/");
  };

  return (
    <div className="StartPage">
      <div className="Right">
        <div className="LoginContainer w-100" style={{ maxWidth: 400 }}>
          <img src={logo} alt="Logo" className="Logo mb-3 d-block mx-auto" />

          {step === 1 && (
            <>
              <h3 className="text-center">Forgot Password</h3>
              <form onSubmit={handleCheckEmail}>
                <div className="InputRow mb-3 position-relative">
                  <i className="fas fa-envelope IconOutside"></i>
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    className="InputField form-control ps-5"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="LoginButton btn w-100">
                  Verify Email
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-center">Reset Password</h3>
              <form onSubmit={handleResetPassword}>
                <div className="InputRow mb-3 position-relative">
                  <i className="fas fa-lock IconOutside"></i>
                  <input
                    type="password"
                    placeholder="New password"
                    className="InputField form-control ps-5"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="InputRow mb-3 position-relative">
                  <i className="fas fa-lock IconOutside"></i>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    className="InputField form-control ps-5"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="LoginButton btn w-100">
                  Reset Password
                </button>
              </form>
            </>
          )}

          <div className="text-center mt-3">
            <Link to="/">← Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
