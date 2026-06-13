import React, { useState } from 'react';
import { X, ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../api/axios';

function VisitorsTable({ visitors = [], callerId, callerRole, onRefresh }) {
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const canDelete = callerRole === 'admin';
    const canToggleTrust = callerRole === 'admin' || callerRole === 'employee';

    const handleDelete = async (visitor) => {
        setDeleting(true);
        try {
            await api.delete(`/admin/users/${visitor.id}?admin_id=${callerId}`);
            setConfirmDelete(null);
            if (onRefresh) onRefresh();
        } catch (e) {
            alert(e.response?.data?.detail || 'Failed to delete visitor');
        } finally {
            setDeleting(false);
        }
    };

    const handleToggleTrust = async (visitor) => {
        try {
            await api.patch(`/admin/users/${visitor.id}/trust?admin_id=${callerId}`);
            if (onRefresh) onRefresh();
        } catch (e) {
            alert(e.response?.data?.detail || 'Failed to update trust status');
        }
    };

    return (
        <div className="card visitors-table">
            <h4>Registered Visitors</h4>
            {visitors.length === 0 ? (
                <p className="hint">No visitors found.</p>
            ) : (
                <table className="full-width">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Verified</th>
                            <th>Trust</th>
                            <th>Joined</th>
                            {(canDelete || canToggleTrust) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.map(v => (
                            <tr key={v.id}>
                                <td>{v.id}</td>
                                <td>{v.full_name}</td>
                                <td>{v.phone_number}</td>
                                <td>{v.email || '—'}</td>
                                <td>{v.is_verified ? 'Yes' : 'No'}</td>
                                <td>
                                    <span className={`trust-badge ${v.is_trusted ? 'trusted' : 'untrusted'}`}>
                                        {v.is_trusted ? 'Trusted' : 'Untrusted'}
                                    </span>
                                </td>
                                <td>{v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}</td>
                                {(canDelete || canToggleTrust) && (
                                    <td className="action-cell">
                                        {canToggleTrust && (
                                            <button
                                                className={`icon-action-btn ${v.is_trusted ? 'trust-on' : 'trust-off'}`}
                                                title={v.is_trusted ? 'Revoke trust' : 'Grant trust'}
                                                onClick={() => handleToggleTrust(v)}
                                            >
                                                {v.is_trusted ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                className="icon-action-btn delete-btn"
                                                title="Remove visitor"
                                                onClick={() => setConfirmDelete(v)}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
                    <div className="modal-card confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="confirm-modal-body">
                            <div className="confirm-icon danger">
                                <X size={32} />
                            </div>
                            <h3>Delete Visitor</h3>
                            <p>
                                You are about to permanently delete <strong>{confirmDelete.full_name}</strong> and all associated records.
                            </p>
                            <p className="warning-text">This action cannot be undone.</p>
                            <div className="confirm-actions">
                                <button
                                    className="secondary-btn"
                                    onClick={() => setConfirmDelete(null)}
                                    disabled={deleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="danger-btn"
                                    onClick={() => handleDelete(confirmDelete)}
                                    disabled={deleting}
                                >
                                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VisitorsTable;
