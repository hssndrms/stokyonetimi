import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Page, ModalState, MenuItem } from './types';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useInventory } from './hooks/useInventory';
import useLocalStorage from './hooks/useLocalStorage';
import { SunIcon, MoonIcon } from './components/icons';

import Sidebar, { DEFAULT_MENU_STRUCTURE, ALL_MENU_ITEMS } from './components/Sidebar';
import Modal from './components/Modal';
import DashboardPage from './pages/DashboardPage';
import StockOverviewPage from './pages/StockOverviewPage';
import WarehousesPage from './pages/WarehousesPage';
import WarehouseGroupsPage from './pages/WarehouseGroupsPage';
import ProductsPage from './pages/ProductsPage';
import ProductGroupsPage from './pages/ProductGroupsPage';
import UnitsPage from './pages/UnitsPage';
import AccountsPage from './pages/CustomersPage'; // Repurposed
import GeneralSettingsPage from './pages/SuppliersPage'; // Repurposed
import SettingsMenuPage from './pages/SettingsMenuPage';
import StockMovementReportPage from './pages/reports/StockMovementReportPage';
import CurrentStockReportPage from './pages/reports/CurrentStockReportPage';
import InventoryReportPage from './pages/reports/InventoryReportPage';
import StockLedgerReportPage from './pages/reports/StockLedgerReportPage';
import ProductionVouchersPage from './pages/ProductionVouchersPage';
import SetupPage from './pages/SetupPage';

declare var gsap: any;

const StaggeredEntry: React.FC<{ children: React.ReactNode; staggerKey: any; }> = ({ children, staggerKey }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || typeof gsap === 'undefined') return;
        
        const elements = Array.from(containerRef.current.children);
        if (elements.length === 0) return;

        gsap.killTweensOf(elements);

        gsap.set(elements, { autoAlpha: 0, y: -20 });

        gsap.to(elements, {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.08,
            ease: 'bounce.out'
        });

    }, [staggerKey]);

    return <div ref={containerRef} id="favorite-actions-bar" className="flex items-center gap-1">{children}</div>;
};

const ThemeToggleButton = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle-button p-3 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={theme === 'dark' ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
            title={theme === 'dark' ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
        >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
    );
};


const TopHeader: React.FC = () => {
    return (
        <header id="app-top-header" className="bg-slate-800 text-white h-16 flex-shrink-0 flex items-center justify-between px-6 z-20 shadow-md">
            <h1 className="app-title text-2xl font-bold">Stok Yönetimi</h1>
            <ThemeToggleButton />
        </header>
    );
};


const ContentHeader: React.FC<{
    toggleSidebar: () => void;
    isSidebarOpen: boolean;
    favorites: { id: string; label: string; icon: React.ReactNode }[];
    onFavoriteClick: (id: string) => void;
}> = ({ toggleSidebar, isSidebarOpen, favorites, onFavoriteClick }) => {
    const tooltip = isSidebarOpen ? 'Menüyü gizle' : 'Menüyü göster';
    const favoritesKey = favorites.map(f => f.id).join('-');
    return (
        <header id="content-header" className="bg-white dark:bg-slate-800 dark:border-b dark:border-slate-700 shadow-sm h-16 flex-shrink-0 flex items-center px-4 z-10">
            <button
                id="sidebar-toggle-button"
                onClick={toggleSidebar}
                className="p-3 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={tooltip}
                title={tooltip}
            >
                <i className={`fa-solid ${isSidebarOpen ? 'fa-ellipsis-vertical' : 'fa-ellipsis'} fa-lg`}></i>
            </button>
            <div className="flex items-center ml-4">
                 <StaggeredEntry staggerKey={favoritesKey}>
                    {favorites.map(fav => (
                        <button
                            key={fav.id}
                            id={`favorite-button-${fav.id}`}
                            onClick={() => onFavoriteClick(fav.id)}
                            className="favorite-action-button p-3 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label={fav.label}
                            title={fav.label}
                        >
                            {fav.icon}
                        </button>
                    ))}
                </StaggeredEntry>
            </div>
        </header>
    );
};

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('dashboard');
    const [modal, setModal] = useState<ModalState>({ type: null });
    const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage<boolean>('sidebarOpen', true);
    const [menuStructure, setMenuStructure] = useLocalStorage<MenuItem[]>('menuStructure', DEFAULT_MENU_STRUCTURE);
    const [favoriteOrder, setFavoriteOrder] = useLocalStorage<string[]>('favoriteOrder', ['stock-in', 'stock-out', 'stock-transfer', 'add-production-voucher']);
    const [forceShowSetup, setForceShowSetup] = useState(false);


    const inventoryData = useInventory();
    
    const onCloseModal = () => setModal({ type: null });

    const handleFavoriteClick = (id: string) => {
        if (id === 'stock-in') {
            setModal({ type: 'STOCK_IN' });
        } else if (id === 'stock-out') {
            setModal({ type: 'STOCK_OUT' });
        } else if (id === 'stock-transfer') {
            setModal({ type: 'STOCK_TRANSFER' });
        } else if (id === 'add-production-voucher') {
            setModal({ type: 'ADD_PRODUCTION_VOUCHER' });
        } else {
            const menuItem = ALL_MENU_ITEMS[id];
            if (menuItem && menuItem.page) {
                setPage(menuItem.page);
            }
        }
    };
    
    const favoriteItems = useMemo(() => {
        return favoriteOrder
            .map(id => {
                const item = ALL_MENU_ITEMS[id];
                return item ? { id, label: item.label, icon: item.icon } : null;
            })
            .filter((item): item is { id: string; label: string; icon: React.ReactNode; } => item !== null);
    }, [favoriteOrder]);

    const { loading, error, needsSetup, setupReason, fetchData } = inventoryData;

    if (forceShowSetup) {
        // When opening from settings, always show the SQL script ('tables' reason)
        return <SetupPage onCheckAgain={fetchData} reason={'tables'} onClose={() => setForceShowSetup(false)} loading={loading} />;
    }
    if (needsSetup) {
        // For initial setup flow, use the reason from the hook
        return <SetupPage onCheckAgain={fetchData} reason={setupReason} loading={loading} />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
                <div id="error-message-box" className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md max-w-lg">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Uygulama Hatası</h2>
                    <p className="text-slate-700 dark:text-slate-300">{error}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
                 <div id="loading-indicator" className="flex items-center gap-4">
                    <i className="fa-solid fa-spinner fa-spin fa-2x text-indigo-600 dark:text-indigo-400"></i>
                    <span className="text-xl text-slate-700 dark:text-slate-300">Veriler yükleniyor...</span>
                </div>
            </div>
        );
    }


    const renderPage = () => {
        const { products, stockItems, stockMovements, warehouses, shelves, units, productGroups, warehouseGroups, accounts, generalSettings } = inventoryData;
        const { handleDeleteWarehouse, handleDeleteShelf, handleDeleteProduct, handleDeleteProductGroup, handleDeleteWarehouseGroup, handleDeleteUnit, handleDeleteAccount, setGeneralSettings } = inventoryData;

        switch (page) {
            case 'dashboard': return <DashboardPage products={products} stockItems={stockItems} movements={stockMovements} productGroups={productGroups} setModal={setModal} />;
            case 'stock': return <StockOverviewPage products={products} stockItems={stockItems} warehouses={warehouses} shelves={shelves} units={units} />;
            case 'warehouses': return <WarehousesPage warehouses={warehouses} shelves={shelves} stockItems={stockItems} warehouseGroups={warehouseGroups} setModal={setModal} handleDeleteWarehouse={handleDeleteWarehouse} handleDeleteShelf={handleDeleteShelf} />;
            case 'warehouse-groups': return <WarehouseGroupsPage warehouseGroups={warehouseGroups} setModal={setModal} handleDeleteWarehouseGroup={handleDeleteWarehouseGroup} />;
            case 'products': return <ProductsPage products={products} units={units} productGroups={productGroups} setModal={setModal} handleDeleteProduct={handleDeleteProduct} />;
            case 'product-groups': return <ProductGroupsPage productGroups={productGroups} setModal={setModal} handleDeleteProductGroup={handleDeleteProductGroup} />;
            case 'units': return <UnitsPage units={units} setModal={setModal} handleDeleteUnit={handleDeleteUnit} />;
            case 'accounts': return <AccountsPage accounts={accounts} setModal={setModal} handleDeleteAccount={handleDeleteAccount} />;
            case 'production-vouchers': return <ProductionVouchersPage movements={stockMovements} products={products} warehouses={warehouses} shelves={shelves} units={units} setModal={setModal} generalSettings={generalSettings} />;
            case 'reports-movements':
                return <StockMovementReportPage {...{movements: stockMovements, products, warehouses, shelves, units, accounts, productGroups, setModal, generalSettings}} />;
            case 'reports-stock':
                return <CurrentStockReportPage {...{stockItems, products, warehouses, shelves, units, productGroups}} />;
            case 'reports-inventory':
                return <InventoryReportPage {...{movements: stockMovements, products, units, productGroups, warehouses, warehouseGroups, shelves}} />;
            case 'reports-stock-ledger':
                return <StockLedgerReportPage {...{movements: stockMovements, products, units, productGroups, warehouses, shelves, accounts, setModal}} />;
            case 'settings-menu': return <SettingsMenuPage currentStructure={menuStructure} onSave={setMenuStructure} favoriteOrder={favoriteOrder} onFavoriteOrderChange={setFavoriteOrder} />;
            case 'settings-general': return <GeneralSettingsPage settings={generalSettings} onSave={setGeneralSettings} onOpenSetup={() => setForceShowSetup(true)} />;
            default: return <div>Sayfa Bulunamadı</div>;
        }
    };

    return (
        <div id="app-container" className="flex flex-col h-screen font-sans">
            <TopHeader />
            <div id="app-body" className="flex flex-1 overflow-hidden">
                <Sidebar currentPage={page} setPage={setPage} isOpen={isSidebarOpen} menuStructure={menuStructure} />
                <div id="content-wrapper" className="flex-1 flex flex-col overflow-hidden">
                    <ContentHeader
                        isSidebarOpen={isSidebarOpen}
                        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                        favorites={favoriteItems}
                        onFavoriteClick={handleFavoriteClick}
                    />
                    <main id="main-content" className="flex-1 p-8 overflow-y-auto bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        {renderPage()}
                    </main>
                </div>
            </div>
            {modal.type && (
                <Modal 
                    state={modal} 
                    onClose={onCloseModal}
                    setModal={setModal}
                    {...inventoryData}
                />
            )}
        </div>
    );
};


const AppWrapper = () => (
    <ThemeProvider>
        <ToastProvider>
            <App />
        </ToastProvider>
    </ThemeProvider>
);

export default AppWrapper;