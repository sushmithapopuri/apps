import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api/axios';
import Webcam from 'react-webcam';
import { UserPlus, Shield, User as UserIcon, Camera, Check, X, Users, ShieldCheck } from 'lucide-react';
import VisitorsTable from './VisitorsTable';

function ManageUsers({ adminId }) {
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        role: 'employee',
        address: {
            street: 'VMS Office',
            city: 'HQ',
            state: 'TX',
            pincode: '123456'
        },
        face_image: null
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef(null);

    const [visitors, setVisitors] = useState([]);
    const [staff, setStaff] = useState([]);
    const [activeTab, setActiveTab] = useState('visitors');
    const [confirmDeleteStaff, setConfirmDeleteStaff] = useState(null);
    const [deletingStaff, setDeletingStaff] = useState(false);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setFormData(prev => ({ ...prev, face_image: imageSrc }));
        setShowCamera(false);
    }, [webcamRef]);

    const fetchVisitors = async () => {
        try {
            const res = await api.get('/admin/users/visitors');
            setVisitors(res.data);
        } catch (e) { /* ignore */ }
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get('/admin/users/all-staff');
            setStaff(res.data);
        } catch (e) { /* ignore */ }
    };

    const refreshAll = () => {
        fetchVisitors();
        fetchStaff();
    };

    useEffect(() => {
        refreshAll();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        try {
            await api.post(`/admin/create-user?admin_id=${adminId}`, formData);
            setMessage('User created successfully!');
            setFormData({
                full_name: '',
                phone_number: '',
                email: '',
                role: 'employee',
                address: { street: 'VMS Office', city: 'HQ', state: 'TX', pincode: '123456' },
                face_image: null
            });
            refreshAll();
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStaff = async (user) => {
        setDeletingStaff(true);
        try {
            await api.delete(`/admin/users/${user.id}?admin_id=${adminId}`);
            setConfirmDeleteStaff(null);
            refreshAll();
        } catch (e) {
            alert(e.response?.data?.detail || 'Failed to delete user');
        } finally {
            setDeletingStaff(false);
        }
    };

    return (
        <div className="card manage-users">
            <h3>Add New System User</h3>
            {message && <p className={message.includes('success') ? 'success-text' : 'error-text'}>{message}</p>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Role</label>
                    <div className="role-selector">
                        <button type="button" className={formData.role === 'employee' ? 'active' : ''} onClick={() => setFormData({ ...formData, role: 'employee' })}>
                            <UserIcon size={16} /> Employee
                        </button>
                        <button type="button" className={formData.role === 'security' ? 'active' : ''} onClick={() => setFormData({ ...formData, role: 'security' })}>
                            <Shield size={16} /> Security
                        </button>
                        <button type="button" className={formData.role === 'admin' ? 'active' : ''} onClick={() => setFormData({ ...formData, role: 'admin' })}>
                            <Shield size={16} /> Admin
                        </button>
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input type="text" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} required placeholder="+91..." />
                    </div>
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>

                <div className="form-group photo-section">
                    <label>Staff Identity Photo</label>
                    {showCamera ? (
                        <div className="camera-box">
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" />
                            <button type="button" onClick={capture} className="capture-btn">Capture Photo</button>
                        </div>
                    ) : (
                        <div className="photo-preview-container">
                            {formData.face_image ? (
                                <div className="photo-preview">
                                    <img src={formData.face_image} alt="Captured" />
                                    <span className="success-badge"><Check size={12} /> Captured</span>
                                </div>
                            ) : (
                                <div className="photo-placeholder">No photo captured</div>
                            )}
                            <button type="button" onClick={() => setShowCamera(true)} className="secondary-btn">
                                <Camera size={16} /> {formData.face_image ? 'Retake Photo' : 'Capture Photo'}
                            </button>
                        </div>
                    )}
                </div>

                <button type="submit" className="primary-btn" disabled={loading}>
                    <UserPlus size={18} /> {loading ? 'Creating...' : 'Register User'}
                </button>
            </form>

            {/* Category Tabs */}
            <div className="user-category-tabs" style={{ marginTop: '2rem' }}>
                <div className="tab-selector">
                    <button className={`tab-btn ${activeTab === 'visitors' ? 'active' : ''}`} onClick={() => setActiveTab('visitors')}>
                        <Users size={16} /> Visitors ({visitors.length})
                    </button>
                    <button className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
                        <ShieldCheck size={16} /> Staff ({staff.length})
                    </button>
                </div>

                {activeTab === 'visitors' && (
                    <VisitorsTable visitors={visitors} callerId={adminId} callerRole="admin" onRefresh={refreshAll} />
                )}

                {activeTab === 'staff' && (
                    <div className="card staff-table">
                        <h4>System Staff</h4>
                        {staff.length === 0 ? (
                            <p className="hint">No staff found.</p>
                        ) : (
                            <table className="full-width">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Phone</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.map(s => (
                                        <tr key={s.id}>
                                            <td>{s.id}</td>
                                            <td>{s.full_name}</td>
                                            <td>{s.phone_number}</td>
                                            <td>{s.email || '—'}</td>
                                            <td><span className={`status-pill ${s.role}`}>{s.role}</span></td>
                                            <td className="action-cell">
                                                <button className="icon-action-btn delete-btn" title="Remove user" onClick={() => setConfirmDeleteStaff(s)}>
                                                    <X size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Staff Delete Confirmation Modal */}
            {confirmDeleteStaff && (
                <div className="modal-overlay" onClick={() => !deletingStaff && setConfirmDeleteStaff(null)}>
                    <div className="modal-card confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="confirm-modal-body">
                            <div className="confirm-icon danger"><X size={32} /></div>
                            <h3>Delete User</h3>
                            <p>You are about to permanently delete <strong>{confirmDeleteStaff.full_name}</strong> ({confirmDeleteStaff.role}) and all associated records.</p>
                            <p className="warning-text">This action cannot be undone.</p>
                            <div className="confirm-actions">
                                <button className="secondary-btn" onClick={() => setConfirmDeleteStaff(null)} disabled={deletingStaff}>Cancel</button>
                                <button className="danger-btn" onClick={() => handleDeleteStaff(confirmDeleteStaff)} disabled={deletingStaff}>
                                    {deletingStaff ? 'Deleting…' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageUsers;
