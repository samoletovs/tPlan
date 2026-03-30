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
        <h2 style={{ marginBottom: 8 }}>{t('upload.title')}</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
          {t('upload.description')}
        </p>

        <div
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: 48,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--border)';
            const file = e.dataTransfer.files[0];
            if (file && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-body)', fontWeight: 500, marginBottom: 4 }}>
            {t('upload.dropzone')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            {t('upload.formats')}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {error && (
          <div style={{
            color: 'var(--error)', fontSize: '0.875rem', marginTop: 16,
            padding: '8px 12px', background: 'var(--error-bg)', borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-ghost"
          onClick={() => navigate('/app/programs')}
          style={{ marginTop: 24 }}
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  // ========== EXTRACTING STEP ==========
  if (step === 'extracting') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 48 }}>
        <div style={{ fontSize: '2rem', marginBottom: 16 }}>🤖</div>
        <h2 style={{ marginBottom: 8 }}>{t('upload.extracting')}</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
          {t('upload.extractingDesc', { fileName })}
        </p>
        <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto' }}>
          <div className="progress-fill" style={{ width: '60%', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    );
  }

  // ========== REVIEW STEP ==========
  if ((step === 'review' || step === 'saving') && program) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2>{t('upload.review')}</h2>
          <ConfidenceBadge confidence={confidence} />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="card" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning)', marginBottom: 16 }}>
            <label className="label" style={{ color: 'var(--warning)' }}>{t('upload.warnings')}</label>
            {warnings.map((w, i) => (
              <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-body)', padding: '2px 0' }}>
                ⚠️ {w}
              </div>
            ))}
          </div>
        )}

        {/* Program basics — editable */}
        <div className="card">
          <label className="label">{t('upload.programName')}</label>
          <input
            className="input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <label className="label">{t('upload.programDesc')}</label>
          <textarea
            className="textarea"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
            style={{ marginBottom: 12 }}
          />

          <label className="label">{t('upload.programType')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['calisthenics', 'weights', 'custom'] as const).map((type) => (
              <button
                key={type}
                className={`btn ${editType === type ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '6px 12px', fontSize: '0.8125rem' }}
                onClick={() => setEditType(type)}
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
          <div style={{
            color: 'var(--error)', fontSize: '0.875rem', marginTop: 8,
            padding: '8px 12px', background: 'var(--error-bg)', borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
  const color = confidence >= 80
    ? 'var(--success)'
    : confidence >= 50
      ? 'var(--warning)'
      : 'var(--error)';
  const bg = confidence >= 80
    ? 'var(--success-bg)'
    : confidence >= 50
      ? 'var(--warning-bg)'
      : 'var(--error-bg)';

  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
      fontSize: '0.75rem', fontWeight: 500, background: bg, color,
    }}>
      {confidence}%
    </span>
  );
}
