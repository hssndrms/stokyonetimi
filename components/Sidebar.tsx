import React, { useState, useEffect, useMemo } from 'react';
import { Page, MenuItem } from '../types';
import { VERSION } from '../data/version';
import { 
    DashboardIcon, BoxIcon, WarehouseIcon, ArrowRightLeftIcon, DocumentChartBarIcon, 
    CubeIcon, UserGroupIcon, TruckIcon, RulerCombinedIcon, TagsIcon, LayerGroupIcon,
    ObjectGroupIcon, SettingsIcon, MenuListIcon, ArrowRightToBracketIcon, ArrowRightFromBracketIcon,
    SlidersIcon, DollyIcon, IndustryIcon, FileInvoiceIcon
} from './icons';

export const ALL_MENU_ITEMS: Record<string, { label: string; icon: React.ReactNode; page: Page | null }> = {
    'dashboard': { label: 'Anasayfa', icon: <DashboardIcon />, page: 'dashboard' },
    'stock': { label: 'Stok Durumu', icon: <BoxIcon />, page: 'stock' },
    'warehouses': { label: 'Depo & Raf', icon: <WarehouseIcon />, page: 'warehouses' },
    'warehouse-groups': { label: 'Depo Grupları', icon: <ObjectGroupIcon />, page: 'warehouse-groups' },
    'products': { label: 'Ürünler', icon: <CubeIcon />, page: 'products' },
    'product-groups': { label: 'Ürün Grupları', icon: <LayerGroupIcon />, page: 'product-groups' },
    'units': { label: 'Birimler', icon: <RulerCombinedIcon />, page: 'units' },
    'accounts': { label: 'Cariler', icon: <UserGroupIcon />, page: 'accounts' },
    'production-vouchers': { label: 'Üretim Fişleri', icon: <IndustryIcon />, page: 'production-vouchers' },
    'reports-movements': { label: 'Stok Hareket Raporu', icon: <ArrowRightLeftIcon />, page: 'reports-movements' },
    'reports-stock': { label: 'Mevcut Stok Raporu', icon: <BoxIcon />, page: 'reports-stock' },
    'reports-inventory': { label: 'Envanter Raporu', icon: <CubeIcon />, page: 'reports-inventory' },
    'reports-stock-ledger': { label: 'Stok Ekstresi', icon: <FileInvoiceIcon />, page: 'reports-stock-ledger' },
    'settings-menu': { label: 'Menü Düzenle', icon: <MenuListIcon />, page: 'settings-menu' },
    'settings-general': { label: 'Genel Ayarlar', icon: <SlidersIcon />, page: 'settings-general' },
    'stock-in': { label: 'Yeni Stok Girişi', icon: <ArrowRightToBracketIcon />, page: null },
    'stock-out': { label: 'Yeni Stok Çıkışı', icon: <ArrowRightFromBracketIcon />, page: null },
    'stock-transfer': { label: 'Yeni Transfer', icon: <DollyIcon />, page: null },
    'add-production-voucher': { label: 'Yeni Üretim Fişi', icon: <IndustryIcon />, page: null },
};

export const DEFAULT_MENU_STRUCTURE: MenuItem[] = [
    { id: 'dashboard', label: 'Anasayfa' },
    { id: 'stock', label: 'Stok Durumu' },
    {
        id: 'production',
        label: 'Üretim',
        children: [
            { id: 'production-vouchers', label: 'Üretim Fişleri' },
        ]
    },
    {
        id: 'definitions',
        label: 'Tanımlar',
        children: [
            {
                id: 'card-groups',
                label: 'Kart Grupları',
                children: [
                    { id: 'warehouse-groups', label: 'Depo Grupları' },
                    { id: 'product-groups', label: 'Ürün Grupları' },
                ]
            },
            { id: 'warehouses', label: 'Depo & Raf' },
            { id: 'products', label: 'Ürünler' },
            { id: 'units', label: 'Birimler'},
            { id: 'accounts', label: 'Cariler' },
        ]
    },
    {
        id: 'reports',
        label: 'Raporlar',
        children: [
            { id: 'reports-movements', label: 'Stok Hareket Raporu' },
            { id: 'reports-stock', label: 'Mevcut Stok Raporu' },
            { id: 'reports-inventory', label: 'Envanter Raporu' },
            { id: 'reports-stock-ledger', label: 'Stok Ekstresi' },
        ]
    },
    {
        id: 'settings',
        label: 'Ayarlar',
        children: [
            { id: 'settings-menu', label: 'Menü Düzenle' },
            { id: 'settings-general', label: 'Genel Ayarlar' },
        ]
    },
    {
        id: 'quick-actions',
        label: 'Hızlı İşlemler',
        children: [
            { id: 'stock-in', label: 'Yeni Stok Girişi' },
            { id: 'stock-out', label: 'Yeni Stok Çıkışı' },
            { id: 'stock-transfer', label: 'Yeni Transfer' },
            { id: 'add-production-voucher', label: 'Yeni Üretim Fişi' },
        ],
        hidden: true,
    }
];

export const getGroupIcon = (id: string): React.ReactNode => {
    switch(id) {
        case 'definitions': return <TagsIcon />;
        case 'card-groups': return <ObjectGroupIcon />;
        case 'reports': return <DocumentChartBarIcon />;
        case 'settings': return <SettingsIcon />;
        case 'production': return <IndustryIcon />;
        case 'quick-actions': return <i className="fa-solid fa-bolt fa-fw"></i>;
        default: return <LayerGroupIcon />;
    }
}

// Helper function to filter out hidden items recursively
const filterHiddenItems = (items: MenuItem[]): MenuItem[] => {
    if (!items) return [];
    return items
        .filter(item => !item.hidden)
        .map(item => {
            if (item.children) {
                return { ...item, children: filterHiddenItems(item.children) };
            }
            return item;
        });
};

const SubMenu: React.FC<{
    item: MenuItem;
    currentPage: Page;
    setPage: (page: Page) => void;
}> = ({ item, currentPage, setPage }) => {
    const getAllChildPages = (menuItem: MenuItem): string[] => {
        let pages: string[] = [];
        if (menuItem.children) {
            menuItem.children.forEach(child => {
                pages.push(child.id);
                pages = pages.concat(getAllChildPages(child));
            });
        }
        return pages;
    };

    const childPages = getAllChildPages(item);
    const isActive = childPages.includes(currentPage);
    const [isOpen, setIsOpen] = useState(isActive);

    useEffect(() => {
        if (isActive) {
            setIsOpen(true);
        }
    }, [isActive, currentPage]);

    return (
        <li className="submenu-container">
            <button
                id={`submenu-button-${item.id}`}
                onClick={() => setIsOpen(!isOpen)}
                className={`submenu-toggle-button w-full flex items-center justify-between gap-3 px-4 py-3 mb-1 rounded-lg transition-colors font-medium text-slate-300 hover:bg-slate-700 hover:text-white ${isActive ? 'bg-slate-700 text-white' : ''}`}
            >
                <div className="flex items-center gap-3">
                    {getGroupIcon(item.id)}
                    <span>{item.label}</span>
                </div>
                <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <ul className="submenu-list pl-4 py-1">
                    {item.children?.map(child => (
                        child.children ? (
                             <SubMenu key={child.id} item={child} currentPage={currentPage} setPage={setPage} />
                        ) : (
                        <li key={child.id} className="menu-item-container">
                            <a
                                href="#"
                                id={`menu-item-link-${child.id}`}
                                onClick={(e) => { e.preventDefault(); setPage(child.id as Page); }}
                                className={`menu-item-link flex items-center gap-3 px-4 py-2 mb-1 rounded-lg transition-colors font-medium text-sm text-slate-400 hover:bg-slate-700 hover:text-white ${currentPage === child.id ? 'bg-indigo-600 text-white' : ''}`}
                            >
                                {ALL_MENU_ITEMS[child.id]?.icon}
                                <span>{ALL_MENU_ITEMS[child.id]?.label || child.label}</span>
                            </a>
                        </li>
                        )
                    ))}
                </ul>
            )}
        </li>
    );
};

const Sidebar: React.FC<{ currentPage: Page; setPage: (page: Page) => void; isOpen: boolean; menuStructure: MenuItem[] }> = ({ currentPage, setPage, isOpen, menuStructure }) => {
    const visibleMenuStructure = useMemo(() => filterHiddenItems(menuStructure), [menuStructure]);
    
    return (
        <aside id="app-sidebar" className={`bg-slate-800 text-white flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'w-64' : 'w-0'}`}>
            <div className="w-64 h-full flex flex-col">
                <nav id="sidebar-nav" className="flex-1 px-4 py-6 overflow-y-auto">
                    <ul className="menu-list">
                         {visibleMenuStructure.map(item =>
                            item.children ? (
                                <SubMenu key={item.id} item={item} currentPage={currentPage} setPage={setPage} />
                            ) : (
                                <li key={item.id} className="menu-item-container">
                                    <a
                                        href="#"
                                        id={`menu-item-link-${item.id}`}
                                        onClick={(e) => { e.preventDefault(); setPage(item.id as Page); }}
                                        className={`menu-item-link flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-colors font-medium text-slate-300 hover:bg-slate-700 hover:text-white ${currentPage === item.id ? 'bg-indigo-600 text-white' : ''}`}
                                    >
                                        {ALL_MENU_ITEMS[item.id]?.icon}
                                        <span>{ALL_MENU_ITEMS[item.id]?.label || item.label}</span>
                                    </a>
                                </li>
                            )
                        )}
                    </ul>
                </nav>
                <div id="app-version-footer" className="p-4 text-center text-xs text-slate-500 border-t border-slate-700">
                    Versiyon: {VERSION}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;