import React, { useEffect, useRef, useState } from 'react';

const HELP_EMAIL = 'components@tmforum.org';

// Rendered once in App.jsx's persistent header, so it's present on every
// screen (start screen, every wizard step, Setup instructions) rather than
// duplicated per step.
export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  // Closes the popover on a click anywhere outside it (including the Help
  // button itself is "inside" - anchorRef wraps both - so this only ever
  // fires for genuinely outside clicks, never fighting the button's own
  // open/close toggle). Only listens while actually open, matching the
  // native <select>/<datalist> dropdowns elsewhere in the app, which the
  // browser already closes on outside click with no code needed here.
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="help-anchor" ref={anchorRef}>
      <button type="button" className="help" onClick={() => setOpen((o) => !o)}>Help</button>
      {open && (
        <div className="help-box">
          <p>
            For assistance please eMail <a href={`mailto:${HELP_EMAIL}`}>{HELP_EMAIL}</a> with a note
            and, if appropriate, a screenshot of the issue.
          </p>
          <button type="button" className="ghost" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
