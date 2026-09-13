import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ExerciseStepCard from '../src/components/workout/ExerciseStepCard';
import TimedExerciseStep from '../src/components/workout/TimedExerciseStep';
import { WorkoutCoaching } from '../src/components/workout/CoachingText';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../src/i18n/en.json';
import ru from '../src/i18n/ru.json';
import lv from '../src/i18n/lv.json';
import es from '../src/i18n/es.json';
import { validateProgramSchedule } from '../api/src/services/program-schedule';
import { CC_PROGRAM } from '../api/src/data/cc-program';
import { prepareReviewedProgram } from '../src/utils/programReview';
import type { ExerciseStep } from '../src/types';

interface Request {
  headers: { get(name: string): string | null };
  params: Record<string, string>;
  json(): Promise<unknown>;
}
interface Response { status?: number; jsonBody: unknown }
type Handler = (request: Request) => Promise<Response>;
type Row = Record<string, unknown>;

function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
  return value as Row;
}
function request(body: unknown, params: Record<string, string> = {}): Request {
  return { json: async () => body, params, headers: { get: () => 'en' } };
}
function program() {
  return {
    name: 'Synthetic program', type: 'custom' as const, description: 'Synthetic.', source: 'synthetic.txt',
    exercises: [{
      id: 'demo', name: 'Demo', type: 'reps' as const, defaultSets: 1, defaultReps: 2,
      technique: 'Move steadily.', tempo: '2-1-2', restBetweenSets: 30, startLevel: 1,
      slots: ['day-a'],
    }],
    levels: [],
    trainingDays: { 'day-a': { exercises: ['demo'], label: 'A' } },
    defaultSchedule: { mon: 'day-a' },
  };
}

function harness({ configured = false, content = JSON.stringify({
  motivation: 'Ready when you are.', tips: ['', 'Move steadily.', ''],
  unsupportedAdjustment: false,
}), finishReason = 'stop', locale = 'en', responses = [] as string[], providerError = false } = {}) {
  const routes: Record<string, Handler> = {};
  const saved = new Map<string, Row>();
  const workouts: Row[] = [];
  const calls: Row[] = [];
  const signals: AbortSignal[] = [];
  let scheduled = true;
  const dependencies: Record<string, unknown> = {
    '@azure/functions': { app: { http: (name: string, options: { handler: Handler }) => {
      routes[name] = options.handler;
    } } },
    '../db.js': {
      getUserId: () => 'synthetic',
      getTable: (name: string) => {
        if (name === 'tplanPrograms') return {
          upsertEntity: async (row: Row) => { saved.set(String(row.rowKey), row); },
          getEntity: async (partition: string, id: string) => {
            const row = saved.get(id);
            if (!row || row.partitionKey !== partition) throw new Error('Not found');
            return row;
          },
          deleteEntity: async (partition: string, id: string) => {
            if (saved.get(id)?.partitionKey !== partition) throw new Error('Not found');
            saved.delete(id);
          },
          async *listEntities() { yield* saved.values(); },
        };
        if (name === 'tplanUsers') return { getEntity: async () => ({
          locale, currentLevels: '{}', preferences: '{}',
        }) };
        if (name === 'tplanSchedules') return { getEntity: async () => ({
          weeklySchedule: JSON.stringify({ mon: scheduled ? [{ programId: [...saved.keys()][0], slot: 'morning' }] : [] }),
          programs: '[]',
        }) };
        if (name === 'tplanLogs') return { async *listEntities() {} };
        if (name === 'tplanWorkouts') return { upsertEntity: async (row: Row) => { workouts.push(row); } };
        throw new Error(`Unmocked table: ${name}`);
      },
    },
    '../memory/index.js': {
      recallForPrompt: async () => ({ block: '' }),
      fenceUserText: (_label: string, text: string) => `[data]${text}[/data]`,
    },
    '../services/pdf-parser.js': { parsePdf: () => { throw new Error('PDF not used in this test'); } },
  };
  const cache = new Map<string, Row>();
  function load(file: string): Row {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename)!;
    const exports: Row = {};
    cache.set(filename, exports);
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      exports, console: { error() {}, warn() {} }, AbortSignal,
      process: { env: configured ? {
        AZURE_OPENAI_ENDPOINT: 'https://example.invalid', AZURE_OPENAI_KEY: 'synthetic',
        AZURE_OPENAI_DEPLOYMENT: 'synthetic',
      } : {} },
      fetch: async (_url: string, options: { body: string; signal: AbortSignal }) => {
        calls.push(object(JSON.parse(options.body)));
        signals.push(options.signal);
        if (providerError) throw new Error('Synthetic provider outage');
        return { ok: true, json: async () => ({
          choices: [{ finish_reason: finishReason, message: { content: responses.shift() ?? content } }],
        }) };
      },
      require: (name: string) => {
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name.replace(/\.js$/, '.ts')));
        throw new Error(`Unmocked external import: ${name}`);
      },
    }, { filename });
    return exports;
  }
  for (const name of ['program-management', 'programs', 'workouts']) {
    load(path.resolve('api', 'src', 'functions', `${name}.ts`));
  }
  return {
    routes, saved, workouts, calls, signals,
    rest: () => { scheduled = false; },
    save: (value: unknown = program()) => routes.createProgram(request(value)),
    generate: (userNote = '') => routes.generateWorkout(request({
      date: '2026-09-07', session: 'morning', userNote,
    })),
  };
}

function renderPage({
  file, initialState, translate, api,
}: {
  file: string; initialState: unknown[];
  translate: (key: string, options?: Record<string, unknown>) => string;
  api: Record<string, unknown>;
}) {
  const state = [...initialState];
  let cursor = 0;
  const cache = new Map<string, Row>();
  const dependencies: Record<string, unknown> = {
    react: {
      useState: (initial: unknown) => {
        const index = cursor++;
        if (index >= state.length) state[index] = initial;
        return [state[index], (next: unknown) => {
          state[index] = typeof next === 'function' ? next(state[index]) : next;
        }];
      },
      useEffect() {},
    },
    'react/jsx-runtime': jsxRuntime,
    'react-i18next': { useTranslation: () => ({ t: translate }) },
    'react-router-dom': { Link: ({ to, children, ...props }: Row) => createElement('a', { href: to, ...props }, children as ReactNode) },
    '../services/api': api,
    '../context/AuthContext': { useAuth: () => ({ user: null }) },
  };
  function load(filename: string): Row {
    if (cache.has(filename)) return cache.get(filename)!;
    const exports: Row = {};
    cache.set(filename, exports);
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(source, {
      exports,
      require(name: string) {
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.tsx`));
        throw new Error(`Unmocked UI dependency: ${name}`);
      },
    }, { filename });
    return exports;
  }
  const page = load(path.resolve('src', 'pages', `${file}.tsx`)).default;
  if (typeof page !== 'function') throw new Error('Missing page component');
  return {
    tree: (): ReactNode => { cursor = 0; return page(); },
    html(): string { return renderToStaticMarkup(this.tree()); },
  };
}

function buttons(node: ReactNode): ReactElement<Row>[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isValidElement<Row>(node)) return [];
  const found = node.type === 'button' ? [node] : [];
  return [...found, ...buttons(node.props.children as ReactNode)];
}

function click(button: ReactElement<Row>) {
  if (typeof button.props.onClick !== 'function') throw new Error('Missing click handler');
  return button.props.onClick({ stopPropagation() {} });
}

describe('damaged program catalog UI', () => {
  it.each(['en', 'ru', 'lv', 'es'])('keeps healthy choices, repair status, and the existing delete flow in %s', async language => {
    const h = harness();
    await h.save();
    const healthy = [...h.saved.values()][0];
    const bad: Row = { ...healthy, rowKey: 'old-upload', name: 'Old upload' };
    delete bad.trainingDays;
    delete bad.defaultSchedule;
    h.saved.set('old-upload', bad);
    const response = await h.routes.getPrograms(request(null));
    expect(response.status ?? 200).toBe(200);
    const programs = response.jsonBody as Row[];
    const i18n = createInstance();
    await i18n.init({ lng: language, resources: {
      en: { translation: en }, ru: { translation: ru }, lv: { translation: lv }, es: { translation: es },
    } });
    const schedule = {
      weeklySchedule: { mon: [{ programId: 'old-upload', slot: 'morning' }], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
      programs: [],
    };
    const deleteProgram = vi.fn(async (id: string) => {
      const deleted = await h.routes.deleteProgram(request(null, { id }));
      expect(deleted.status).toBe(200);
    });
    const updateSchedule = vi.fn(async () => {});
    const api = { deleteProgram, getSchedule: async () => schedule, updateSchedule };
    const catalog = renderPage({
      file: 'Programs', initialState: [programs, schedule, false, null, null, null, null],
      translate: (key, options) => i18n.t(key, options), api,
    });
    expect(catalog.html()).toContain('Synthetic program');
    expect(catalog.html()).toContain('Old upload');
    expect(catalog.html()).toContain('role="status"');
    expect(catalog.html()).not.toContain('programs.repairRequired');
    const deletion = buttons(catalog.tree()).find(button => button.props.children === i18n.t('programs.delete'));
    expect(deletion).toBeDefined();
    click(deletion!);
    expect(deleteProgram).not.toHaveBeenCalled();
    const confirmation = buttons(catalog.tree()).find(button => button.props.children === i18n.t('programs.confirmDelete'));
    expect(confirmation).toBeDefined();
    click(confirmation!);
    await vi.waitFor(() => expect(updateSchedule).toHaveBeenCalledOnce());
    expect(deleteProgram).toHaveBeenCalledExactlyOnceWith('old-upload');
    expect(h.saved.has(String(healthy.rowKey))).toBe(true);
    expect(catalog.html()).not.toContain('Old upload');
    expect(catalog.html()).toContain('Synthetic program');
  });

  it('keeps healthy schedule toggles enabled, blocks damaged additions, and allows removing an existing damaged slot', async () => {
    const h = harness();
    await h.save();
    const healthy = [...h.saved.values()][0];
    const bad: Row = { ...healthy, rowKey: 'old-upload', name: 'Old upload' };
    delete bad.trainingDays;
    delete bad.defaultSchedule;
    h.saved.set('old-upload', bad);
    const response = await h.routes.getPrograms(request(null));
    expect(response.status ?? 200).toBe(200);
    const schedule = { weeklySchedule: {
      mon: [{ programId: 'old-upload', slot: 'morning' }], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
    }, programs: [] };
    const updateSchedule = vi.fn(async () => {});
    const page = renderPage({
      file: 'Schedule', initialState: [schedule, response.jsonBody, false, 'mon', false, null],
      translate: key => key, api: { updateSchedule },
    });
    expect(page.html()).toContain('Synthetic program');
    expect(page.html()).toContain('Old upload');
    expect(page.html()).toContain('role="status"');
    const all = buttons(page.tree());
    const healthyChoice = all.find(button => button.props['aria-label'] === 'Synthetic program morning')!;
    const invalidChoice = all.find(button => button.props['aria-label'] === 'Old upload evening')!;
    const existing = all.find(button => button.props['aria-label'] === 'Old upload morning')!;
    expect(healthyChoice.props.disabled).toBe(false);
    expect(invalidChoice.props.disabled).toBe(true);
    expect(existing.props.disabled).toBe(false);
    await click(invalidChoice);
    expect(updateSchedule).not.toHaveBeenCalled();
    await click(existing);
    expect(updateSchedule).toHaveBeenCalledWith(expect.objectContaining({
      weeklySchedule: expect.objectContaining({ mon: [] }),
    }));
    await click(buttons(page.tree()).find(button => button.props['aria-label'] === 'Synthetic program morning')!);
    expect(updateSchedule).toHaveBeenLastCalledWith(expect.objectContaining({
      weeklySchedule: expect.objectContaining({ mon: [{ programId: healthy.rowKey, slot: 'morning' }] }),
    }));
  });
});

describe('saved extraction contract', () => {
  it('preserves schedule and intended exercise through save, both reads, and generation', async () => {
    const h = harness({ configured: true, responses: [
      JSON.stringify(program()),
      JSON.stringify(program()),
    ] });
    const extracted = await h.routes.extractProgram(request({
      text: 'Synthetic methodology describing the Demo exercise and its day-a schedule.',
      fileName: 'synthetic.txt',
    }));
    expect(extracted.status ?? 200).toBe(200);
    const saved = await h.save(object(extracted.jsonBody).program);
    expect(saved.status).toBe(201);
    expect(object(saved.jsonBody).trainingDays).toEqual(program().trainingDays);
    const id = String(object(saved.jsonBody).id);
    const single = await h.routes.getProgram(request(null, { id }));
    const list = await h.routes.getPrograms(request(null));
    expect(object(single.jsonBody).defaultSchedule).toEqual(program().defaultSchedule);
    expect((list.jsonBody as Row[])[0].trainingDays).toEqual(program().trainingDays);
    const workout = await h.generate();
    expect(workout.status).toBe(201);
    const steps = object(workout.jsonBody).steps as Row[];
    expect(steps.filter(step => step.type === 'exercise').map(step => step.exerciseId)).toEqual(['demo']);
  });

  it.each([
    { defaultSchedule: { mon: 'missing' } },
    { trainingDays: { 'day-a': { label: 'A', exercises: ['missing'] } } },
    { trainingDays: [] },
    { defaultSchedule: { someday: 'day-a' } },
    { exercises: [{ ...program().exercises[0], slots: ['missing'] }] },
    { exercises: [program().exercises[0], program().exercises[0]] },
  ])('rejects inconsistent scheduling instead of saving it: %j', async overrides => {
    const h = harness();
    expect((await h.save({ ...program(), ...overrides })).status).toBe(400);
    expect(h.saved.size).toBe(0);
  });

  it('keeps a legacy program without day mappings or exercise restrictions usable', async () => {
    const h = harness();
    await h.save({ name: 'Legacy', exercises: [{ ...program().exercises[0], slots: [] }] });
    expect((await h.generate()).status).toBe(201);
  });

  it('rejects an inconsistent model-extracted schedule before review', async () => {
    const h = harness({ configured: true, responses: [
      JSON.stringify(program()),
      JSON.stringify({ ...program(), defaultSchedule: { mon: 'missing' } }),
    ] });
    const response = await h.routes.extractProgram(request({
      text: 'Synthetic methodology describing the Demo exercise.',
      fileName: 'synthetic.txt',
    }));
    expect(response.status).toBe(502);
    expect(h.saved.size).toBe(0);
  });

  it('preserves the existing built-in program schedule', () => {
    const schedule = validateProgramSchedule(CC_PROGRAM);
    expect(schedule.trainingDays).toEqual(CC_PROGRAM.trainingDays);
    expect(schedule.defaultSchedule).toEqual(CC_PROGRAM.defaultSchedule);
    expect(schedule.exercises).toEqual(CC_PROGRAM.exercises);
  });

  it('keeps explicit exercise removals in the review UI saveable without dangling mappings', async () => {
    const original = program();
    const extra = { ...original.exercises[0], id: 'extra', slots: ['day-b'] };
    const draft = {
      ...original, exercises: [...original.exercises, extra],
      trainingDays: { ...original.trainingDays, 'day-b': { label: 'B', exercises: ['extra'] } },
      defaultSchedule: { ...original.defaultSchedule, tue: 'day-b' },
    };
    const reviewed = prepareReviewedProgram({ program: draft, exercises: original.exercises });
    expect(reviewed.trainingDays).toEqual(original.trainingDays);
    expect(reviewed.defaultSchedule).toEqual({ mon: 'day-a', tue: null });
    expect((await harness().save(reviewed)).status).toBe(201);
  });

  it('rejects an empty generated session even for a valid legacy slot restriction', async () => {
    const h = harness();
    await h.save({ name: 'Legacy', exercises: [{ ...program().exercises[0], slots: ['evening'] }] });
    const response = await h.generate();
    expect(response.status).toBe(422);
    expect(object(response.jsonBody).code).toBe('empty_session');
    expect(h.workouts).toHaveLength(0);
  });

  it('does not return a corrupt stored mapping from either read endpoint', async () => {
    const h = harness();
    await h.save();
    const row = [...h.saved.values()][0];
    row.defaultSchedule = JSON.stringify({ mon: 'missing' });
    expect((await h.routes.getProgram(request(null, { id: String(row.rowKey) }))).status).toBe(422);
    const catalog = await h.routes.getPrograms(request(null));
    expect(catalog.status ?? 200).toBe(200);
    expect((catalog.jsonBody as Row[])[0].availability).toBe('repair_required');
  });

  it.each([false, true])('isolates an old-format upload from a healthy catalog entry (bad first=%s)', async badFirst => {
    const h = harness();
    await h.save();
    const healthy = [...h.saved.values()][0];
    const bad: Row = { ...healthy, rowKey: 'old-upload', name: 'Old upload' };
    delete bad.trainingDays;
    delete bad.defaultSchedule;
    h.saved.clear();
    const rows = badFirst ? [bad, healthy] : [healthy, bad];
    rows.forEach(row => h.saved.set(String(row.rowKey), row));
    const catalog = await h.routes.getPrograms(request(null));
    expect(catalog.status ?? 200).toBe(200);
    const programs = catalog.jsonBody as Row[];
    expect(programs).toHaveLength(2);
    expect(programs.find(item => item.id === healthy.rowKey)?.trainingDays).toEqual(program().trainingDays);
    expect(programs.find(item => item.id === 'old-upload')).toMatchObject({
      id: 'old-upload', name: 'Old upload', availability: 'repair_required', exercises: [],
    });
    expect(h.saved.get('old-upload')).toEqual(bad);
    expect((await h.routes.getProgram(request(null, { id: String(healthy.rowKey) }))).status ?? 200).toBe(200);
    expect((await h.routes.getProgram(request(null, { id: 'old-upload' }))).status).toBe(422);
    const deleted = await h.routes.deleteProgram(request(null, { id: 'old-upload' }));
    expect(deleted.status).toBe(200);
    expect(h.saved.has('old-upload')).toBe(false);
    expect(h.saved.has(String(healthy.rowKey))).toBe(true);
    expect((await h.generate()).status).toBe(201);
  });

  it('rejects an unassigned exercise in a named-day program before saving', async () => {
    const h = harness();
    const draft = program();
    draft.exercises.unshift({ ...draft.exercises[0], id: 'unassigned', slots: [] });
    expect((await h.save(draft)).status).toBe(400);
    expect(h.saved.size).toBe(0);
  });

  it('does not let an unassigned stored exercise displace the mapped exercise at a one-exercise cap', async () => {
    const h = harness();
    await h.save();
    const row = [...h.saved.values()][0];
    const exercises = program().exercises;
    row.exercises = JSON.stringify([{ ...exercises[0], id: 'unassigned', slots: [] }, ...exercises]);
    row.progressionRules = JSON.stringify({ maxExercisesPerSession: 1 });
    expect((await h.generate()).status).toBe(422);
    expect(h.workouts).toHaveLength(0);
    row.exercises = JSON.stringify(exercises);
    const good = await h.generate();
    expect(good.status).toBe(201);
    expect((object(good.jsonBody).steps as Row[]).filter(step => step.type === 'exercise').map(step => step.exerciseId)).toEqual(['demo']);
  });

  it('rejects a stored broken mapping instead of publishing an empty session', async () => {
    const h = harness();
    await h.save();
    const row = [...h.saved.values()][0];
    delete row.trainingDays;
    delete row.defaultSchedule;
    expect((await h.generate()).status).toBe(422);
    expect(h.workouts).toHaveLength(0);
  });

  it('continues returning an explicit rest day for a genuinely empty schedule', async () => {
    const h = harness();
    h.rest();
    const response = await h.generate();
    expect(response.status).toBe(200);
    expect(object(response.jsonBody).restDay).toBe(true);
    expect(h.workouts).toHaveLength(0);
  });
});

describe('bounded optional coaching', () => {
  it('accepts valid display strings and preserves the deterministic exercise', async () => {
    const h = harness({ configured: true });
    await h.save();
    const response = await h.generate('Please use encouraging language.');
    expect(response.status).toBe(201);
    const workout = object(response.jsonBody);
    expect(workout.motivation).toBe('Ready when you are.');
    expect((workout.steps as Row[])[1].exerciseId).toBe('demo');
    expect((workout.steps as Row[])[1].aiTip).toBe('Move steadily.');
    expect(h.signals[0]).toBeInstanceOf(AbortSignal);
    const messages = h.calls[0].messages as Row[];
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).not.toContain('Please use encouraging language.');
    expect(messages[1].content).toContain('Please use encouraging language.');
    expect(renderToStaticMarkup(createElement('div', null, String(workout.motivation)))).toContain('Ready');
  });

  it.each([
    ['en', 'Exclude the demo exercise.'],
    ['ru', 'Уберите упражнение demo.'],
    ['lv', 'Izlaidiet vingrinājumu demo.'],
    ['es', 'Omite el ejercicio demo.'],
  ])('explicitly rejects structural requests in %s without saving', async (locale, note) => {
    const h = harness({
      configured: true, locale,
      content: JSON.stringify({ unsupportedAdjustment: true, motivation: '', tips: ['', '', ''] }),
    });
    await h.save();
    const response = await h.generate(note);
    expect(response.status).toBe(422);
    expect(object(response.jsonBody).code).toBe('unsupported_adjustment');
    expect(object(response.jsonBody).error).not.toMatch(/^error\./);
    if (locale !== 'en') expect(object(response.jsonBody).error).not.toContain('Coaching notes');
    expect(h.workouts).toHaveLength(0);
  });

  it('does not silently ignore a note when coaching is unavailable', async () => {
    const h = harness();
    await h.save();
    const response = await h.generate('Please use encouraging language.');
    expect(response.status).toBe(503);
    expect(h.workouts).toHaveLength(0);
  });

  it('keeps a note-free workout usable during a provider outage with an explicit status', async () => {
    const h = harness({ configured: true, providerError: true });
    await h.save();
    const response = await h.generate();
    expect(response.status).toBe(201);
    expect(object(response.jsonBody).coachingStatus).toBe('unavailable');
    expect(h.workouts).toHaveLength(1);
  });

  it.each([
    null,
    { motivation: null, tips: ['', 'tip', ''] },
    { motivation: { text: 'bad' }, tips: ['', 'tip', ''] },
    { motivation: 'ok', tips: ['', { text: 'bad' }, ''] },
    { motivation: 'ok', tips: null },
    { motivation: '', tips: ['', '', ''] },
    { motivation: '', tips: ['', '', ''], unsupportedAdjustment: true },
    { motivation: 'ok', tips: ['misaligned'] },
    { motivation: 'x'.repeat(401), tips: ['', 'tip', ''] },
    { motivation: 'ok', tips: ['', 'x'.repeat(241), ''] },
  ])('discards malformed coaching with an explicit fallback status: %j', async content => {
    const h = harness({ configured: true, content: JSON.stringify(content) });
    await h.save();
    const response = await h.generate();
    expect(response.status).toBe(201);
    const workout = object(response.jsonBody);
    expect(workout.coachingStatus).toBe('invalid_response');
    expect(workout.motivation).toBeUndefined();
    expect((workout.steps as Row[])[1].aiTip).toBeUndefined();
    expect(JSON.parse(String(h.workouts[0].data)).motivation).toBeUndefined();
  });

  it('rejects an incomplete response even if its JSON is valid', async () => {
    const h = harness({ configured: true, finishReason: 'length' });
    await h.save();
    expect(object((await h.generate()).jsonBody).coachingStatus).toBe('invalid_response');
  });

  it('requires a complete intent decision before accepting a note', async () => {
    const h = harness({
      configured: true, content: JSON.stringify({ motivation: 'ok', tips: ['', 'tip', ''] }),
    });
    await h.save();
    expect((await h.generate('Please encourage me.')).status).toBe(503);
    expect(h.workouts).toHaveLength(0);
  });

  it.each([
    { date: 'invalid' }, { date: '2026-02-30' }, { date: '2026-09-07', session: 'invalid' },
    { date: '2026-09-07', userNote: {} }, { date: '2026-09-07', userNote: 'a'.repeat(501) },
    { date: '2026-09-07', adjustments: ['demo'] },
  ])('rejects invalid or unsupported request fields before generation: %j', async input => {
    const h = harness({ configured: true });
    expect((await h.routes.generateWorkout(request(input))).status).toBe(400);
    expect(h.calls).toHaveLength(0);
    expect(h.workouts).toHaveLength(0);
  });
});

describe('exercise renderer', () => {
  it.each([ExerciseStepCard, TimedExerciseStep])('does not crash on an older persisted object-valued tip (%#)', component => {
    const step: ExerciseStep = {
      type: 'exercise', name: 'Demo', meta: 'Set 1', technique: 'Steady.',
      tempo: '2-1-2', planned: 2, rest: 30,
    };
    Object.assign(step, { aiTip: { text: 'invalid' } });
    expect(() => renderToStaticMarkup(createElement(component, {
      step, previousResults: [], onComplete() {},
    }))).not.toThrow();
  });

  it.each(['en', 'ru', 'lv', 'es'])('renders localized invalid-coaching feedback and valid text in %s', async language => {
    const i18n = createInstance();
    await i18n.init({ lng: language, resources: {
      en: { translation: en }, ru: { translation: ru }, lv: { translation: lv }, es: { translation: es },
    } });
    const bad = { motivation: '', coachingStatus: 'invalid_response' as const };
    Object.assign(bad, { motivation: { text: 'Invalid child' } });
    const render = (workout: Parameters<typeof WorkoutCoaching>[0]['workout']) => renderToStaticMarkup(
      createElement(I18nextProvider, { i18n }, createElement(WorkoutCoaching, { workout })),
    );
    expect(render(bad)).toContain('role="status"');
    expect(render(bad)).not.toContain('Invalid child');
    expect(render(bad)).toContain(i18n.t('workout.coachingUnavailable'));
    expect(render({ motivation: 'Keep it steady.', coachingStatus: 'added' })).toContain('Keep it steady.');
    expect(i18n.t('workout.noteHelp')).not.toBe('workout.noteHelp');
  });
});
