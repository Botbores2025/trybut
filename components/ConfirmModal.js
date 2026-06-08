"use client";

export default function ConfirmModal({ mensagem, onConfirmar, onCancelar }) {
  return (
    <div className="confirm-overlay" onClick={onCancelar}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-msg">{mensagem}</p>
        <div className="confirm-btns">
          <button className="confirm-btn cancelar" onClick={onCancelar}>
            cancelar
          </button>
          <button className="confirm-btn confirmar" onClick={onConfirmar}>
            confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
