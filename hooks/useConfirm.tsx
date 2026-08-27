"use client";

import { useState } from "react";

type ConfirmState =
  | { open: false }
  | { open: true; message: string; resolve: (value: boolean) => void };

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false });

  function confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve });
    });
  }

  function close(value: boolean) {
    setState((current) => {
      if (current.open) current.resolve(value);
      return { open: false };
    });
  }

  const dialog = state.open ? (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm action">
      <div className="modal-card">
        <p className="modal-message">{state.message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={() => close(true)} autoFocus>
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
