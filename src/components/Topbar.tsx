import React, { useEffect, useState } from "react";
import "../css/Topbar.css";
import supabase from "../supabaseClient";
import AnonymousProfilePic from "../assets/anonymous.jpg";

interface DoctorProfile {
  id?: string;
  full_name: string;
  specialization: string;
  email?: string;
  user_id?: string;
  profile_picture_url?: string;
  gender?: string;
}

interface TopbarProps {
  activePage: string;
  onSearchChange?: (query: string) => void; // ✅ NEW: search callback prop
}

const Topbar: React.FC<TopbarProps> = ({ activePage, onSearchChange }) => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ NEW: track search input
// 🔔 Notification states
const [notifications, setNotifications] = useState<any[]>([]);
const [unreadCount, setUnreadCount] = useState(0);
const [showNotifications, setShowNotifications] = useState(false);

// Format notification date
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

// 🔔 Load notifications on mount
useEffect(() => {
  if (!doctorProfile?.id) return; // WAIT for doctor_id

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("doctor_id", doctorProfile.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => n.is_read === false).length);
    }
  };

  loadNotifications();

  // 🔔 Real-time subscription
  const channel = supabase
    .channel("realtime-notifs")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      (payload) => {
        if (payload.new.doctor_id === doctorProfile.id) {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [doctorProfile]);

  // 📌 Mark ONE notification as read
  const markSingleAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

//FETCH DOCTOR PROFILE
//FETCH DOCTOR PROFILE
useEffect(() => {
  const fetchDoctorProfile = async () => {
    try {
      const storedUserId = localStorage.getItem("user_id");
      if (!storedUserId) {
        console.warn("⚠️ No user_id found in localStorage.");
        return;
      }

      // Fetch doctor info + user email
      const { data, error } = await supabase
        .from("doctors")
        .select(`
          id,
          full_name,
          specialization,
          gender,
          address,
          phone_number,
          profile_picture_url,
          user_id,
          users (email)
        `)
        .eq("user_id", storedUserId)
        .limit(1); // ✅ take only the first row

      if (error) {
        console.error("❌ Error fetching doctor profile:", error);
        return;
      }

      const doctorData = data?.[0]; // ✅ first element

      if (!doctorData) return;

      const profilePicture =
        doctorData.profile_picture_url && doctorData.profile_picture_url.startsWith("http")
          ? doctorData.profile_picture_url
          : "/default-avatars.png";

      setDoctorProfile({
        id: doctorData.id,
        full_name: doctorData.full_name,
        specialization: doctorData.specialization,
        profile_picture_url: profilePicture,
        email: doctorData.users?.email,
        user_id: doctorData.user_id,
      });
    } catch (err) {
      console.error("❌ Error loading doctor profile:", err);
    }
  };

  fetchDoctorProfile();
}, []);


  // ✅ Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) onSearchChange(value); // send to parent
  };

  const displayName = doctorProfile?.full_name || "Doctor";
  const specialization = doctorProfile?.specialization || "Specialization";
  const profileUrl = doctorProfile?.profile_picture_url || AnonymousProfilePic;

 return (
  <div className="topbar-content">
    {/* ================= DASHBOARD ================= */}
    {activePage === "dashboard" && (
      <div className="topbar-center dashboard">
        <h3>
          Welcome Doctor, <span className="doctor-name">{displayName}</span>{" "}
          <span style={{ fontSize: "14px", color: "gray" }}>
            ({specialization})
          </span>
        </h3>

        <div className="topbar-right">
          {/* 🔔 NOTIFICATION BUTTON */}
          <div className="notification-wrapper">
            <button
              className="notification-btn"
              onClick={() => {
                setShowNotifications(!showNotifications);
              }}
            >
              <i className="fas fa-bell"></i>

              {/* 🔴 RED DOT IF THERE ARE UNREAD NOTIFS */}
              {unreadCount > 0 && <span className="notif-dot"></span>}
            </button>

            {showNotifications && (
              <div className="notif-dropdown">
                <h4>Notifications</h4>

                {notifications.length === 0 && (
                  <p className="empty">No new notifications</p>
                )}

                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-item ${notif.is_read ? "" : "unread"}`}
                    onClick={() => markSingleAsRead(notif.id)}
                  >
                    <p>{notif.message}</p>
                    <span className="notif-time">{formatDate(notif.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* PROFILE PICTURE */}
          <div className="profile">
            <img
              src={profileUrl || AnonymousProfilePic}
              alt="Profile"
              className="topbar-profile"
              onError={(e) => {
                e.currentTarget.src = AnonymousProfilePic;
              }}
            />
          </div>
        </div>
      </div>
    )}

    {/* PATIENTS PAGE */}
    {activePage === "patients" && (
      <div className="topbar-center patients">
        <h3>Patients List</h3>
        <div className="search-bar">
          <span className="search-icon">
            <i className="fas fa-search"></i>
          </span>
          <input
            type="text"
            placeholder="Search patients..."
            className="search-input"
            onChange={(e) =>
              onSearchChange && onSearchChange(e.target.value)
            }
          />
        </div>
      </div>
    )}

    {/* REPORTS */}
    {activePage === "reports" && (
      <div className="topbar-center">
        <h3>Reports Overview</h3>
      </div>
    )}

    {/* SETTINGS */}
    {activePage === "settings" && (
      <div className="topbar-center">
        <h3>Settings</h3>
      </div>
    )}
  </div>
);
};
export default Topbar;
