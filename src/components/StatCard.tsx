import React from 'react';
import '../css/StatCard.css';

interface StatCardProps {
  title: string;
  count: number;
  icon: string;
  isButton?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, icon, isButton }) => {
  return (
    <div className="stat-card">
      <div className="card-icon"><i className={icon}></i></div>
      <div className="card-content">
        <h4>{title}</h4>
        {isButton ? (
          <button className="view-btn">View</button>
        ) : (
          <p>{count}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
