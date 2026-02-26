import React from "react";

interface StatsCardProps {
  title: string;
  value: string;
  badge: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, badge }) => {
  return (
    <div className="stats-card">
      <p className="stats-title">{title}</p>
      <h2>{value}</h2>
      <span className="badge">{badge}</span>
    </div>
  );
};

export default StatsCard;