import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HospitalSearch from './HospitalSearch';
import SignaturePad from './SignaturePad';
import { getReport, createReport, updateReport } from '../supabase';
import logo from '../assets/logo.png';

function ServiceReportForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useState(new URLSearchParams(window.location.search));


    // Basic Info
    const [hospitalId, setHospitalId] = useState(null);
    const [hospitalName, setHospitalName] = useState('');
    const [location, setLocation] = useState('');
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

    // Header Data
    const [products, setProducts] = useState('');
    const [system, setSystem] = useState('');

    // Activity Type & Warranty
    const [warranty, setWarranty] = useState('IN');
    const [activityType, setActivityType] = useState({
        repair: false,
        installation: false,
        instruction: false,
        maintenance: false,
        etc: false,
        etcText: ''
    });

    // Tables
    const [deviceDetails, setDeviceDetails] = useState([
        { type: '', serial: '', firmware: '', software: '' },
        { type: '', serial: '', firmware: '', software: '' },
        { type: '', serial: '', firmware: '', software: '' },
        { type: '', serial: '', firmware: '', software: '' }
    ]);

    const [subject, setSubject] = useState('');
    const [serviceDetails, setServiceDetails] = useState('');

    const [partsDetails, setPartsDetails] = useState([
        { desc: '', partNo: '', qty: '', sn: '' },
        { desc: '', partNo: '', qty: '', sn: '' },
        { desc: '', partNo: '', qty: '', sn: '' }
    ]);

    const [serviceHours, setServiceHours] = useState([
        { start: '', finish: '', travel: '', total: '' },
        { start: '', finish: '', travel: '', total: '' }
    ]);

    const [servicerName, setServicerName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [servicerSignature, setServicerSignature] = useState('');
    const [customerSignature, setCustomerSignature] = useState('');

    const [message, setMessage] = useState('');

    useEffect(() => {
        if (id) {
            fetchReport(id);
        }
    }, [id]);

    const fetchReport = async (reportId) => {
        try {
            const data = await getReport(reportId);

            setHospitalId(data.hospital_id);
            setHospitalName(data.hospital_name);
            setLocation(data.location);
            setServiceDate(data.service_date);
            setProducts(data.products);
            setSystem(data.system);
            setWarranty(data.warranty);
            setSubject(data.subject);
            setServiceDetails(data.service_details);
            setServicerName(data.servicer_name);
            setCustomerName(data.customer_name);
            setServicerSignature(data.servicer_signature || '');
            setCustomerSignature(data.customer_signature || '');

            // Supabase JSONB fields come back as objects already
            if (data.activity_type) setActivityType(data.activity_type);
            if (data.device_details) setDeviceDetails(data.device_details);
            if (data.parts_details) setPartsDetails(data.parts_details);
            if (data.service_hours) setServiceHours(data.service_hours);

            // Auto-print if query param is set
            if (searchParams.get('print') === 'true') {
                setTimeout(() => {
                    handlePrint();
                }, 1000); // Give some time for signatures/images to load
            }


        } catch (error) {
            console.error('Error fetching report', error);
            setMessage('Failed to load report data.');
        }
    };

    const handleHospitalSelect = (hospital) => {
        setHospitalId(hospital.id);
        setHospitalName(hospital.name);
        setLocation(hospital.location || '');
        setProducts(hospital.products || '');
        setSystem(hospital.system || '');

        if (hospital.device_type || hospital.serial_number || hospital.revision_firmware || hospital.software_version) {
            const newDeviceDetails = [...deviceDetails];
            newDeviceDetails[0] = {
                type: hospital.device_type || '',
                serial: hospital.serial_number || '',
                firmware: hospital.revision_firmware || '',
                software: hospital.software_version || ''
            };
            setDeviceDetails(newDeviceDetails);
        }
    };

    const handleDeviceChange = (index, field, value) => {
        const newDevices = [...deviceDetails];
        newDevices[index][field] = value;
        setDeviceDetails(newDevices);
    };

    const handlePartChange = (index, field, value) => {
        const newParts = [...partsDetails];
        newParts[index][field] = value;
        setPartsDetails(newParts);
    };

    const handleHourChange = (index, field, value) => {
        const newHours = [...serviceHours];
        newHours[index][field] = value;
        setServiceHours(newHours);
    };

    const handlePrint = () => {
        const safeSystem = system ? system.replace(/[^a-z0-9]/gi, '_') : 'ServiceReport';
        const filename = `${safeSystem}_${serviceDate}.pdf`;
        const originalTitle = document.title;
        document.title = filename.replace('.pdf', '');
        window.print();
        document.title = originalTitle;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Supabase 컬럼명(snake_case)으로 저장
        const reportData = {
            hospital_id: hospitalId,
            hospital_name: hospitalName,
            location,
            products,
            system,
            warranty,
            activity_type: activityType,
            device_details: deviceDetails,
            subject,
            service_details: serviceDetails,
            parts_details: partsDetails,
            service_hours: serviceHours,
            servicer_name: servicerName,
            customer_name: customerName,
            service_date: serviceDate,
            servicer_signature: servicerSignature,
            customer_signature: customerSignature
        };

        try {
            if (id) {
                await updateReport(id, reportData);
                setMessage('Report updated successfully!');
            } else {
                await createReport(reportData);
                setMessage('Report saved successfully!');
            }

            setTimeout(() => {
                setMessage('');
                if (id) navigate('/reports');
            }, 1000);

        } catch (error) {
            console.error('Error saving report', error);
            setMessage('Failed to save report.');
        }
    };

    return (
        <div className="report-paper animate-fade-in">
            <div className="report-header-container">
                <div className="logo-section">
                    <img src={logo} alt="Withus Meditech Logo" style={{ maxWidth: '250px', height: 'auto' }} />
                </div>
                <div className="header-info">
                    <h1 className="report-header-title">
                        {id ? 'Edit Service Report' : 'Service Report'}
                    </h1>
                    <div className="date-input-wrapper">
                        Date : <input type="date" value={serviceDate} className="date-input" onChange={(e) => setServiceDate(e.target.value)} />
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="report-grid">
                {/* Row 1: Customer & Location */}
                <div className="grid-row">
                    <div className="cell label">Customer</div>
                    <div className="cell content" style={{ position: 'relative' }}>
                        {hospitalName ? (
                            <div onClick={() => { setHospitalName(''); setHospitalId(null); }} style={{ cursor: 'pointer', width: '100%' }}>
                                {hospitalName} (Click to reset)
                            </div>
                        ) : (
                            <HospitalSearch onSelect={handleHospitalSelect} />
                        )}
                    </div>
                    <div className="cell label">Location</div>
                    <div className="cell content">
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
                    </div>
                </div>

                {/* Row 2: Products & System */}
                <div className="grid-row">
                    <div className="cell label">Products</div>
                    <div className="cell content">
                        <input type="text" value={products} onChange={(e) => setProducts(e.target.value)} />
                    </div>
                    <div className="cell label">System</div>
                    <div className="cell content">
                        <input type="text" value={system} onChange={(e) => setSystem(e.target.value)} />
                    </div>
                </div>

                {/* Row 3: Activity Type & Warranty */}
                <div className="grid-row">
                    <div className="cell label h-medium">Type of activity</div>
                    <div className="cell content p-0" style={{ display: 'block' }}>
                        <div className="warranty-section">
                            <strong>WARRANTY (
                                <label className="inline-label"><input type="radio" name="warranty" value="IN" checked={warranty === 'IN'} onChange={(e) => setWarranty(e.target.value)} /> IN</label> /
                                <label className="inline-label"><input type="radio" name="warranty" value="OUT" checked={warranty === 'OUT'} onChange={(e) => setWarranty(e.target.value)} /> OUT</label> )
                            </strong>
                        </div>
                        <div className="checkbox-group activity-types">
                            <label><input type="checkbox" checked={activityType.repair} onChange={(e) => setActivityType({ ...activityType, repair: e.target.checked })} /> Repair</label>
                            <label><input type="checkbox" checked={activityType.installation} onChange={(e) => setActivityType({ ...activityType, installation: e.target.checked })} /> Installation</label>
                            <label><input type="checkbox" checked={activityType.instruction} onChange={(e) => setActivityType({ ...activityType, instruction: e.target.checked })} /> Instruction / training</label>
                            <label><input type="checkbox" checked={activityType.maintenance} onChange={(e) => setActivityType({ ...activityType, maintenance: e.target.checked })} /> Maintenance</label>
                            <div className="etc-wrapper">
                                <label>
                                    <input type="checkbox" checked={activityType.etc} onChange={(e) => setActivityType({ ...activityType, etc: e.target.checked })} />
                                    Etc. ( <input type="text" className="etc-input" value={activityType.etcText} onChange={(e) => setActivityType({ ...activityType, etcText: e.target.value })} /> )
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 4: Device Type Table */}
                <div className="grid-row" style={{ display: 'block' }}>
                    <table className="inner-table">
                        <thead>
                            <tr>
                                <th>Device type</th>
                                <th>Serial number</th>
                                <th>Revision/Firmware</th>
                                <th>Software version</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deviceDetails.map((row, idx) => (
                                <tr key={idx}>
                                    <td><input type="text" value={row.type} onChange={(e) => handleDeviceChange(idx, 'type', e.target.value)} /></td>
                                    <td><input type="text" value={row.serial} onChange={(e) => handleDeviceChange(idx, 'serial', e.target.value)} /></td>
                                    <td><input type="text" value={row.firmware} onChange={(e) => handleDeviceChange(idx, 'firmware', e.target.value)} /></td>
                                    <td><input type="text" value={row.software} onChange={(e) => handleDeviceChange(idx, 'software', e.target.value)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Row 5: Subject */}
                <div className="grid-row">
                    <div className="cell label">Subject</div>
                    <div className="cell content">
                        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                </div>

                {/* Row 6: Activity */}
                <div className="grid-row">
                    <div className="cell label h-large">Activity</div>
                    <div className="cell content h-large">
                        <textarea style={{ height: '100%' }} value={serviceDetails} onChange={(e) => setServiceDetails(e.target.value)}></textarea>
                    </div>
                </div>

                {/* Row 7: Parts Table */}
                <div className="grid-row" style={{ display: 'block' }}>
                    <div style={{ display: 'flex' }}>
                        <div className="cell label" style={{ borderRight: '1px solid black', borderBottom: 'none' }}>Parts</div>
                        <div style={{ flex: 1 }}>
                            <table className="inner-table" style={{ border: 'none' }}>
                                <thead>
                                    <tr>
                                        <th style={{ borderTop: 'none', borderLeft: 'none', width: '40%' }}>Description</th>
                                        <th style={{ borderTop: 'none', width: '25%' }}>Part No</th>
                                        <th style={{ borderTop: 'none', width: '15%' }}>Q'TY</th>
                                        <th style={{ borderTop: 'none', borderRight: 'none', width: '20%' }}>S / N</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partsDetails.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ borderLeft: 'none' }}><input type="text" value={row.desc} onChange={(e) => handlePartChange(idx, 'desc', e.target.value)} /></td>
                                            <td><input type="text" value={row.partNo} onChange={(e) => handlePartChange(idx, 'partNo', e.target.value)} /></td>
                                            <td><input type="text" value={row.qty} onChange={(e) => handlePartChange(idx, 'qty', e.target.value)} /></td>
                                            <td style={{ borderRight: 'none' }}><input type="text" value={row.sn} onChange={(e) => handlePartChange(idx, 'sn', e.target.value)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Row 8: Service Hours */}
                <div className="grid-row" style={{ display: 'block' }}>
                    <div style={{ display: 'flex' }}>
                        <div className="cell label" style={{ borderRight: '1px solid black' }}>
                            Service<br />Hours
                        </div>
                        <div style={{ flex: 1 }}>
                            <table className="inner-table" style={{ border: 'none' }}>
                                <thead>
                                    <tr>
                                        <th style={{ borderTop: 'none', borderLeft: 'none', width: '40%' }}>Start Time</th>
                                        <th style={{ borderTop: 'none', width: '25%' }}>Finish Time</th>
                                        <th style={{ borderTop: 'none', width: '15%' }}>Travel</th>
                                        <th style={{ borderTop: 'none', borderRight: 'none', width: '20%' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serviceHours.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ borderLeft: 'none' }}><input type="text" placeholder=":" style={{ textAlign: 'center' }} value={row.start} onChange={(e) => handleHourChange(idx, 'start', e.target.value)} /></td>
                                            <td><input type="text" placeholder=":" style={{ textAlign: 'center' }} value={row.finish} onChange={(e) => handleHourChange(idx, 'finish', e.target.value)} /></td>
                                            <td><input type="text" value={row.travel} onChange={(e) => handleHourChange(idx, 'travel', e.target.value)} /></td>
                                            <td style={{ borderRight: 'none' }}><input type="text" placeholder=":" style={{ textAlign: 'center' }} value={row.total} onChange={(e) => handleHourChange(idx, 'total', e.target.value)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </form>

            {/* Footer: Signatures */}
            <div className="signature-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', gap: '20px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="signature-name-group" style={{ width: '100%', display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>Servicer Name:</span>
                        <input type="text" value={servicerName} onChange={(e) => setServicerName(e.target.value)} className="signature-input" style={{ border: 'none', borderBottom: '1px solid black', flex: 1, width: '100%', marginLeft: '10px' }} />
                    </div>
                    <div className="signature-pad-wrapper" style={{ marginBottom: '5px', width: '100%' }}>
                        <SignaturePad value={servicerSignature} onChange={setServicerSignature} height={100} />
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="signature-name-group" style={{ width: '100%', display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>Customer Name:</span>
                        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="signature-input" style={{ border: 'none', borderBottom: '1px solid black', flex: 1, width: '100%', marginLeft: '10px' }} />
                    </div>
                    <div className="signature-pad-wrapper" style={{ marginBottom: '5px', width: '100%' }}>
                        <SignaturePad value={customerSignature} onChange={setCustomerSignature} height={100} />
                    </div>
                </div>
            </div>




            <div className="action-buttons-container print-hide" style={{ textAlign: 'center', marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }} data-html2canvas-ignore="true">
                <button type="button" onClick={handlePrint} className="btn-print" style={{ padding: '10px 40px', fontSize: '1.2rem', cursor: 'pointer', border: 'none' }}>
                    Print Report
                </button>

                <button onClick={handleSubmit} style={{ padding: '10px 40px', fontSize: '1.2rem', cursor: 'pointer' }}>
                    {id ? 'Update Report' : 'Save Report'}
                </button>

                {id && (
                    <button onClick={() => navigate('/reports')} style={{ padding: '10px 40px', fontSize: '1.2rem', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none' }}>
                        Cancel
                    </button>
                )}
            </div>
            {message && <p style={{ textAlign: 'center', color: message.includes('Failed') ? 'red' : 'green' }}>{message}</p>}
        </div>
    );
}

export default ServiceReportForm;
