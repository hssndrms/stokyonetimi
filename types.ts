export interface Warehouse {
  id: string;
  name: string;
  code: string;
  group_id: string;
}

export interface Shelf {
  id: string;
  name:string;
  warehouse_id: string;
  code: string;
}

export interface WarehouseGroup {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string; // e.g., Adet, Metre, Kilogram
  abbreviation: string; // e.g., adt, m, kg
}

export interface ProductGroup {
  id: string;
  name: string;
  sku_prefix: string;
  sku_length: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  unit_id: string;
  group_id: string;
}

export type AccountType = 'customer' | 'supplier';

export interface Account {
  id: string;
  name: string;
  code: string;
  type: AccountType;
  phone?: string;
  email?: string;
  address?: string;
}

export interface GeneralSettings {
    customer_code_prefix: string;
    customer_code_length: number;
    supplier_code_prefix: string;
    supplier_code_length: number;
    stock_in_prefix: string;
    stock_in_length: number;
    stock_out_prefix: string;
    stock_out_length: number;
    stock_transfer_prefix: string;
    stock_transfer_length: number;
    production_prefix: string;
    production_length: number;
}


export interface StockItem {
  product_id: string;
  warehouse_id: string;
  shelf_id: string | null;
  quantity: number;
}

export type TransactionType = 'STANDARD' | 'TRANSFER' | 'PRODUCTION';

export interface StockMovement {
  id: string;
  voucher_number: string;
  product_id: string;
  quantity: number;
  warehouse_id: string;
  shelf_id: string | null;
  type: 'IN' | 'OUT';
  transaction_type: TransactionType;
  date: string; // ISO 8601 format
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
  source_or_destination: string;
  notes?: string;
}

export type Page = 
  | 'dashboard' 
  | 'stock' 
  | 'products' 
  | 'product-groups'
  | 'warehouses' 
  | 'warehouse-groups'
  | 'accounts'
  | 'units'
  | 'production-vouchers'
  | 'reports-movements'
  | 'reports-stock'
  | 'reports-inventory'
  | 'settings-menu'
  | 'settings-general';

export type ModalType = 
  | 'ADD_WAREHOUSE' 
  | 'EDIT_WAREHOUSE' 
  | 'ADD_SHELF' 
  | 'EDIT_SHELF'
  | 'ADD_PRODUCT'
  | 'EDIT_PRODUCT'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'EDIT_STOCK_VOUCHER'
  | 'STOCK_TRANSFER'
  | 'EDIT_STOCK_TRANSFER'
  | 'ADD_ACCOUNT'
  | 'EDIT_ACCOUNT'
  | 'ADD_UNIT'
  | 'EDIT_UNIT'
  | 'ADD_PRODUCT_GROUP'
  | 'EDIT_PRODUCT_GROUP'
  | 'ADD_WAREHOUSE_GROUP'
  | 'EDIT_WAREHOUSE_GROUP'
  | 'ADD_PRODUCTION_VOUCHER'
  | 'EDIT_PRODUCTION_VOUCHER'
  | 'CONFIRM_DELETE'
  | null;

export interface ModalState {
  type: ModalType;
  data?: any;
}

export interface MenuItem {
  id: string;
  label: string;
  children?: MenuItem[];
  hidden?: boolean;
  isFavorite?: boolean;
}