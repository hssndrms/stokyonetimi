import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MenuItem } from '../types';
import { useToast } from '../context/ToastContext';
import { ALL_MENU_ITEMS, DEFAULT_MENU_STRUCTURE, getGroupIcon } from '../components/Sidebar';
import { TrashIcon, PencilIcon, PlusIcon, EyeIcon, EyeSlashIcon, StarIcon, StarOutlineIcon } from '../components/icons';
import { formInputClass, formLabelClass } from '../styles/common';

// Helper types
type DraggedItem = {
    item: MenuItem;
    sourcePath: number[];
};

type DropTarget = {
    path: number[];
    position: 'before' | 'after' | 'inside';
};

// Helper functions for immutable updates
const findItemByPath = (items: MenuItem[], path: number[]): MenuItem | undefined => {
    let current: any = { children: items };
    for (const index of path) {
        if (!current?.children?.[index]) return undefined;
        current = current.children[index];
    }
    return current;
};

const removeItemByPath = (items: MenuItem[], path: number[]): { newItems: MenuItem[], removedItem: MenuItem | null } => {
    let removedItem: MenuItem | null = null;
    const newItems = JSON.parse(JSON.stringify(items));
    
    const parentPath = path.slice(0, -1);
    const indexToRemove = path[path.length - 1];
    
    let parent: any = { children: newItems };
    for (const p of parentPath) {
        parent = parent.children[p];
    }

    if (parent && parent.children && parent.children[indexToRemove]) {
        [removedItem] = parent.children.splice(indexToRemove, 1);
    }
    
    return { newItems, removedItem };
};

const addItemByPath = (items: MenuItem[], path: number[], itemToAdd: MenuItem, position: 'before' | 'after' | 'inside'): MenuItem[] => {
    const newItems = JSON.parse(JSON.stringify(items));

    if (position === 'inside') {
        const parent = findItemByPath(newItems, path);
        if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(itemToAdd);
        }
        return newItems;
    }

    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    
    let parent: any = { children: newItems };
    for (const p of parentPath) {
        parent = parent.children[p];
    }

    if(parent && parent.children) {
        const insertIndex = position === 'before' ? index : index + 1;
        parent.children.splice(insertIndex, 0, itemToAdd);
    }

    return newItems;
};

const MenuItemComponent: React.FC<{
    item: MenuItem;
    path: number[];
    onDragStart: (e: React.DragEvent, item: MenuItem, path: number[]) => void;
    onDragOver: (e: React.DragEvent, path: number[]) => void;
    onDrop: (e: React.DragEvent, path: number[]) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    dropTarget?: DropTarget;
    onRename: (path: number[]) => void;
    onDelete: (path: number[]) => void;
    onToggleVisibility: (path: number[]) => void;
    onToggleFavorite: (path: number[]) => void;
    favoriteOrder: string[];
}> = ({ item, path, onDragStart, onDragOver, onDrop, onDragEnd, onDragLeave, dropTarget, onRename, onDelete, onToggleVisibility, onToggleFavorite, favoriteOrder }) => {

    const isGroup = !!item.children;
    const itemInfo = ALL_MENU_ITEMS[item.id];
    const isFavorite = favoriteOrder.includes(item.id);

    const showDropIndicator = (position: 'before' | 'after') => {
        if (!dropTarget) return false;
        return dropTarget.position === position && dropTarget.path.toString() === path.toString();
    };
    
    const isHidden = !!item.hidden;

    return (
        <div data-path={path.join('-')} className={isHidden ? 'opacity-50' : ''}>
            {showDropIndicator('before') && <div className="drop-indicator"></div>}
            <div
                draggable
                onDragStart={(e) => onDragStart(e, item, path)}
                onDragOver={(e) => onDragOver(e, path)}
                onDrop={(e) => onDrop(e, path)}
                onDragEnd={onDragEnd}
                onDragLeave={onDragLeave}
                className={`draggable-item flex items-center gap-3 p-3 mb-2 rounded-md transition-colors font-medium text-sm border ${isGroup ? 'bg-slate-100' : 'bg-white'}`}
            >
                <div className="flex items-center gap-3 flex-grow">
                    {isGroup ? getGroupIcon(item.id) : itemInfo?.icon}
                    <span>{isGroup ? item.label : (itemInfo?.label || item.label)}</span>
                </div>
                <div className="flex items-center gap-3">
                     {!isGroup && (
                        <button onClick={() => onToggleFavorite(path)} className={isFavorite ? 'text-amber-500 hover:text-amber-600' : 'text-slate-500 hover:text-slate-800'} title="Favorilere Ekle/Kaldır">
                            {isFavorite ? <StarIcon /> : <StarOutlineIcon />}
                        </button>
                    )}
                    <button onClick={() => onToggleVisibility(path)} className="text-slate-500 hover:text-slate-800" title={isHidden ? 'Göster' : 'Gizle'}>
                        {isHidden ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                    {isGroup && (
                        <>
                            <button onClick={() => onRename(path)} className="text-blue-600 hover:text-blue-800" title="Yeniden Adlandır"><PencilIcon /></button>
                            <button onClick={() => onDelete(path)} className="text-red-600 hover:text-red-800" title="Grubu Sil"><TrashIcon /></button>
                        </>
                    )}
                </div>
            </div>
            {isGroup && (
                <div 
                    className={`ml-6 pl-4 border-l-2 group-drop-zone ${dropTarget?.path.toString() === path.toString() && dropTarget?.position === 'inside' ? 'drag-over-group' : ''}`}
                    onDragOver={(e) => onDragOver(e, path)}
                    onDrop={(e) => onDrop(e, path)}
                >
                    {item.children!.map((child, index) => (
                        <MenuItemComponent
                            key={child.id}
                            item={child}
                            path={[...path, index]}
                            {...{ onDragStart, onDragOver, onDrop, onDragEnd, onDragLeave, dropTarget, onRename, onDelete, onToggleVisibility, onToggleFavorite, favoriteOrder }}
                        />
                    ))}
                     {item.children?.length === 0 && <div className="text-xs text-slate-400 p-4 text-center">Gruba öğe sürükleyin</div>}
                </div>
            )}
            {showDropIndicator('after') && <div className="drop-indicator"></div>}
        </div>
    );
};

const QuickActionItem: React.FC<{
    item: MenuItem;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
}> = ({ item, isFavorite, onToggleFavorite }) => {
    const itemInfo = ALL_MENU_ITEMS[item.id];
    if (!itemInfo) return null;

    return (
        <div className="flex items-center gap-3 p-3 mb-2 rounded-md font-medium text-sm border bg-slate-50">
            <div className="flex items-center gap-3 flex-grow">
                {itemInfo.icon}
                <span>{itemInfo.label}</span>
            </div>
            <button onClick={() => onToggleFavorite(item.id)} className={isFavorite ? 'text-amber-500 hover:text-amber-600' : 'text-slate-500 hover:text-slate-800'} title="Favorilere Ekle/Kaldır">
                {isFavorite ? <StarIcon /> : <StarOutlineIcon />}
            </button>
        </div>
    );
};

const FavoriteItemComponent: React.FC<{
    item: { id: string, label: string, icon: React.ReactNode };
    index: number;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
}> = ({ item, index, onDragStart, onDragEnter, onDragEnd }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            data-fav-index={index}
            className="draggable-item flex items-center gap-3 p-3 mb-2 rounded-md font-medium text-sm border bg-white"
        >
            {item.icon}
            <span>{item.label}</span>
        </div>
    );
};


const PromptModal: React.FC<{
    title: string;
    label: string;
    initialValue: string;
    onConfirm: (value: string) => void;
    onClose: () => void;
}> = ({ title, label, initialValue, onConfirm, onClose }) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(value);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="prompt-input" className={formLabelClass}>{label}</label>
                    <input
                        ref={inputRef}
                        type="text"
                        id="prompt-input"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className={formInputClass}
                    />
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">İptal</button>
                        <button type="submit" className="font-semibold py-2 px-4 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700">Onayla</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConfirmModal: React.FC<{
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}> = ({ message, onConfirm, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <p className="text-slate-700 mb-6">{message}</p>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">Hayır</button>
                    <button
                        type="button"
                        onClick={() => { onConfirm(); onClose(); }}
                        className="font-semibold py-2 px-4 rounded-md transition-colors bg-red-600 text-white hover:bg-red-700"
                    >
                        Evet
                    </button>
                </div>
            </div>
        </div>
    );
};


const SettingsMenuPage: React.FC<{
    currentStructure: MenuItem[];
    onSave: (newStructure: MenuItem[]) => void;
    favoriteOrder: string[];
    onFavoriteOrderChange: (newOrder: string[]) => void;
}> = ({ currentStructure, onSave, favoriteOrder, onFavoriteOrderChange }) => {
    const [menuStructure, setMenuStructure] = useState<MenuItem[]>([]);
    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [promptInfo, setPromptInfo] = useState<{ title: string; label: string; initialValue: string; onConfirm: (value: string) => void; } | null>(null);
    const [confirmInfo, setConfirmInfo] = useState<{ message: string; onConfirm: () => void; } | null>(null);
    const [draggedFavIndex, setDraggedFavIndex] = useState<number | null>(null);

    const { addToast } = useToast();
    
    const quickActionItems = useMemo(() => {
        return DEFAULT_MENU_STRUCTURE.find(item => item.id === 'quick-actions')?.children || [];
    }, []);

    useEffect(() => {
        const editableStructure = currentStructure.filter(item => item.id !== 'settings' && item.id !== 'quick-actions');
        setMenuStructure(JSON.parse(JSON.stringify(editableStructure)));
    }, [currentStructure]);

    const handleDragStart = (e: React.DragEvent, item: MenuItem, sourcePath: number[]) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        setDraggedItem({ item, sourcePath });
        setTimeout(() => { (e.target as HTMLElement).closest('[data-path]')?.classList.add('dragging') }, 0);
    };

    const handleDragOver = (e: React.DragEvent, path: number[]) => {
        e.preventDefault();
        if (!draggedItem) return;

        const targetElement = (e.currentTarget as HTMLElement);

        if (targetElement.classList.contains('group-drop-zone')) {
            if (draggedItem.item.children && path.toString().startsWith(draggedItem.sourcePath.toString())) {
                setDropTarget(null);
                return;
            }
            const childElements = Array.from(targetElement.children).filter(el => el.hasAttribute('data-path'));
            if (childElements.length === 0) {
                setDropTarget({ path, position: 'inside' });
                return;
            }
            let nextChild = null;
            for(const child of childElements) {
                const childRect = child.getBoundingClientRect();
                if (e.clientY < childRect.top + childRect.height / 2) {
                    nextChild = child;
                    break;
                }
            }

            if (nextChild) {
                const childPath = nextChild.getAttribute('data-path')!.split('-').map(Number);
                setDropTarget({ path: childPath, position: 'before' });
            } else {
                const lastChild = childElements[childElements.length - 1];
                const childPath = lastChild.getAttribute('data-path')!.split('-').map(Number);
                setDropTarget({ path: childPath, position: 'after' });
            }
            return;
        }

        const rect = targetElement.getBoundingClientRect();
        const y = e.clientY - rect.top;

        const targetItem = findItemByPath(menuStructure, path);
        const isGroup = !!targetItem?.children;
        
        if (isGroup) {
            if (draggedItem.item.children && path.toString().startsWith(draggedItem.sourcePath.toString())) {
                setDropTarget(null);
                return;
            }
            if (y < rect.height * 0.25) setDropTarget({ path, position: 'before' });
            else if (y > rect.height * 0.75) setDropTarget({ path, position: 'after' });
            else setDropTarget({ path, position: 'inside' });
        } else {
            if (y < rect.height / 2) setDropTarget({ path, position: 'before' });
            else setDropTarget({ path, position: 'after' });
        }
        targetElement.classList.add('drag-over');
    };
    
    const handleDrop = (e: React.DragEvent, path: number[]) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedItem || !dropTarget) {
            handleDragEnd(e);
            return;
        }

        const { newItems, removedItem } = removeItemByPath(menuStructure, draggedItem.sourcePath);
        
        if (removedItem) {
            const finalItems = addItemByPath(newItems, dropTarget.path, removedItem, dropTarget.position);
            setMenuStructure(finalItems);
        }
        
        handleDragEnd(e);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        setDraggedItem(null);
        setDropTarget(null);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).classList.remove('drag-over');
    };
    
    const handleDropOnZone = (e: React.DragEvent) => {
        e.preventDefault();
        if(!draggedItem || (draggedItem.sourcePath.length === 1)) return; // Already a top-level item

        const { newItems, removedItem } = removeItemByPath(menuStructure, draggedItem.sourcePath);
        if (removedItem) {
            newItems.push(removedItem);
            setMenuStructure(newItems);
        }
        handleDragEnd(e);
    };

    const handleAddGroup = () => {
        setPromptInfo({
            title: 'Yeni Grup Ekle',
            label: 'Grup Adı',
            initialValue: '',
            onConfirm: (groupName) => {
                if (groupName && groupName.trim() !== '') {
                    setMenuStructure(prev => [...prev, {
                        id: `group_${new Date().getTime()}`,
                        label: groupName.trim(),
                        children: []
                    }]);
                } else {
                    addToast('Grup adı boş olamaz.', 'error');
                }
            }
        });
    };

    const handleRenameGroup = (path: number[]) => {
        const item = findItemByPath(menuStructure, path);
        if (!item) return;

        setPromptInfo({
            title: 'Grubu Yeniden Adlandır',
            label: 'Yeni Grup Adı',
            initialValue: item.label,
            onConfirm: (newName) => {
                if (newName && newName.trim() !== '') {
                    const newStructure = JSON.parse(JSON.stringify(menuStructure));
                    const itemToUpdate = findItemByPath(newStructure, path);
                    if (itemToUpdate) {
                        itemToUpdate.label = newName.trim();
                        setMenuStructure(newStructure);
                    }
                } else {
                    addToast('Grup adı boş olamaz.', 'error');
                }
            }
        });
    };

    const handleDeleteGroup = (path: number[]) => {
        const group = findItemByPath(menuStructure, path);
        if (!group) return;

        if (group.children && group.children.length > 0) {
            addToast('İçi dolu bir grubu silemezsiniz. Lütfen önce içindeki öğeleri taşıyın.', 'error');
            return;
        }

        setConfirmInfo({
            message: `"${group.label}" grubunu silmek istediğinizden emin misiniz?`,
            onConfirm: () => {
                const { newItems } = removeItemByPath(menuStructure, path);
                setMenuStructure(newItems);
            }
        });
    };

    const handleToggleVisibility = (path: number[]) => {
        const newStructure = JSON.parse(JSON.stringify(menuStructure));
        const item = findItemByPath(newStructure, path);
        if (item) {
            item.hidden = !item.hidden;
        }
        setMenuStructure(newStructure);
    };
    
    const handleSave = () => {
        const settingsGroup = DEFAULT_MENU_STRUCTURE.find(item => item.id === 'settings');
        const quickActionsGroup = DEFAULT_MENU_STRUCTURE.find(item => item.id === 'quick-actions');
        let finalStructure = [...menuStructure];
        
        if (settingsGroup) finalStructure.push(settingsGroup);
        if (quickActionsGroup) finalStructure.push(quickActionsGroup);
        
        onSave(finalStructure);
        addToast('Menü yapısı başarıyla kaydedildi.', 'success');
    };
    
    const handleReset = () => {
        setConfirmInfo({
            message: "Menü yapısını varsayılan ayarlara sıfırlamak istediğinizden emin misiniz? Kaydedilmemiş değişiklikleriniz kaybolacak.",
            onConfirm: () => {
                const editableDefault = DEFAULT_MENU_STRUCTURE.filter(item => item.id !== 'settings' && item.id !== 'quick-actions');
                setMenuStructure(JSON.parse(JSON.stringify(editableDefault)));
                onFavoriteOrderChange([]);
                addToast('Menü varsayılan ayarlara sıfırlandı. Değişiklikleri kalıcı yapmak için kaydetmeyi unutmayın.', 'info');
            }
        });
    }

    const handleToggleFavorite = (path: number[]) => {
        const item = findItemByPath(menuStructure, path);
        if (item) {
            const isCurrentlyFavorite = favoriteOrder.includes(item.id);
            if (!isCurrentlyFavorite) {
                onFavoriteOrderChange([...favoriteOrder, item.id]);
            } else {
                onFavoriteOrderChange(favoriteOrder.filter(id => id !== item.id));
            }
        }
    };
    
    const handleQuickActionFavoriteToggle = (id: string) => {
        const isCurrentlyFavorite = favoriteOrder.includes(id);
        if (!isCurrentlyFavorite) {
            onFavoriteOrderChange([...favoriteOrder, id]);
        } else {
            onFavoriteOrderChange(favoriteOrder.filter(favId => favId !== id));
        }
    };

    const favoritesList = favoriteOrder.map(id => {
        const item = ALL_MENU_ITEMS[id];
        return item ? { id, label: item.label, icon: item.icon } : null;
    }).filter(Boolean) as { id: string, label: string, icon: React.ReactNode }[];

    // Drag-n-drop for favorites list
    const handleFavDragStart = (e: React.DragEvent, index: number) => {
        setDraggedFavIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { (e.target as HTMLElement).closest('[data-fav-index]')?.classList.add('dragging') }, 0);
    };

    const handleFavDragEnter = (e: React.DragEvent, enterIndex: number) => {
        e.preventDefault();
        if (draggedFavIndex === null || draggedFavIndex === enterIndex) return;

        const newOrder = [...favoriteOrder];
        const [movedItem] = newOrder.splice(draggedFavIndex, 1);
        newOrder.splice(enterIndex, 0, movedItem);

        setDraggedFavIndex(enterIndex);
        onFavoriteOrderChange(newOrder);
    };

    const handleFavDragEnd = (e: React.DragEvent) => {
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        setDraggedFavIndex(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Menü Düzenle</h1>
                <div className="flex gap-4">
                    <button onClick={handleReset} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">Sıfırla</button>
                    <button onClick={handleSave} className="font-semibold py-2 px-4 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700">Kaydet</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow border">
                    <div className="flex justify-between items-center pb-4 border-b mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Menü Yapısı</h2>
                        <button onClick={handleAddGroup} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                           <PlusIcon /> Grup Ekle
                        </button>
                    </div>
                    <div className="min-h-[300px] p-2 drop-zone" onDragOver={e => e.preventDefault()} onDrop={handleDropOnZone}>
                        {menuStructure.map((item, index) => (
                           <MenuItemComponent
                                key={`${item.id}-${index}`}
                                item={item}
                                path={[index]}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onDragEnd={handleDragEnd}
                                onDragLeave={handleDragLeave}
                                dropTarget={dropTarget}
                                onRename={handleRenameGroup}
                                onDelete={handleDeleteGroup}
                                onToggleVisibility={handleToggleVisibility}
                                onToggleFavorite={handleToggleFavorite}
                                favoriteOrder={favoriteOrder}
                           />
                        ))}
                        {menuStructure.length === 0 && (
                            <div className="text-center text-slate-500 py-10">
                                Menü boş. Başlamak için bir grup ekleyin.
                            </div>
                        )}
                    </div>
                    <div className="mt-6 pt-4 border-t">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Hızlı İşlemler</h3>
                        <div>
                            {quickActionItems.map(item => (
                                <QuickActionItem
                                    key={item.id}
                                    item={item}
                                    isFavorite={favoriteOrder.includes(item.id)}
                                    onToggleFavorite={handleQuickActionFavoriteToggle}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                 <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-xl font-bold text-slate-800 pb-4 border-b mb-4">Favoriler Sıralaması</h2>
                    <div className="min-h-[300px] p-2">
                        {favoritesList.map((fav, index) => (
                           <FavoriteItemComponent
                                key={fav.id}
                                item={fav}
                                index={index}
                                onDragStart={handleFavDragStart}
                                onDragEnter={handleFavDragEnter}
                                onDragEnd={handleFavDragEnd}
                           />
                        ))}
                        {favoritesList.length === 0 && (
                            <div className="text-center text-slate-500 py-10">
                                Favori öğe yok. Menüden eklemek için yıldız ikonuna tıklayın.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {promptInfo && <PromptModal {...promptInfo} onClose={() => setPromptInfo(null)} />}
            {confirmInfo && <ConfirmModal {...confirmInfo} onClose={() => setConfirmInfo(null)} />}
        </div>
    );
};

export default SettingsMenuPage;