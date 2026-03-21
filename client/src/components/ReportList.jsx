import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, deleteReport } from '../supabase';

function ReportList() {
    const [reports, setReports] = useState([]);
    const [searchDate, setSearchDate] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [searchProducts, setSearchProducts] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const data = await getReports({
                date: searchDate,
                customer: searchCustomer,
                products: searchProducts,
            });
            setReports(data);
        } catch (error) {
            console.error('Error fetching reports', error);
        }
    };

    const handleSearch = () => {
        fetchReports();
    };

    const handleClear = async () => {
        setSearchDate('');
        setSearchCustomer('');
        setSearchProducts('');
        try {
            const data = await getReports({});
            setReports(data);
        } catch (error) {
            console.error('Error fetching reports', error);
        }
    };

    const handleRowClick = (id) => {
        navigate(`/reports/${id}`);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this report?')) {
            try {
                await deleteReport(id);
                setReports(reports.filter(report => report.id !== id));
            } catch (error) {
                console.error('Error deleting report', error);
                alert('Failed to delete report.');
            }
        }
    };

    return (
        <div className="animate-fade-in">
            <h2>Service History</h2>

            <div className="search-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="form-control"
                    title="Search by Date"
                />
                <input
                    type="text"
                    placeholder="Customer (Hospital)"
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    className="form-control"
                    style={{ flex: 1, minWidth: '200px' }}
                />
                <input
                    type="text"
                    placeholder="Products"
                    value={searchProducts}
                    onChange={(e) => setSearchProducts(e.target.value)}
                    className="form-control"
                    style={{ flex: 1, minWidth: '200px' }}
                />
                <button onClick={handleSearch} className="btn-primary" style={{ padding: '8px 16px' }}>Search</button>
                <button onClick={handleClear} className="btn-secondary" style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white' }}>Clear</button>
            </div>

            {reports.length === 0 ? (
                <p>No reports found.</p>
            ) : (
                <table className="report-list-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Products</th>
                            <th>Subject</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id} onClick={() => handleRowClick(report.id)}>
                                <td>{report.hospital_name}</td>
                                <td>{report.service_date}</td>
                                <td>{report.products}</td>
                                <td>{report.subject}</td>
                                <td>{new Date(report.created_at).toLocaleString()}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button
                                            className="btn-print"
                                            style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/reports/${report.id}?print=true`);
                                            }}
                                        >
                                            Print
                                        </button>

                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDelete(e, report.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default ReportList;
