import React, { useState } from 'react';

const HELP_EMAIL = 'components@tmforum.org';

// Rendered once in App.jsx's persistent header, so it's present on every
// screen (start screen, every wizard step, Setup instructions) rather than
// duplicated per step.
export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="help-anchor">
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
