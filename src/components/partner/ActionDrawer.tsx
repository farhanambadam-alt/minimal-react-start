import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { ReactNode } from 'react';

interface ActionDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

const ActionDrawer = ({ open, onClose, title, description, children }: ActionDrawerProps) => (
  <Drawer open={open} onOpenChange={v => !v && onClose()}>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{title}</DrawerTitle>
        {description && <DrawerDescription>{description}</DrawerDescription>}
      </DrawerHeader>
      <div className="px-4 pb-6">{children}</div>
    </DrawerContent>
  </Drawer>
);

export default ActionDrawer;
