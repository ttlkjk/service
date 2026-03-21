import { useState, useEffect } from 'react';
import { getHospitals, addHospital, updateHospital, deleteHospital } from '../supabase';

const HospitalManager = () => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        products: '',
        system: '',
        installation_date: '',
        device_type: '',
        serial_number: '',
        revision_firmware: '',
        software_version: ''
    });

    useEffect(() => {
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            setLoading(true);
            const data = await getHospitals();
            setHospitals(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert('Hospital name is required');

        try {
            console.log('Submitting form. editingId:', editingId, 'formData:', formData);
            if (editingId !== null && editingId !== undefined) {
                console.log('Updating hospital with ID:', editingId);
                await updateHospital(editingId, formData);
                alert('Hospital updated successfully');
            } else {
                console.log('Adding new hospital');
                await addHospital(formData);
                alert('Hospital added successfully');
            }
            setFormData({
                name: '', location: '', products: '', system: '',
                installation_date: '', device_type: '', serial_number: '',
                revision_firmware: '', software_version: ''
            });
            setEditingId(null);
            fetchHospitals();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEdit = (hospital) => {
        console.log('Edit button clicked for hospital:', hospital);
        if (!hospital.id) {
            console.error('Hospital ID is missing!', hospital);
        }
        setEditingId(hospital.id);
        setFormData({
            name: hospital.name || '',
            location: hospital.location || '',
            products: hospital.products || '',
            system: hospital.system || '',
            installation_date: hospital.installation_date || '',
            device_type: hospital.device_type || '',
            serial_number: hospital.serial_number || '',
            revision_firmware: hospital.revision_firmware || '',
            software_version: hospital.software_version || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this hospital?')) return;

        try {
            await deleteHospital(id);
            alert('Hospital deleted successfully');
            if (editingId === id) {
                setEditingId(null);
                setFormData({
                    name: '', location: '', products: '', system: '',
                    installation_date: '', device_type: '', serial_number: '',
                    revision_firmware: '', software_version: ''
                });
            }
            fetchHospitals();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({
            name: '', location: '', products: '', system: '',
            installation_date: '', device_type: '', serial_number: '',
            revision_firmware: '', software_version: ''
        });
    };

    if (loading && hospitals.length === 0) return <div className="loading">Loading hospitals...</div>;

    return (
        <div className="hospital-manager animate-fade-in">
            <div className="card manage-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="section-title">{editingId ? 'Edit Hospital' : 'Add New Hospital'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="hospital-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Hospital Name *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Products</label>
                            <input type="text" name="products" value={formData.products} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>System</label>
                            <input type="text" name="system" value={formData.system} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Installation Date</label>
                            <input type="text" name="installation_date" value={formData.installation_date} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Device Type</label>
                            <input type="text" name="device_type" value={formData.device_type} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Serial Number</label>
                            <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Revision/Firmware</label>
                            <input type="text" name="revision_firmware" value={formData.revision_firmware} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Software Version</label>
                            <input type="text" name="software_version" value={formData.software_version} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary">
                            {editingId ? 'Update Hospital' : 'Add Hospital'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={handleCancel} className="btn btn-secondary">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="card list-card" style={{ marginTop: '2rem' }}>
                <h2 className="section-title">Hospital List ({hospitals.length})</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Location</th>
                                <th>System</th>
                                <th>Serial No.</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hospitals.map(hospital => (
                                <tr key={hospital.id}>
                                    <td className="font-bold">{hospital.name}</td>
                                    <td>{hospital.location}</td>
                                    <td>{hospital.system}</td>
                                    <td>{hospital.serial_number}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => handleEdit(hospital)} className="btn-icon edit" title="Edit">✎</button>
                                            <button onClick={() => handleDelete(hospital.id)} className="btn-icon delete" title="Delete">×</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {hospitals.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hospitals found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HospitalManager;
