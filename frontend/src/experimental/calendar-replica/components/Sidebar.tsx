import React from "react";

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <div className="search-box">
        <input type="text" placeholder="Search events..." />
      </div>

      <div className="mini-calendar">
        <h4>October 2023</h4>
        <div className="mini-grid">
          {Array.from({ length: 31 }).map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
      </div>

      <div className="filters">
        <h4>Filters</h4>
        <label><input type="checkbox" /> Photo Shoots</label>
        <label><input type="checkbox" /> Editing & Processing</label>
        <label><input type="checkbox" /> Staging Deliveries</label>
      </div>

      <div className="upcoming">
        <h4>Upcoming Events</h4>
        <div className="event-item">
          <strong>Team Sync Meeting</strong>
          <p>10:00 AM - Conference Room A</p>
        </div>
        <div className="event-item">
          <strong>Shoot: 1400 Broadway</strong>
          <p>2:00 PM - Midtown</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;