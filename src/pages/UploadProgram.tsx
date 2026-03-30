import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { extractProgramFromText, createProgram } from '../services/api';
import type { Program, ProgramExercise, ProgramLevel, ProgressionRules } from '../types';

type Step = 'upload' | 'extracting' | 'review' | 'saving';

const ACCEPTED_TYPES = ['.txt', '.md', '.pdf'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function UploadProgram() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  // Extraction result
  const [program, setProgram] = useState<Omit<Program, 'id' | 'createdAt'> | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Review edits
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<'calisthenics' | 'weights' | 'custom'>('custom');

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    // Validate file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      setError(t('upload.invalidType'));
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(t('upload.tooLarge'));
      return;
    }

    // Read file text
    let text: string;
    try {
      if (ext === '.pdf') {
        // Read PDF as base64, send to server for text extraction
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        setStep('extracting');
        try {
          const result = await extractProgramFromText(base64, file.name);
          setProgram(result.program);
          setConfidence(result.confidence);
          setWarnings(result.warnings);
          setEditName(result.program.name || file.name);
          setEditDesc(result.program.description || '');
          setEditType(result.program.type || 'custom');
          setStep('review');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Extraction failed';
          setError(msg);
          setStep('upload');
        }
        return;
      }
      text = await file.text();
    } catch {
      setError(t('upload.readError'));
      return;
    }

    if (text.trim().length < 100) {
      setError(t('upload.tooShort'));
      return;
    }

    // Send to AI extraction
    setStep('extracting');
    try {
      const result = await extractProgramFromText(text, file.name);
      setProgram(result.program);
      setConfidence(result.confidence);
      setWarnings(result.warnings);
      setEditName(result.program.name || file.name);
      setEditDesc(result.program.description || '');
      setEditType(result.program.type || 'custom');
      setStep('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Extraction failed';
      setError(msg);
      setStep('upload');
    }
  }

  async function handleSave() {
    if (!program) return;

    setStep('saving');
    setError(null);
    try {
      const toSave = {
        ...program,
        name: editName,
        description: editDesc,
        type: editType,
      };
      await createProgram(toSave);
      navigate('/app/programs');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      setStep('review');
    }
  }

  // ========== UPLOAD STEP ==========
  if (step === 'upload') {
    return (
      <div>
        <h2 className="mb-sm">{t('upload.title')}</h2>
        <p className="text-secondary mb-lg">{t('upload.description')}</p>

        <div
          className="dropzone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('dragover'); }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
          role="button"
          aria-label={t('upload.dropzone')}
        >
          <div className="dropzone-icon">📄</div>
          <div className="font-medium">{t('upload.dropzone')}</div>
          <div className="text-xs text-tertiary mt-xs">{t('upload.formats')}</div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {error && (
          <div className="error-toast mt-md">{error}</div>
        )}

        <button
          className="btn btn-ghost mt-lg"
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  // ========== EXTRACTING STEP ==========
  if (step === 'extracting') {
    return (
      <div className="text-center" style={{ paddingTop: 48 }}>
        <div className="dropzone-icon">\uD83E\uDD16</div>
        <h2 className="mb-sm">{t('upload.extracting')}</h2>
        <p className="text-secondary mb-lg">
          {t('upload.extractingDesc', { fileName })}
        </p>
        <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto' }} role="progressbar" aria-label={t('upload.extracting')}>
          <div className="progress-fill" style={{ width: '60%', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    );
  }

  // ========== REVIEW STEP ==========
  if ((step === 'review' || step === 'saving') && program) {
    return (
      <div>
        <div className="flex-between mb-lg">
          <h2>{t('upload.review')}</h2>
          <ConfidenceBadge confidence={confidence} />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="card card-warning mb-md">
            <label className="label">{t('upload.warnings')}</label>
            {warnings.map((w, i) => (
              <div key={i} className="text-sm" style={{ padding: '2px 0' }}>
                ⚠️ {w}
              </div>
            ))}
          </div>
        )}

        {/* Program basics — editable */}
        <div className="card">
          <label className="label">{t('upload.programName')}</label>
          <input
            className="input mb-md"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            aria-label={t('upload.programName')}
          />

          <label className="label">{t('upload.programDesc')}</label>
          <textarea
            className="textarea mb-md"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
          />

          <label className="label">{t('upload.programType')}</label>
          <div className="flex gap-sm">
            {(['calisthenics', 'weights', 'custom'] as const).map((type) => (
              <button
                key={type}
                className={`btn ${editType === type ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setEditType(type)}
                aria-pressed={editType === type}
              >
                {t(`programs.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises (read-only summary) */}
        <div className="card">
          <label className="label">{t('upload.exercises', { count: program.exercises.length })}</label>
          {program.exercises.map((ex: ProgramExercise, i: number) => {
            const levelCount = program.levels?.filter((l: ProgramLevel) => l.exerciseId === ex.id).length ?? 0;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < program.exercises.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {ex.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {ex.type === 'timed' ? t('programs.timedExercise') : `${ex.defaultSets}×${ex.defaultReps}`}
                    {levelCount > 0 && ` · ${levelCount} ${t('upload.levels')}`}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {ex.slots.join(', ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progression Rules */}
        <div className="card">
          <label className="label">{t('upload.progressionRules')}</label>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>
            {t('upload.progressionDesc', {
              increment: (program.progressionRules as ProgressionRules)?.repsIncrement ?? 2,
              threshold: (program.progressionRules as ProgressionRules)?.consecutiveEasyThreshold ?? 2,
            })}
          </div>
        </div>

        {error && (
          <div className="error-toast mt-sm">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-sm mt-sm">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={step === 'saving' || !editName.trim()}
          >
            {step === 'saving' ? t('common.saving') : t('upload.saveProgram')}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setStep('upload'); setProgram(null); setError(null); }}
            disabled={step === 'saving'}
          >
            {t('upload.tryAnother')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const cls = confidence >= 80
    ? 'text-success'
    : confidence >= 50
      ? ''
      : 'text-error';
  const bg = confidence >= 80
    ? 'var(--success-bg)'
    : confidence >= 50
      ? 'var(--warning-bg)'
      : 'var(--error-bg)';

  return (
    <span className={`confidence-badge ${cls}`} style={{ background: bg, color: confidence >= 50 && confidence < 80 ? 'var(--warning)' : undefined }}>
      {confidence}%
    </span>
  );
}
