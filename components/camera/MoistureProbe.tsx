"use client";

/* Moisture probe component (Blueprint F-09)
   5-level slider for soil moisture reading */

import { useState } from "react";

interface MoistureProbeProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const LEVELS = [
  { value: 1, label: "Very dry", color: "#B85C00" },
  { value: 2, label: "Dry", color: "#D97700" },
  { value: 3, label: "Moderate", color: "#4A9B5F" },
  { value: 4, label: "Moist", color: "#2E7D8C" },
  { value: 5, label: "Very moist", color: "#1D5B7A" },
];

export function MoistureProbe({ value, onChange, disabled }: MoistureProbeProps) {
  const currentLevel = LEVELS.find((l) => l.value === value) || LEVELS[2];

  return (
    <div className="moisture-probe">
      <div className="probe-header">
        <label>Soil Moisture</label>
        <span className="probe-value" style={{ color: currentLevel.color }}>
          {currentLevel.label}
        </span>
      </div>

      <div className="probe-slider">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          style={{
            background: `linear-gradient(to right, ${LEVELS[0].color}, ${LEVELS[4].color})`,
          }}
        />
        
        <div className="probe-markers">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              disabled={disabled}
              className={value === level.value ? "active" : ""}
              style={{
                borderColor: level.color,
                backgroundColor: value === level.value ? level.color : "transparent",
              }}
            >
              {level.value}
            </button>
          ))}
        </div>
      </div>

      <div className="probe-labels">
        <span>Very dry</span>
        <span>Very moist</span>
      </div>
    </div>
  );
}
