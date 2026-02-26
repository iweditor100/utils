import React from "react";
import "./CalendarReplica.css"

import Navbar from "./components/Navbar";
import StatsCard from "./components/StatCard";
import Calendar from "./components/Calendar";
import Sidebar from "./components/Sidebar";

const CalendarReplica: React.FC = () => {
  return (
    <div className="calendar-replica-root">
      <Navbar />

      <div className="container">
        <div className="header">
          <div>
            <p className="breadcrumb">Dashboard / Calendar</p>
            <h1>Schedule & Bookings</h1>
            <p className="subtext">
              Manage your photo shoots, virtual staging deadlines, and team availability.
            </p>
          </div>

          <div className="header-buttons">
            <button className="filter-btn">Filter</button>
            <button className="new-btn">+ New Event</button>
          </div>
        </div>

        <div className="stats">
          <StatsCard title="Upcoming Shoots" value="8" badge="+2 this week" />
          <StatsCard title="Pending Edits" value="12" badge="3 due today" />
          <StatsCard title="Staging Deliveries" value="4" badge="On track" />
          <StatsCard title="Total Revenue" value="$12.4k" badge="+15%" />
        </div>

        <div className="content">
          <Calendar />
          <Sidebar />
        </div>
      </div>
    </div>
  );
};

export default CalendarReplica;