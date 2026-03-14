import { useEffect, useRef } from "react";

type ModalProps = {
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
};

const CustomModal = ({ className = "", children, onClose }: ModalProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#E9EFF4CC] bg-opacity-[80%]">
      <div
        ref={ref}
        className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-xl bg-white py-8 ${className}`}
      >
        <main>{children}</main>
      </div>
    </div>
  );
};

export default CustomModal;
