import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const STORAGE_KEY = 'tom_training_logger_v4';

const plan = {
  workouts: [
    {
      day: 'Day 1', title: 'Heavy Bench + Upper', exercises: [
        { name: 'Bench Press (Barbell)', target: 'Warm-up, then 5 x 5', defaultWeight: 75, reps: 5, sets: 5, warmups: [{ weight: 60, reps: 8 }] },
        { name: 'Incline Dumbbell Press', target: '3 x 8-10', defaultWeight: 24, reps: 8, sets: 3, warmups: [] },
        { name: 'Chest Fly (Machine)', target: '3 x 10-12', defaultWeight: 79, reps: 10, sets: 3, warmups: [] },
        { name: 'Triceps Pressdown', target: '3 x 10-12', defaultWeight: 25, reps: 10, sets: 3, warmups: [] },
        { name: 'Sit-up', target: '3 x 15-25', defaultWeight: 0, reps: 20, sets: 3, warmups: [] }
      ]
    },
    {
      day: 'Day 2', title: 'Legs + Ski Strength', exercises: [
        { name: 'Squat or Leg Press', target: '4 x 6-8', defaultWeight: 80, reps: 6, sets: 4, warmups: [{ weight: 50, reps: 8 }] },
        { name: 'Romanian Deadlift', target: '3 x 8', defaultWeight: 60, reps: 8, sets: 3, warmups: [{ weight: 40, reps: 8 }] },
        { name: 'Walking Lunges', target: '3 x 10 each leg', defaultWeight: 16, reps: 10, sets: 3, warmups: [] },
        { name: 'Calf Raise', target: '3 x 12-15', defaultWeight: 40, reps: 12, sets: 3, warmups: [] },
        { name: 'Plank', target: '3 x 45-60 sec', defaultWeight: 0, reps: 45, sets: 3, warmups: [] }
      ]
    },
    {
      day: 'Day 3', title: 'Light Bench + Pull', exercises: [
        { name: 'Bench Press (Barbell)', target: '4 x 8', defaultWeight: 70, reps: 8, sets: 4, warmups: [{ weight: 60, reps: 8 }] },
        { name: 'Lat Pulldown', target: '4 x 8-10', defaultWeight: 55, reps: 8, sets: 4, warmups: [] },
        { name: 'Seated Row', target: '3 x 10', defaultWeight: 50, reps: 10, sets: 3, warmups: [] },
        { name: 'Dumbbell Shoulder Press', target: '3 x 8-10', defaultWeight: 18, reps: 8, sets: 3, warmups: [] },
        { name: 'Biceps Curl', target: '3 x 10-12', defaultWeight: 12, reps: 10, sets: 3, warmups: [] }
      ]
    },
    {
      day: 'Day 4', title: 'Arms + Ski Conditioning', exercises: [
        { name: 'Close Grip Bench', target: '3 x 8', defaultWeight: 60, reps: 8, sets: 3, warmups: [{ weight: 40, reps: 8 }] },
        { name: 'Cable Row', target: '3 x 10', defaultWeight: 50, reps: 10, sets: 3, warmups: [] },
        { name: 'Hammer Curl', target: '3 x 10', defaultWeight: 14, reps: 10, sets: 3, warmups: [] },
        { name: 'Dips or Assisted Dips', target: '3 x 8-12', defaultWeight: 0, reps: 8, sets: 3, warmups: [] },
        { name: 'Skierg', target: '10-20 min steady', defaultWeight: 0, reps: 10, sets: 1, warmups: [] }
      ]
    }
  ],
  runs: [
    { title: 'Run 1', target: 'Easy 10 km', type: 'Easy' },
    { title: 'Run 2', target: 'Easy 10 km + strides', type: 'Easy + strides' },
    { title: 'Run 3', target: 'Tempo / threshold', type: 'Tempo' },
    { title: 'Run 4', target: 'Long easy run', type: 'Long' }
  ]
};

function today() { return new Date().toISOString().slice(0, 10); }
function id() { return crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { sessions: [], runs: [] }; } catch { return { sessions: [], runs: [] }; } }
function save(sessions, runs) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, runs })); } catch {} }

function suggestNextWeight(exerciseName, defaultWeight, sessions) {
  const rows = sessions.flatMap(s => s.exercises || []).filter(e => e.exercise === exerciseName).flatMap(e => e.rows || [])
    .filter(r => r.type !== 'warmup' && r.done && Number(r.weight) > 0)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  if (!rows.length) return Number(defaultWeight || 0);
  const w = Number(rows[0].weight || 0);
  const n = exerciseName.toLowerCase();
  if (n.includes('bench')) return w + 2.5;
  if (w >= 30) return w + 5;
  return w + 1;
}

function makeRows(ex, sessions) {
  const main = suggestNextWeight(ex.name, ex.defaultWeight, sessions);
  const warmups = (ex.warmups || []).map((w, i) => ({ id: id(), type: 'warmup', label: i ? `Warm-up ${i+1}` : 'Warm-up', previous: `${w.weight}kg x ${w.reps}`, weight: w.weight, reps: w.reps, done: false, date: today() }));
  const sets = Array.from({ length: ex.sets }, (_, i) => ({ id: id(), type: 'work', label: `Set ${i+1}`, previous: `${main}kg x ${ex.reps}`, weight: main, reps: ex.reps, done: false, date: today() }));
  return [...warmups, ...sets];
}

function App() {
  const [tab, setTab] = useState('gym');
  const [activeWorkout, setActiveWorkout] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [rows, setRows] = useState({});
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => { const data = load(); setSessions(data.sessions || []); setRuns(data.runs || []); }, []);
  useEffect(() => { save(sessions, runs); }, [sessions, runs]);
  useEffect(() => {
    const next = {};
    plan.workouts[activeWorkout].exercises.forEach(ex => { next[ex.name] = makeRows(ex, sessions); });
    setRows(next);
  }, [activeWorkout, sessions.length]);

  const stats = useMemo(() => {
    const all = Object.values(rows).flat();
    const done = all.filter(r => r.done);
    return { sets: done.length, volume: done.reduce((s, r) => s + Number(r.weight || 0) * Number(r.reps || 0), 0) };
  }, [rows]);

  const workout = plan.workouts[activeWorkout];

  function updateRow(ex, rowId, field, value) {
    setRows(prev => ({ ...prev, [ex]: prev[ex].map(r => r.id === rowId ? { ...r, [field]: value } : r) }));
  }
  function toggle(ex, rowId) {
    setRows(prev => ({ ...prev, [ex]: prev[ex].map(r => r.id === rowId ? { ...r, done: !r.done, date: today() } : r) }));
  }
  function addSet(ex) {
    setRows(prev => {
      const current = prev[ex.name] || [];
      const last = [...current].reverse().find(r => r.type === 'work') || { weight: ex.defaultWeight, reps: ex.reps };
      const count = current.filter(r => r.type === 'work').length;
      return { ...prev, [ex.name]: [...current, { id: id(), type: 'work', label: `Set ${count+1}`, previous: `${last.weight}kg x ${last.reps}`, weight: last.weight, reps: last.reps, done: false, date: today() }] };
    });
  }
  function finish() {
    const session = { id: id(), date: today(), workout: workout.title, volume: stats.volume, sets: stats.sets, exercises: Object.entries(rows).map(([exercise, rows]) => ({ exercise, rows })) };
    setSessions(prev => [session, ...prev]);
    setSavedMsg('Workout saved');
    setTimeout(() => setSavedMsg(''), 1800);
  }
  function completeRun(run) {
    setRuns(prev => [{ id: id(), date: today(), ...run, completed: true, distance: run.type === 'Long' ? 12 : 10 }, ...prev]);
  }

  return <div className="app">
    <header className="top"><div><h1>Training Log</h1><p>Bench to 100kg + Engadin prep</p></div>{savedMsg && <span className="saved">{savedMsg}</span>}</header>
    <nav className="tabs">{['gym','runs','history'].map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>{t}</button>)}</nav>

    {tab === 'gym' && <main>
      <div className="chooser">{plan.workouts.map((w, i) => <button key={w.day} onClick={() => setActiveWorkout(i)} className={activeWorkout === i ? 'active' : ''}><b>{w.day}</b><small>{w.title}</small></button>)}</div>
      <section className="sessionHead"><div><b>{workout.day}: {workout.title}</b><small>Tap ticks as you complete each set</small></div><button onClick={finish}>Finish</button><div className="metrics"><span>Volume<br/><b>{stats.volume}kg</b></span><span>Sets<br/><b>{stats.sets}</b></span></div></section>
      {workout.exercises.map(ex => {
        const exRows = rows[ex.name] || [];
        const allDone = exRows.length > 0 && exRows.every(r => r.done);
        return <section className="exercise" key={ex.name}>
          <div className={`exHead ${allDone ? 'complete' : ''}`}><h2>{ex.name}</h2><p>{ex.target}</p></div>
          <div className="grid head"><span>Set</span><span>Previous</span><span>KG</span><span>Reps</span><span>✓</span></div>
          {exRows.map(r => <div key={r.id} className={`grid row ${r.done ? 'done' : ''}`}>
            <span className="label">{r.label}</span><span className="prev">{r.previous}</span>
            <input type="number" step="0.5" value={r.weight} onChange={e => updateRow(ex.name, r.id, 'weight', e.target.value)} />
            <input type="number" value={r.reps} onChange={e => updateRow(ex.name, r.id, 'reps', e.target.value)} />
            <button className="tick" onClick={() => toggle(ex.name, r.id)}>✓</button>
          </div>)}
          <button className="add" onClick={() => addSet(ex)}>＋ Add Set</button>
        </section>
      })}
    </main>}

    {tab === 'runs' && <main>{plan.runs.map(run => {
      const done = runs.some(r => r.title === run.title && r.date === today());
      return <section key={run.title} className={`run ${done ? 'complete' : ''}`}><div><h2>{run.title}: {run.type}</h2><p>{run.target}</p></div><button onClick={() => completeRun(run)}>{done ? 'Done ✓' : 'Complete'}</button></section>
    })}</main>}

    {tab === 'history' && <main><button className="danger" onClick={() => { if(confirm('Delete all saved logs?')) { setSessions([]); setRuns([]); }}}>Clear all</button>{[...sessions.map(s => ({...s, kind:'Gym'})), ...runs.map(r => ({...r, kind:'Run'}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(item => <section className="history" key={item.id}><b>{item.kind === 'Gym' ? item.workout : item.title}</b><p>{item.date} · {item.kind === 'Gym' ? `${item.sets} sets · ${item.volume}kg` : item.target}</p></section>)}</main>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
