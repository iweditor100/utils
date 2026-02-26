import React from "react";

const Navbar: React.FC = () => {
  return (
    <div className="navbar">
      <div className="logo">ProVision Imagery</div>

      <div className="nav-links">
        <span>Dashboard</span>
        <span>Orders</span>
        <span className="active">Calendar</span>
        <span>Team</span>
      </div>

      <div className="avatar"></div>
    </div>
  );
};

export default Navbar;