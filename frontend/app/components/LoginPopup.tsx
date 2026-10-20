import { ReactNode, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose = () => null,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`modal ${className ?? ""}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="modal__close"
          aria-label="Close modal"
        >
          X
        </button>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}