import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function DateTimePicker({ value, onChange, onSelect }) {
    const [calMonth, setCalMonth] = useState(value.getMonth());
    const [calYear, setCalYear] = useState(value.getFullYear());

    const hours = value.getHours();
    const minutes = value.getMinutes();

    const pad = (n) => String(n).padStart(2, '0');

    const setTime = (h, m) => {
        const d = new Date(value);
        d.setHours(h, m, 0, 0);
        onChange(d);
    };

    const setDate = (day) => {
        const d = new Date(calYear, calMonth, day, hours, minutes, 0, 0);
        onChange(d);
    };

    const incHour = () => setTime((hours + 1) % 24, minutes);
    const decHour = () => setTime((hours - 1 + 24) % 24, minutes);
    const incMin = () => setTime(hours, (minutes + 1) % 60);
    const decMin = () => setTime(hours, (minutes - 1 + 60) % 60);

    const prevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
        else setCalMonth(calMonth - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
        else setCalMonth(calMonth + 1);
    };

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const isSelected = (day) => {
        return value.getFullYear() === calYear &&
            value.getMonth() === calMonth &&
            value.getDate() === day;
    };

    const formattedTop = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(hours)}:${pad(minutes)}`;

    return (
        <div className="outlook-dt-picker">
            <div className="picker-header">
                <h3>Select Date and Time</h3>
            </div>

            <div className="picker-container">
                {/* Left Side: Time */}
                <div className="time-section">
                    <div className="current-dt-string">{formattedTop}</div>

                    <div className="time-control-group">
                        <div className="spin-box">
                            <button type="button" onClick={incHour} className="spin-btn"><ChevronUp size={24} /></button>
                            <span className="digit-display">{pad(hours)}</span>
                            <button type="button" onClick={decHour} className="spin-btn"><ChevronDown size={24} /></button>
                        </div>
                        <span className="time-separator">:</span>
                        <div className="spin-box">
                            <button type="button" onClick={incMin} className="spin-btn"><ChevronUp size={24} /></button>
                            <span className="digit-display">{pad(minutes)}</span>
                            <button type="button" onClick={decMin} className="spin-btn"><ChevronDown size={24} /></button>
                        </div>
                    </div>

                    <button type="button" className="select-btn" onClick={onSelect}>
                        Select
                    </button>
                </div>

                <div className="vertical-divider"></div>

                {/* Right Side: Calendar */}
                <div className="calendar-section">
                    <div className="calendar-nav">
                        <button type="button" onClick={prevMonth} className="nav-arrow"><ChevronLeft size={20} /></button>
                        <span className="month-year-label">{MONTHS[calMonth]} {calYear}</span>
                        <button type="button" onClick={nextMonth} className="nav-arrow"><ChevronRight size={20} /></button>
                    </div>

                    <div className="calendar-grid">
                        {DAYS.map(d => (
                            <div key={d} className="weekday-header">{d}</div>
                        ))}
                        {Array.from({ length: firstDay }, (_, i) => (
                            <div key={`empty-${i}`} className="day-cell empty" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    className={`day-cell ${isSelected(day) ? 'selected' : ''}`}
                                    onClick={() => setDate(day)}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DateTimePicker;
