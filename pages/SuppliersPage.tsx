import React, { useState, useEffect } from 'react';
import { GeneralSettings } from '../types';
import { useToast } from '../context/ToastContext';
import { formInputClass, formLabelClass } from '../styles/common';

const GeneralSettingsPage: React.FC<{
    settings: GeneralSettings,
    onSave: (settings: GeneralSettings) => void;
    onOpenSetup: () => void;
}> = ({ settings, onSave, onOpenSetup }) => {
    const [formData, setFormData] = useState<GeneralSettings>(settings);
    const { addToast } = useToast();

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        addToast('Ayarlar başarıyla kaydedildi.', 'success');
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Genel Ayarlar</h1>
            <div className="bg-white p-6 rounded-lg shadow border max-w-2xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <h2 className="text-xl font-bold text-slate-800 pb-4 border-b mb-6">Cari Kodlama</h2>
                    <div className="space-y-6">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-lg font-medium text-slate-700 px-2">Müşteri Kodları</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label htmlFor="customer_code_prefix" className={formLabelClass}>Kod Öneki</label>
                                    <input type="text" name="customer_code_prefix" id="customer_code_prefix" value={formData.customer_code_prefix} onChange={handleChange} className={formInputClass} required />
                                </div>
                                <div>
                                    <label htmlFor="customer_code_length" className={formLabelClass}>Sayısal Karakter Sayısı</label>
                                    <input type="number" name="customer_code_length" id="customer_code_length" min="1" max="10" value={formData.customer_code_length} onChange={handleChange} className={formInputClass} required />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-lg font-medium text-slate-700 px-2">Tedarikçi Kodları</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label htmlFor="supplier_code_prefix" className={formLabelClass}>Kod Öneki</label>
                                    <input type="text" name="supplier_code_prefix" id="supplier_code_prefix" value={formData.supplier_code_prefix} onChange={handleChange} className={formInputClass} required />
                                </div>
                                <div>
                                    <label htmlFor="supplier_code_length" className={formLabelClass}>Sayısal Karakter Sayısı</label>
                                    <input type="number" name="supplier_code_length" id="supplier_code_length" min="1" max="10" value={formData.supplier_code_length} onChange={handleChange} className={formInputClass} required />
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 pb-4 border-b my-6">Stok Fiş Kodlama</h2>
                    <div className="space-y-6">
                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-lg font-medium text-slate-700 px-2">Stok Giriş Fişleri</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label htmlFor="stock_in_prefix" className={formLabelClass}>Kod Öneki</label>
                                    <input type="text" name="stock_in_prefix" id="stock_in_prefix" value={formData.stock_in_prefix || ''} onChange={handleChange} className={formInputClass} required />
                                </div>
                                <div>
                                    <label htmlFor="stock_in_length" className={formLabelClass}>Sayısal Karakter Sayısı</label>
                                    <input type="number" name="stock_in_length" id="stock_in_length" min="1" max="10" value={formData.stock_in_length || 8} onChange={handleChange} className={formInputClass} required />
                                </div>
                            </div>
                        </fieldset>
                        
                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-lg font-medium text-slate-700 px-2">Stok Çıkış Fişleri</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label htmlFor="stock_out_prefix" className={formLabelClass}>Kod Öneki</label>
                                    <input type="text" name="stock_out_prefix" id="stock_out_prefix" value={formData.stock_out_prefix || ''} onChange={handleChange} className={formInputClass} required />
                                </div>
                                <div>
                                    <label htmlFor="stock_out_length" className={formLabelClass}>Sayısal Karakter Sayısı</label>
                                    <input type="number" name="stock_out_length" id="stock_out_length" min="1" max="10" value={formData.stock_out_length || 8} onChange={handleChange} className={formInputClass} required />
                                </div>
                            </div>
                        </fieldset>

                         <fieldset className="border p-4 rounded-md">
                            <legend className="text-lg font-medium text-slate-700 px-2">Stok Transfer Fişleri</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label htmlFor="stock_transfer_prefix" className={formLabelClass}>Kod Öneki</label>
                                    <input type="text" name="stock_transfer_prefix" id="stock_transfer_prefix" value={formData.stock_transfer_prefix || ''} onChange={handleChange} className={formInputClass} required />
                                </div>
                                <div>
                                    <label htmlFor="stock_transfer_length" className={formLabelClass}>Sayısal Karakter Sayısı</label>
                                    <input type="number" name="stock_transfer_length" id="stock_transfer_length" min="1" max="10" value={formData.stock_transfer_length || 8} onChange={handleChange} className={formInputClass} required />
                                </div>
                            </div>
                        </fieldset>
                         <fieldset className="border p-4 rounded-md">
                            <legend className="text-lg font-medium text-slate-700 px-2">Üretim Fişleri</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label htmlFor="production_prefix" className={formLabelClass}>Kod Öneki</label>
                                    <input type="text" name="production_prefix" id="production_prefix" value={formData.production_prefix || ''} onChange={handleChange} className={formInputClass} required />
                                </div>
                                <div>
                                    <label htmlFor="production_length" className={formLabelClass}>Sayısal Karakter Sayısı</label>
                                    <input type="number" name="production_length" id="production_length" min="1" max="10" value={formData.production_length || 8} onChange={handleChange} className={formInputClass} required />
                                </div>
                            </div>
                        </fieldset>
                    </div>


                    <div className="flex justify-end mt-8 pt-4 border-t">
                        <button type="submit" className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                            Ayarları Kaydet
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border max-w-2xl mx-auto mt-8">
                <h2 className="text-xl font-bold text-slate-800 pb-4 border-b mb-6">Veritabanı Yönetimi</h2>
                <p className="text-slate-600 mb-4">
                    Veritabanı kurulumu (SQL) betiğini görüntülemek veya yeniden çalıştırmak için kurulum ekranını açabilirsiniz. 
                    Bu, genellikle uygulamanın ilk kurulumunda veya veritabanını sıfırlamak istediğinizde gereklidir.
                </p>
                <div className="flex justify-start">
                    <button 
                        onClick={onOpenSetup}
                        className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-amber-500 text-white hover:bg-amber-600">
                        <i className="fa-solid fa-database"></i> Kurulum Ekranını Aç
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettingsPage;