import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles/Header.css";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      setIsLoggingOut(true);
      setShowDropdown(false);
      try {
        await logout();
        // Redirect to login page after successful logout
        navigate("/login", { replace: true });
      } catch (err) {
        console.error("Logout error:", err);
        alert("Logout failed. Please try again.");
        setIsLoggingOut(false);
        setShowDropdown(false);
      }
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-logo">
          <h1>PersFin</h1>
        </div>
        <div className="header-user">
          <div className="user-dropdown">
            <button
              className="user-menu-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              title={user?.email}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>{user?.email}</span>
            </button>
            
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item email">{user?.email}</div>
                <hr />
                <button
                  className="dropdown-item logout-btn"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
