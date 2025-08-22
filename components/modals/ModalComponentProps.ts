
import { useInventory } from '../../hooks/useInventory';

export type ModalComponentProps<T = any> = {
    onClose: () => void;
    data?: T;
} & ReturnType<typeof useInventory>;
