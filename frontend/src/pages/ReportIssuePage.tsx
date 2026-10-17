import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  CheckCircle2,
  Upload,
  X,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  FileText,
  Camera
} from 'lucide-react';
import { api } from '../services/api';
import { IssueCategory, IssueSeverity, IssueDetail } from '../types';

// Pin icon for report location
const pickerIcon = L.divIcon({
  html: `
    <div style="width: 36px; height: 36px; background-color: #3158D8; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg style="width: 18px; height: 18px; fill: white;" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  className: 'custom-picker-pin',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function MapPickerEvents({ onSelect }: { onSelect: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step (1: Details, 2: Location, 3: Photos, 4: Review)
  const [step, setStep] = useState<number>(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IssueCategory>('POTHOLE');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('MEDIUM');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Location Fields (Default Pune JM Road/Deccan)
  const [lat, setLat] = useState<number>(18.5204);
  const [lon, setLon] = useState<number>(73.8567);
  const [addressText, setAddressText] = useState('Pune Municipal Corporation Area');

  // Photo uploads
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdIssue, setCreatedIssue] = useState<IssueDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArr]);

      // Generate previews
      const previewsArr = filesArr.map((f) => URL.createObjectURL(f));
      setFilePreviews((prev) => [...prev, ...previewsArr]);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit complete complaint
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // 1. Create issue
      const issue = await api.createIssue({
        title,
        description,
        category,
        severity,
        latitude: lat,
        longitude: lon,
        address_text: addressText,
        is_anonymous: isAnonymous,
      });

      // 2. Upload supplementary photos if selected
      for (const file of selectedFiles) {
        await api.uploadPhoto(issue.id, file, 'Initial citizen grievance attachment');
      }

      setCreatedIssue(issue);
    } catch (e: any) {
      setErrorMsg(e.message || 'Submission failed. Please verify your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (createdIssue) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full my-auto">
        <div className="bg-white rounded-panel border border-surface-border p-6 sm:p-8 shadow-md text-center space-y-6">
          <div className="w-16 h-16 bg-green-50 text-status-resolved rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-navy-900">Grievance Registered Successfully</h2>
            <p className="text-xs text-text-muted">
              Your civic report has been stored with geographical coordinates in the municipal database.
            </p>
          </div>

          <div className="bg-surface-muted p-4 rounded-xl border border-surface-border inline-block max-w-sm mx-auto text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Assigned Ticket ID:</span>
              <span className="font-mono font-extrabold text-sm text-primary">{createdIssue.ticket_id}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Initial Urgency Score:</span>
              <span className="font-extrabold text-navy-900">{createdIssue.priority_score.toFixed(1)} / 100</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Category:</span>
              <span className="font-bold text-text-main">{createdIssue.category.replace('_', ' ')}</span>
            </div>
          </div>

          {createdIssue.duplicate_candidates.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs space-y-1">
              <div className="font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Notice: Nearby Duplicate Found</span>
              </div>
              <p className="text-text-muted">
                Our spatial engine detected an active report ({createdIssue.duplicate_candidates[0].other_ticket_id}) near this spot. Municipal officers will evaluate and cross-corroborate both reports.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(`/map?id=${createdIssue.id}`)}
              className="bg-navy-900 hover:bg-navy-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
            >
              View on Live Map
            </button>
            <button
              onClick={() => navigate('/my-complaints')}
              className="bg-surface-muted hover:bg-slate-200 text-text-main px-5 py-2.5 rounded-xl text-xs font-bold transition border border-surface-border"
            >
              My Complaints
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto w-full space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Report a Civic Problem</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Follow the 4-step wizard to file an infrastructure grievance with the Pune Municipal Corporation.
        </p>
      </div>

      {/* Wizard Progress Steps Indicator */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[
          { stepNum: 1, label: 'Issue Details' },
          { stepNum: 2, label: 'Geo Location' },
          { stepNum: 3, label: 'Evidence Photos' },
          { stepNum: 4, label: 'Review & File' },
        ].map((s) => {
          const isDone = step > s.stepNum;
          const isActive = step === s.stepNum;
          return (
            <div
              key={s.stepNum}
              className={`p-2.5 rounded-xl border font-bold transition ${
                isActive
                  ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                  : isDone
                  ? 'bg-teal-50 text-teal-accent border-teal-200'
                  : 'bg-white text-text-muted border-surface-border'
              }`}
            >
              <div className="text-[10px] uppercase font-semibold">Step {s.stepNum}</div>
              <div className="truncate text-xs">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-panel border border-surface-border p-6 shadow-xs space-y-5">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-status-critical rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: DETAILS */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-navy-900 mb-1">Complaint Headline / Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep pothole right before Goodluck Chowk signal"
                className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-navy-900 mb-1">Issue Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IssueCategory)}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs font-medium text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="POTHOLE">Pothole / Road Damage</option>
                  <option value="ROAD_CRACK">Road Crack / Fissure</option>
                  <option value="GARBAGE">Overflowing Garbage Bin</option>
                  <option value="WATER_LEAK">Water Leak / Pipe Burst</option>
                  <option value="STREETLIGHT">Broken Streetlight</option>
                  <option value="WATERLOGGING">Severe Waterlogging</option>
                  <option value="FALLEN_TREE">Fallen Tree / Branch</option>
                  <option value="DAMAGED_INFRASTRUCTURE">Damaged Railing / Slab</option>
                  <option value="OTHER">Other Civic Grievance</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy-900 mb-1">Perceived Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs font-medium text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="LOW">Low (Cosmetic / Minor Delay)</option>
                  <option value="MEDIUM">Medium (Normal Municipal Work)</option>
                  <option value="HIGH">High (Traffic Hazard / Heavy Leak)</option>
                  <option value="CRITICAL">Critical (Immediate Danger to Life)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">Detailed Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the exact location, dimension, how long it has been present, and any immediate risks..."
                rows={4}
                className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                required
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded text-primary"
              />
              <span className="text-text-muted">File anonymously (hide name from public views)</span>
            </label>
          </div>
        )}

        {/* STEP 2: LOCATION */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-navy-900">Pinpoint Exact Location on Map *</label>
                <span className="text-[11px] text-text-muted">Click anywhere on the map to set marker</span>
              </div>
              <div className="h-72 w-full rounded-xl overflow-hidden border border-surface-border relative">
                <MapContainer center={[lat, lon]} zoom={14} className="w-full h-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapPickerEvents onSelect={(nlat, nlon) => { setLat(nlat); setLon(nlon); }} />
                  <Marker position={[lat, lon]} icon={pickerIcon} />
                </MapContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-navy-900 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="e.g. Near Goodluck Cafe, FC Road"
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-navy-900 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value))}
                    className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-navy-900 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lon}
                    onChange={(e) => setLon(parseFloat(e.target.value))}
                    className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: EVIDENCE PHOTOS */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-navy-900 mb-1">Attach Photographs</label>
              <p className="text-[11px] text-text-muted mb-3">
                Upload clear pictures of the problem. Max 10MB per file (JPEG, PNG, WebP).
              </p>

              <label className="border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-surface-muted/50 hover:bg-blue-50/30 transition">
                <Camera className="w-8 h-8 text-primary mb-2" />
                <span className="font-bold text-xs text-navy-900">Click to browse or drop photos</span>
                <span className="text-[11px] text-text-muted mt-0.5">Supports multiple image files</span>
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Thumbnail Gallery */}
            {filePreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                {filePreviews.map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-surface-border group">
                    <img src={src} alt="Preview" className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-navy-900/80 text-white p-1 rounded-full hover:bg-status-critical transition"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 4 && (
          <div className="space-y-4 text-xs">
            <div className="bg-surface-muted p-4 rounded-xl border border-surface-border space-y-3">
              <div className="font-bold text-navy-900 text-sm border-b border-surface-border pb-2">
                Summary of Complaint
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-text-muted block text-[11px]">Headline:</span>
                  <span className="font-bold text-text-main">{title}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Category:</span>
                  <span className="font-bold text-text-main">{category.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Severity:</span>
                  <span className="font-bold text-status-critical">{severity}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Photos:</span>
                  <span className="font-bold text-text-main">{selectedFiles.length} attached</span>
                </div>
              </div>

              <div>
                <span className="text-text-muted block text-[11px]">Reported Address:</span>
                <span className="font-semibold text-text-main">
                  {addressText} ({lat.toFixed(5)}, {lon.toFixed(5)})
                </span>
              </div>

              <div>
                <span className="text-text-muted block text-[11px]">Description:</span>
                <p className="text-text-main mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-surface-border">
                  {description}
                </p>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-text-muted text-[11px]">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>
                Submitting will calculate the automatic priority score and check for nearby duplicate candidate reports.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-muted transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 1 && (!title.trim() || !description.trim())}
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-teal-accent hover:bg-teal-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering Grievance...' : 'Submit Grievance'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
