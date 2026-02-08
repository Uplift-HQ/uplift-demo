// ============================================================
// SIGNATURE CANVAS COMPONENT
// Real electronic signature capture with canvas drawing
// ============================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Check, Edit3, Type } from 'lucide-react';

export default function SignatureCanvas({
  onSignatureChange,
  width = 500,
  height = 200,
  className = '',
  disabled = false,
  initialValue = null
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState('draw'); // 'draw' or 'type'
  const [typedName, setTypedName] = useState('');
  const lastPoint = useRef(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw signature line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.stroke();

    // Reset for drawing
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;

    // Restore initial value if provided
    if (initialValue && initialValue.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = initialValue;
    }
  }, [width, height, initialValue]);

  // Get canvas point from event
  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // Drawing handlers
  const startDrawing = useCallback((e) => {
    if (disabled || mode !== 'draw') return;
    e.preventDefault();

    const point = getPoint(e);
    if (point) {
      setIsDrawing(true);
      lastPoint.current = point;
    }
  }, [disabled, mode, getPoint]);

  const draw = useCallback((e) => {
    if (!isDrawing || disabled || mode !== 'draw') return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const point = getPoint(e);
    if (point && lastPoint.current) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      lastPoint.current = point;
      setIsEmpty(false);
    }
  }, [isDrawing, disabled, mode, getPoint]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPoint.current = null;

      // Notify parent of signature change
      if (!isEmpty && onSignatureChange) {
        const canvas = canvasRef.current;
        const dataUrl = canvas?.toDataURL('image/png');
        onSignatureChange(dataUrl);
      }
    }
  }, [isDrawing, isEmpty, onSignatureChange]);

  // Clear canvas
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // Redraw signature line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.stroke();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;

    setIsEmpty(true);
    setTypedName('');
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  }, [width, height, onSignatureChange]);

  // Draw typed signature on canvas
  const applyTypedSignature = useCallback(() => {
    if (!typedName.trim()) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Clear canvas first
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // Draw signature line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.stroke();

    // Draw typed name as signature
    ctx.fillStyle = '#1e293b';
    ctx.font = 'italic 48px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, width / 2, height / 2);

    setIsEmpty(false);

    if (onSignatureChange) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  }, [typedName, width, height, onSignatureChange]);

  // Handle typed name change
  useEffect(() => {
    if (mode === 'type' && typedName) {
      applyTypedSignature();
    }
  }, [mode, typedName, applyTypedSignature]);

  // Add event listeners for touch devices
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [isDrawing]);

  return (
    <div className={`signature-canvas-wrapper ${className}`}>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => { setMode('draw'); clearSignature(); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'draw'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Draw
        </button>
        <button
          type="button"
          onClick={() => { setMode('type'); clearSignature(); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'type'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Type className="w-4 h-4" />
          Type
        </button>
      </div>

      {/* Type Mode Input */}
      {mode === 'type' && (
        <div className="mb-3">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-lg font-serif italic focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled}
          />
        </div>
      )}

      {/* Canvas */}
      <div className="relative border border-slate-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full touch-none ${mode === 'draw' && !disabled ? 'cursor-crosshair' : 'cursor-default'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Instructions Overlay */}
        {isEmpty && mode === 'draw' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 text-sm">Draw your signature above the line</p>
          </div>
        )}

        {/* X mark for signature */}
        <div className="absolute left-8 bottom-8 text-slate-400 text-xl font-serif">✕</div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled || isEmpty}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </button>

        {!isEmpty && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Signature captured
          </div>
        )}
      </div>
    </div>
  );
}
