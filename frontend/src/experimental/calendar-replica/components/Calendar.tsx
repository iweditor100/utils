import React from "react";

const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const Calendar: React.FC = () => {
  return (
    <div className="calendar">
      <div className="calendar-header">
        <h3>October 2023</h3>
        <div className="view-tabs">
          <button className="active">Month</button>
          <button>Week</button>
          <button>Day</button>
          <button>List</button>
        </div>
      </div>

      <div className="calendar-grid">
        {days.map((day) => (
          <div key={day} className="day-name">
            {day}
          </div>
        ))}

        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="day-cell">
            <span className="date-number">{i + 1 <= 31 ? i + 1 : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;