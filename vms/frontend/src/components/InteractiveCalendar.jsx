import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';
import api from '../api/axios';

function InteractiveCalendar({ visitorId, onSlotDoubleClick, onEventDoubleClick, refreshTrigger }) {
    const [viewDate, setViewDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);

    const startOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/visitors/appointments?visitor_id=${visitorId}`);
            setAppointments(res.data);
        } catch (err) {
            console.error("Failed to fetch appointments for calendar");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [visitorId, refreshTrigger]);

    const weekStart = startOfWeek(viewDate);
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    // Each slot = 30 minutes, from 8:00 to 20:00
    const SLOT_MINUTES = 30;
    const START_HOUR = 8;
    const END_HOUR = 20;
    const SLOT_HEIGHT = 40; // px per 30-min slot (matches CSS .grid-cell height)

    const timeSlots = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
        timeSlots.push(`${h}:00`);
        timeSlots.push(`${h}:30`);
    }

    // Get appointments that START on a given day
    const getApptsForDay = (day) => {
        return appointments.filter(appt => {
            const d = new Date(appt.scheduled_time);
            return (
                d.getFullYear() === day.getFullYear() &&
                d.getMonth() === day.getMonth() &&
                d.getDate() === day.getDate()
            );
        });
    };

    // Calculate pixel offset & height for an appointment relative to grid top
    const getApptStyle = (appt) => {
        const d = new Date(appt.scheduled_time);
        const minutesFromStart = (d.getHours() - START_HOUR) * 60 + d.getMinutes();
        const top = (minutesFromStart / SLOT_MINUTES) * SLOT_HEIGHT;
        const height = Math.max(((appt.duration_minutes || 30) / SLOT_MINUTES) * SLOT_HEIGHT - 2, 18);
        return { top: `${top}px`, height: `${height}px` };
    };

    const handleDoubleClick = (day, time) => {
        const [h, m] = time.split(':').map(Number);
        const selected = new Date(day);
        selected.setHours(h, m, 0, 0);
        onSlotDoubleClick(selected);
    };

    return (
        <div className="outlook-calendar card">
            <div className="calendar-controls">
                <div className="view-info">
                    <h3>{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <p className="hint">Double-click any slot to book / block time</p>
                </div>
                <div className="nav-buttons">
                    <button className="icon-btn" onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 7)))}>
                        <ChevronLeft size={20} />
                    </button>
                    <button className="secondary-btn sm" onClick={() => setViewDate(new Date())}>Today</button>
                    <button className="icon-btn" onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 7)))}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="calendar-grid-container">
                <div className="calendar-grid">
                    <div className="time-column">
                        <div className="header-cell"></div>
                        {timeSlots.map(t => (
                            <div key={t} className="time-label">
                                {t.endsWith(':00') ? t : ''}
                            </div>
                        ))}
                    </div>

                    {days.map(day => {
                        const dayAppts = getApptsForDay(day);
                        return (
                            <div key={day.toISOString()} className="day-column">
                                <div className={`header-cell ${day.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                    <span className="day-name">{day.toLocaleString('default', { weekday: 'short' })}</span>
                                    <span className="day-number">{day.getDate()}</span>
                                </div>
                                <div className="day-slots-wrapper">
                                    {/* Background grid cells for click targets */}
                                    {timeSlots.map(time => (
                                        <div
                                            key={time}
                                            className="grid-cell"
                                            onDoubleClick={() => handleDoubleClick(day, time)}
                                        />
                                    ))}

                                    {/* Absolutely positioned events at exact timeslots */}
                                    {dayAppts.map(appt => {
                                        const style = getApptStyle(appt);
                                        if (appt.color) {
                                            style.borderLeftColor = appt.color;
                                        }
                                        return (
                                            <div
                                                key={appt.id}
                                                className={`calendar-event positioned ${appt.status}`}
                                                style={style}
                                                title={`${appt.visitor_name || 'Blocked'} — ${appt.purpose} (${appt.duration_minutes}m) [${appt.status}]`}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEventDoubleClick) onEventDoubleClick(appt);
                                                }}
                                            >
                                                <div className="event-info">
                                                    <strong>{appt.status === 'blocked' ? '🚫 Blocked' : appt.visitor_name}</strong>
                                                    <span>{appt.purpose}</span>
                                                    <span className="event-time">
                                                        {new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {' · '}{appt.duration_minutes}m
                                                        {appt.status === 'pending' && ' · ⏳'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default InteractiveCalendar;
