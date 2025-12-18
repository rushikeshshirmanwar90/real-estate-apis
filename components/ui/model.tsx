"use client"
import {
  Dialog,
  DialogHeader,
  DialogContent,
} from "@/components/ui/dialog";

interface modelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Model: React.FC<modelProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const onChange = () => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent>
        <DialogHeader>
        </DialogHeader>
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default Model;
