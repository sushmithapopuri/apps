import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import DateTimePicker from './DateTimePicker';
import { User, Calendar, Clock, X, Search, UserPlus, Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';

function AppointmentModal({ onClose, onSuccess, preSelectedVisitor = null, initialTime = null, initialBlocked = false, editAppointment = null }) {
    const { user } = useAuth();
    const isStaff = user?.role === 'employee' || user?.role === 'admin' || user?.role === 'security';
    const isHostSelectionAllowed = isStaff;
    const webcamRef = useRef(null);
    const isEditMode = !!editAppointment;

    // Form States
    const [hostName, setHostName] = useState(
        editAppointment?.host_name || ((user?.role === 'employee' && user?.full_name) ? user.full_name : '')
    );
    const [purpose, setPurpose] = useState(editAppointment?.purpose || '');
    const [scheduledTime, setScheduledTime] = useState(
        editAppointment ? new Date(editAppointment.scheduled_time) : (initialTime || new Date(Date.now() + 5 * 60 * 1000))
    );
    const [durationMinutes, setDurationMinutes] = useState(editAppointment?.duration_minutes || 60);
    const [isBlockedSlot, setIsBlockedSlot] = useState(editAppointment?.status === 'blocked' || initialBlocked);
    const [appointmentColor, setAppointmentColor] = useState(editAppointment?.color || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Host Schedule
    const [hostAppointments, setHostAppointments] = useState([]);
    const [fetchingSchedule, setFetchingSchedule] = useState(false);

    // Employee-specific: Visitor selection
    const [visitorMode, setVisitorMode] = useState('existing');
    const [visitorSearch, setVisitorSearch] = useState(
        preSelectedVisitor ? preSelectedVisitor.full_name : (editAppointment?.visitor_name || '')
    );
    const [selectedVisitor, setSelectedVisitor] = useState(preSelectedVisitor);
    const [visitors, setVisitors] = useState([]);
    const [filteredVisitors, setFilteredVisitors] = useState([]);
    const [showVisitorSuggestions, setShowVisitorSuggestions] = useState(false);

    // New Visitor fields
    const [newVisitor, setNewVisitor] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        address: { street: '', city: '', state: '', pincode: '' },
        face_image: null
    });

    const captureVisitorFace = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setNewVisitor(prev => ({ ...prev, face_image: imageSrc }));
    }, [webcamRef]);

    // Host Suggestions (for Visitors)
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [showHostSuggestions, setShowHostSuggestions] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empRes, visRes] = await Promise.all([
                    api.get('/admin/users/employees'),
                    isStaff ? api.get('/employees/visitor-list') : Promise.resolve({ data: [] })
                ]);
                setEmployees(empRes.data);
                setVisitors(visRes.data);

                // In edit mode, pre-select visitor by ID
                if (editAppointment?.visitor_id && visRes.data.length) {
                    const found = visRes.data.find(v => v.id === editAppointment.visitor_id);
                    if (found) {
                        setSelectedVisitor(found);
                        setVisitorSearch(found.full_name);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        fetchData();
    }, [isStaff]);

    useEffect(() => {
        if (hostName) {
            const fetchHostSchedule = async () => {
                setFetchingSchedule(true);
                try {
                    const res = await api.get(`/visitors/host-schedule?host_name=${encodeURIComponent(hostName)}`);
                    setHostAppointments(res.data);
                } catch (err) {
                    console.error("Schedule fetch failed");
                } finally {
                    setFetchingSchedule(false);
                }
            };
            const timer = setTimeout(fetchHostSchedule, 500);
            return () => clearTimeout(timer);
        }
    }, [hostName]);

    const handleHostChange = (e) => {
        const value = e.target.value;
        setHostName(value);
        if (value.length > 0) {
            setFilteredEmployees(employees.filter(emp => emp.full_name.toLowerCase().includes(value.toLowerCase())));
            setShowHostSuggestions(true);
        } else setShowHostSuggestions(false);
    };

    const handleVisitorSearch = (e) => {
        const value = e.target.value;
        setVisitorSearch(value);
        if (value.length > 0) {
            setFilteredVisitors(visitors.filter(v =>
                v.full_name.toLowerCase().includes(value.toLowerCase()) ||
                v.phone_number.includes(value)
            ));
            setShowVisitorSuggestions(true);
        } else setShowVisitorSuggestions(false);
    };

    // Filter time to only allow future times
    const filterPassedTime = (time) => {
        const now = new Date();
        const selected = new Date(time);
        return selected.getTime() > now.getTime();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const now = new Date();
        if (scheduledTime < now) {
            setError('Appointments can only be booked for future dates and times');
            return;
        }

        setLoading(true);
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const isSoon = scheduledTime <= twoHoursFromNow;
        const appointmentType = isSoon ? 'walk_in' : 'pre_planned';

        const payload = {
            host_name: hostName,
            purpose: purpose,
            appointment_type: appointmentType,
            scheduled_time: scheduledTime.toISOString(),
            duration_minutes: parseInt(durationMinutes),
            color: appointmentColor || null
        };

        try {
            if (isEditMode) {
                // Update existing appointment
                await api.patch(`/employees/appointments/${editAppointment.id}/status?employee_id=${user.id || 1}`, {
                    status: editAppointment.status // keep same status
                });
                // Update duration if changed
                if (durationMinutes !== editAppointment.duration_minutes) {
                    await api.patch(`/employees/appointments/${editAppointment.id}/duration?employee_id=${user.id || 1}`, {
                        duration_minutes: parseInt(durationMinutes)
                    });
                }
            } else {
                let url;
                if (isBlockedSlot) {
                    url = `/employees/schedule/block?employee_id=${user.id || 1}`;
                } else if (isStaff) {
                    if (visitorMode === 'existing') {
                        if (!selectedVisitor) {
                            setError('Please select an existing visitor');
                            setLoading(false);
                            return;
                        }
                        payload.visitor_id = selectedVisitor.id;
                    } else {
                        if (!newVisitor.full_name || !newVisitor.phone_number || !newVisitor.address.pincode) {
                            setError('Please provide visitor name, phone, and address details');
                            setLoading(false);
                            return;
                        }
                        payload.visitor_info = newVisitor;
                    }
                    url = `/employees/book-for-visitor?employee_id=${user.id || 1}`;
                } else {
                    payload.visitor_id = user.id || 1;
                    url = `/visitors/appointments?visitor_id=${user.id || 1}`;
                }
                await api.post(url, payload);
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to schedule appointment');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!editAppointment) return;
        setLoading(true);
        setError('');
        try {
            await api.patch(`/employees/appointments/${editAppointment.id}/status?employee_id=${user.id || 1}`, {
                status: 'cancelled'
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to cancel appointment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card card appointment-modal wide-modal">
                <div className="modal-header">
                    <h3>
                        <Calendar size={20} />
                        {isEditMode
                            ? (isBlockedSlot ? 'Edit Blocked Slot' : 'Edit Appointment')
                            : (isBlockedSlot ? 'Block My Schedule' : 'Schedule Appointment')
                        }
                    </h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-content-grid">
                    <div className="form-container-scroll">
                        <form onSubmit={handleSubmit} className="appointment-form">
                            {isStaff && !isEditMode && (
                                <div className="form-group checkbox-group">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" checked={isBlockedSlot} onChange={(e) => setIsBlockedSlot(e.target.checked)} />
                                        <span>Personal Blocked Slot (Out of Office/Meeting)</span>
                                    </label>
                                </div>
                            )}

                            {!isBlockedSlot && (
                                <>
                                    {isHostSelectionAllowed && (
                                        <div className="form-group relative">
                                            <label><User size={16} /> Host Name (Employee)</label>
                                            <input
                                                type="text" value={hostName} onChange={handleHostChange}
                                                onFocus={() => hostName && setShowHostSuggestions(true)}
                                                placeholder="Type to search employees..." required autoComplete="off"
                                                disabled={isEditMode}
                                            />
                                            {showHostSuggestions && filteredEmployees.length > 0 && (
                                                <ul className="suggestions-list">
                                                    {filteredEmployees.map(emp => (
                                                        <li key={emp.id} onClick={() => { setHostName(emp.full_name); setShowHostSuggestions(false); }}>
                                                            {emp.full_name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {isStaff && !isEditMode && (
                                        <div className="visitor-mode-toggle">
                                            <button type="button" className={visitorMode === 'existing' ? 'active' : ''} onClick={() => setVisitorMode('existing')}>
                                                <Search size={14} /> Existing Visitor
                                            </button>
                                            <button type="button" className={visitorMode === 'new' ? 'active' : ''} onClick={() => setVisitorMode('new')}>
                                                <UserPlus size={14} /> New Visitor
                                            </button>
                                        </div>
                                    )}

                                    {isStaff && visitorMode === 'existing' && !isEditMode && (
                                        <div className="form-group relative">
                                            <label>Select Visitor</label>
                                            <input
                                                type="text" value={visitorSearch} onChange={handleVisitorSearch}
                                                placeholder="Search by name or phone..." autoComplete="off"
                                            />
                                            {showVisitorSuggestions && filteredVisitors.length > 0 && (
                                                <ul className="suggestions-list">
                                                    {filteredVisitors.map(v => (
                                                        <li key={v.id} onClick={() => { setSelectedVisitor(v); setVisitorSearch(v.full_name); setShowVisitorSuggestions(false); }}>
                                                            {v.full_name} ({v.phone_number})
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {isEditMode && editAppointment?.visitor_name && (
                                        <div className="form-group">
                                            <label>Visitor</label>
                                            <input type="text" value={editAppointment.visitor_name} disabled className="disabled-input" />
                                        </div>
                                    )}

                                    {isStaff && visitorMode === 'new' && !isEditMode && (
                                        <div className="new-visitor-full-form">
                                            <div className="grid-2">
                                                <div className="form-group">
                                                    <label>Full Name *</label>
                                                    <input type="text" value={newVisitor.full_name} onChange={(e) => setNewVisitor({ ...newVisitor, full_name: e.target.value })} required />
                                                </div>
                                                <div className="form-group">
                                                    <label>Phone *</label>
                                                    <input type="text" value={newVisitor.phone_number} onChange={(e) => setNewVisitor({ ...newVisitor, phone_number: e.target.value })} required />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Email Address</label>
                                                <input type="email" value={newVisitor.email} onChange={(e) => setNewVisitor({ ...newVisitor, email: e.target.value })} />
                                            </div>

                                            <div className="address-section">
                                                <h4>Address Details</h4>
                                                <div className="form-group">
                                                    <label>Street</label>
                                                    <input type="text" value={newVisitor.address.street} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, street: e.target.value } })} />
                                                </div>
                                                <div className="grid-3">
                                                    <div className="form-group">
                                                        <label>City</label>
                                                        <input type="text" value={newVisitor.address.city} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, city: e.target.value } })} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>State</label>
                                                        <input type="text" value={newVisitor.address.state} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, state: e.target.value } })} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Pincode *</label>
                                                        <input type="text" value={newVisitor.address.pincode} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, pincode: e.target.value } })} maxLength="6" required />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="face-capture-appointment">
                                                <label>Identity Photo</label>
                                                <div className="webcam-mini-container">
                                                    {newVisitor.face_image ? (
                                                        <div className="preview-captured-mini">
                                                            <img src={newVisitor.face_image} alt="Identity" />
                                                            <button type="button" onClick={() => setNewVisitor({ ...newVisitor, face_image: null })} className="retake-btn sm">Retake</button>
                                                        </div>
                                                    ) : (
                                                        <div className="webcam-box-mini">
                                                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="webcam-view-mini" />
                                                            <button type="button" onClick={captureVisitorFace} className="capture-btn-mini"><Camera size={14} /> Capture Identity</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Purpose</label>
                                        <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Project Discussion" required={!isBlockedSlot} />
                                    </div>
                                </>
                            )}

                            {isBlockedSlot && (
                                <div className="form-group">
                                    <label>Block Reason</label>
                                    <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Lunch, Personal, etc." required />
                                </div>
                            )}

                            <div className="form-group date-picker-group">
                                <DateTimePicker
                                    value={scheduledTime}
                                    onChange={(date) => setScheduledTime(date)}
                                    onSelect={() => { }} /* Optional: could auto-submit or close something */
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Duration (mins)</label>
                                    <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} min="15" step="15" />
                                </div>

                                {isStaff && (
                                    <div className="form-group">
                                        <label>Category</label>
                                        <div className="category-tags">
                                            {[
                                                { label: 'Important', color: '#ef4444' },
                                                { label: 'Business', color: '#3b82f6' },
                                                { label: 'Personal', color: '#8b5cf6' },
                                                { label: 'Travel', color: '#06b6d4' },
                                                { label: 'Interview', color: '#22c55e' },
                                                { label: 'Follow-up', color: '#f59e0b' },
                                                { label: 'VIP', color: '#ec4899' },
                                                { label: 'General', color: '#64748b' },
                                            ].map(cat => (
                                                <button
                                                    key={cat.label}
                                                    type="button"
                                                    className={`category-tag ${appointmentColor === cat.color ? 'active' : ''}`}
                                                    style={{ '--cat-color': cat.color }}
                                                    onClick={() => setAppointmentColor(appointmentColor === cat.color ? '' : cat.color)}
                                                >
                                                    <span className="cat-dot" style={{ background: cat.color }} />
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && <p className="error-text">{error}</p>}

                            <div className="btn-group">
                                {isEditMode && (
                                    <button type="button" className="danger-btn" onClick={handleCancel} disabled={loading}>
                                        <Trash2 size={16} /> Cancel Appointment
                                    </button>
                                )}
                                <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
                                {!isEditMode && (
                                    <button type="submit" className="primary-btn" disabled={loading}>
                                        {loading ? 'Processing...' : (isBlockedSlot ? 'Block Slot' : 'Confirm Appointment')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="schedule-preview">
                        <h4>Host Availability</h4>
                        {fetchingSchedule ? (
                            <p className="loading-tiny">Checking schedule...</p>
                        ) : hostAppointments.length === 0 ? (
                            <p className="success-text">Host is fully free!</p>
                        ) : (
                            <ul className="host-schedule-list">
                                {hostAppointments.map(appt => (
                                    <li key={appt.id} className={appt.status}>
                                        <span className="time">{new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="duration">({appt.duration_minutes}m)</span>
                                        <span className="status-label">{appt.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="hint">Red slots are already booked or blocked.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AppointmentModal;
