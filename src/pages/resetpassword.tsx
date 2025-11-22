import React, { useState } from "react";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert("❌ Failed to reset password. Try again.");
      console.error(error);
    } else {
      alert("✅ Password has been reset successfully!");
      navigate("/");
    }
  };

  return (
    <div className="StartPage">
      <div className="Right">
        <div className="LoginContainer w-100" style={{ maxWidth: 400 }}>
          <h3 className="text-center">Reset Your Password</h3>
          <form onSubmit={handleReset}>
            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-lock IconOutside"></i>
              <input
                type="password"
                placeholder="Enter new password"
                className="InputField form-control ps-5"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="LoginButton btn w-100">
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
