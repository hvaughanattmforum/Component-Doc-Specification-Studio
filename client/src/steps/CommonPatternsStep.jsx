import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// Mirrors the server's compareVersions (server/index.js) so a too-old SID
// version can be flagged in the browser before a save round-trip ever
// happens - see MIN_SID_VERSION below for why v26.0 is the floor.
function compareVersions(a, b) {
  const toParts = (v) => v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pa = toParts(a);
  const pb = toParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// The SID reference framework was overhauled in v26.0 - every link recorded
// in docs/Common_Links/ has already been confirmed to resolve identically in
// sid_v26.0.json (see each file's "Version note"), so no cell here should
// point at an earlier SID version going forward.
const MIN_SID_VERSION = 'v26.0';

function oldSidVersionsIn(value) {
  const tokens = (value || '').match(/\bv\d+(?:\.\d+)*\b/gi) || [];
  return tokens.filter((t) => compareVersions(t, MIN_SID_VERSION) < 0);
}

function orderedPairKey(a, b) {
  const left = (a || '').trim().toLowerCase();
  const right = (b || '').trim().toLowerCase();
  if (!left || !right) return null;
  return `${left}||${right}`;
}

// One editable link table backing a docs/Common_Links/*.md file. Modeled on
// LinksStep.jsx's LinksPanel, but these files aren't scoped to a single
// component (no dirName), so there's no "available once saved" gate, and
// every field flagged in versionFields is checked against MIN_SID_VERSION -
// a row with an old SID version blocks saving the whole file, same as an
// unresolved duplicate pair.
function CommonLinksPanel({ title, helpText, fields, blankRow, pairKeyFn, versionFields, getApi, saveApi }) {
  const [data, setData] = useState(null); // { exists, heading, notesBefore, notesAfter, links }
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ok, error? }
  const [activeRow, setActiveRow] = useState(null);

  useEffect(() => {
    setData(null);
    setResult(null);
    getApi().then((d) => setData(d)).catch((err) => setResult({ ok: false, error: err.message }));
  }, []);

  if (!data) {
    return (
      <div className="panel panel-white">
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <div className="hint">Loading...</div>
      </div>
    );
  }

  const updateRow = (i, field, value) => {
    const links = data.links.slice();
    links[i] = { ...links[i], [field]: value };
    setData({ ...data, links });
  };
  const addRow = () => setData({ ...data, links: [...data.links, { ...blankRow }] });
  const removeRow = (i) => setData({ ...data, links: data.links.filter((_, idx) => idx !== i) });

  const pairKeys = pairKeyFn ? data.links.map(pairKeyFn) : [];
  const duplicateRows = new Set();
  pairKeys.forEach((k, i) => {
    if (k === null) return;
    const firstIdx = pairKeys.indexOf(k);
    if (firstIdx !== i) { duplicateRows.add(i); duplicateRows.add(firstIdx); }
  });

  const rowVersionIssues = data.links.map((row) => (versionFields || [])
    .map((f) => ({ field: f, tokens: oldSidVersionsIn(row[f]) }))
    .filter((issue) => issue.tokens.length > 0));
  const hasVersionIssues = rowVersionIssues.some((issues) => issues.length > 0);

  const save = async (rowIndex) => {
    if (duplicateRows.size > 0 || hasVersionIssues) return;
    setActiveRow(rowIndex ?? null);
    setSaving(true);
    setResult(null);
    try {
      const res = await saveApi({
        heading: data.heading,
        notesBefore: data.notesBefore,
        notesAfter: data.notesAfter,
        links: data.links,
      });
      if (res.ok) {
        setResult({ ok: true, path: res.path });
        setData({ ...data, exists: true });
      } else {
        setResult({ ok: false, error: res.error || 'Save failed' });
      }
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel panel-white">
      <h3 style={{ marginTop: 0 }}>{title} <span className="hint">{data.heading}</span></h3>
      <p className="hint">{helpText}</p>

      <div className="card-list">
        {data.links.map((row, i) => {
          const isDuplicate = duplicateRows.has(i);
          const versionIssues = rowVersionIssues[i];
          const isInvalid = isDuplicate || versionIssues.length > 0;
          const isActive = activeRow === i;
          return (
            <div className="card" key={i} style={{ paddingTop: 14, ...(isInvalid ? { borderColor: 'var(--danger)' } : null) }}>
              {isDuplicate && (
                <p className="hint" style={{ color: 'var(--danger)' }}>
                  This pair is already captured by another row - each relationship should appear once.
                </p>
              )}
              {versionIssues.map((issue) => (
                <p className="hint" style={{ color: 'var(--danger)' }} key={issue.field}>
                  {fields.find((f) => f.key === issue.field)?.label || issue.field} references {issue.tokens.join(', ')} &mdash; only {MIN_SID_VERSION} or later is allowed.
                </p>
              ))}
              <div className="row">
                {fields.map((f) => (
                  <div className="field" key={f.key}>
                    <label>{f.label}</label>
                    <input type="text" value={row[f.key]} onChange={(e) => updateRow(i, f.key, e.target.value)} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" className="save" onClick={() => save(i)} disabled={saving || isInvalid}>
                  {saving && isActive ? 'Saving...' : 'Save'}
                </button>
                {isActive && result?.ok && <span className="hint" style={{ color: 'var(--ok)' }}>Saved.</span>}
                {isActive && result?.error && <span className="hint" style={{ color: 'var(--danger)' }}>{result.error}</span>}
                {isInvalid && <span className="hint" style={{ color: 'var(--danger)' }}>Resolve the issue above to save.</span>}
                <button type="button" className="remove" onClick={() => removeRow(i)} style={{ marginLeft: 'auto' }}>Remove</button>
              </div>
            </div>
          );
        })}
        <button type="button" className="save" onClick={addRow}>+ Add link</button>
        {data.links.length === 0 && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="save" onClick={() => save(null)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <span className="hint">No link rows yet.</span>
            {activeRow === null && result?.ok && <span className="hint" style={{ color: 'var(--ok)' }}>Saved.</span>}
            {activeRow === null && result?.error && <span className="hint" style={{ color: 'var(--danger)' }}>{result.error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// Editor for docs/Common_Links/Common_SID_SID_Links.md - the consolidated,
// cross-component list of direct SID-ABE-to-SID-ABE links (as opposed to the
// per-component SID-SID links edited on the Links step).
export function CommonSidSidLinksStep() {
  return (
    <CommonLinksPanel
      title={<>Common SID&ndash;SID links</>}
      helpText="Consolidated SID ABE-to-SID ABE links drawn directly between two SID entities on a component's 2.3 eTOM L2 - SID ABEs links diagram, across all components. Backs docs/Common_Links/Common_SID_SID_Links.md."
      getApi={api.commonSidSidLinks}
      saveApi={api.saveCommonSidSidLinks}
      blankRow={{ sourceSID: '', targetSID: '', direction: 'bidirectional', yamlSource: '', yamlTarget: '' }}
      pairKeyFn={(row) => orderedPairKey(row.yamlSource || row.sourceSID, row.yamlTarget || row.targetSID)}
      versionFields={['yamlSource', 'yamlTarget']}
      fields={[
        { key: 'sourceSID', label: 'Source SID ABE' },
        { key: 'targetSID', label: 'Target SID ABE' },
        { key: 'direction', label: 'Direction' },
        { key: 'yamlSource', label: 'YAML source' },
        { key: 'yamlTarget', label: 'YAML target' },
      ]}
    />
  );
}

// Editor for docs/Common_Links/Common_Component_SID_owner_Links.md - which
// component box a SID ABE is drawn under when it isn't its own. Rows can
// legitimately repeat the same Display SID under different components (see
// the file's own notes), so unlike the SID-SID panel above, no pairKeyFn/
// duplicate check is applied here.
export function CommonComponentSidOwnerStep() {
  return (
    <CommonLinksPanel
      title={<>Common Component&ndash;SID owner links</>}
      helpText="Consolidated cross-component 'which component box does this SID ABE sit under' links, across all components. Backs docs/Common_Links/Common_Component_SID_owner_Links.md."
      getApi={api.commonComponentSidOwnerLinks}
      saveApi={api.saveCommonComponentSidOwnerLinks}
      blankRow={{ displaySID: '', component: '', sidElement: '' }}
      versionFields={['sidElement']}
      fields={[
        { key: 'displaySID', label: 'Display SID' },
        { key: 'component', label: 'Depicted under component' },
        { key: 'sidElement', label: 'SID element as present in the YAML file' },
      ]}
    />
  );
}
