import { useRef, useEffect, useState } from 'react';

const SignaturePad = ({ value, onChange, label = "서명하기" }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [ctx, setCtx] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Initialize canvas context when modal opens
    useEffect(() => {
        if (showModal && canvasRef.current) {
            const canvas = canvasRef.current;
            // Set internal drawing size
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            const context = canvas.getContext('2d');
            context.lineWidth = 2.5;
            context.lineCap = 'round';
            context.strokeStyle = '#000';
            setCtx(context);

            // Load existing signature if available
            if (value) {
                const img = new Image();
                img.onload = () => {
                    context.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = value;
            }
        }
    }, [showModal, value]);

    const startDrawing = (e) => {
        e.preventDefault();
        const { offsetX, offsetY } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        if (isDrawing) {
            ctx.closePath();
            setIsDrawing(false);
        }
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches[0]) {
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        return {
            offsetX: e.nativeEvent.clientX - rect.left,
            offsetY: e.nativeEvent.clientY - rect.top
        };
    };

    const clearSignature = () => {
        if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const confirmSignature = () => {
        const dataURL = canvasRef.current.toDataURL();
        if (onChange) onChange(dataURL);
        setShowModal(false);
    };

    return (
        <div className="signature-component">
            {/* Clickable Preview Area */}
            <div 
                className="signature-preview-box" 
                onClick={() => setShowModal(true)}
                style={{ 
                    border: '1px solid #ccc', 
                    height: '100px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: '#fff',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {value ? (
                    <img src={value} alt="signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : (
                    <span style={{ color: '#999', fontSize: '14px' }}>{label} (클릭하여 서명)</span>
                )}
            </div>

            {/* Large Modal for Signing */}
            {showModal && (
                <div className="signature-modal-overlay">
                    <div className="signature-modal-content">
                        <div className="signature-modal-header">
                            <h3>{label}</h3>
                            <p>여백을 터치하여 서명해 주세요.</p>
                        </div>
                        
                        <div className="signature-canvas-wrapper">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                style={{ touchAction: 'none' }}
                            />
                        </div>

                        <div className="signature-modal-footer">
                            <button type="button" className="sig-btn clear" onClick={clearSignature}>지우기</button>
                            <div className="sig-actions">
                                <button type="button" className="sig-btn cancel" onClick={() => setShowModal(false)}>취소</button>
                                <button type="button" className="sig-btn save" onClick={confirmSignature}>서명 완료</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignaturePad;
