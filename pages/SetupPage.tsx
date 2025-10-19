

import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { getSupabaseCredentials, setSupabaseCredentials } from '../utils/supabase';
import { formInputClass, formLabelClass } from '../styles/common';
import { SETUP_SQL } from '../data/setupSql';
import { VERSION_UPDATES } from '../data/versionUpdates';
import SupabaseSetupGuidePage from './SupabaseSetupGuidePage';

const SetupPage: React.FC<{ onCheckAgain: () => void; reason: 'tables' | 'config' | null; onClose?: () => void; loading: boolean; }> = ({ onCheckAgain, reason, onClose, loading }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'setup' | 'updates'>('setup');
    const [showGuide, setShowGuide] = useState(false);
    
    const [credentials, setCredentials] = useState({ url: '', anonKey: '' });
    
    useEffect(() => {
        const { url, anonKey } = getSupabaseCredentials();
        setCredentials({ url: url || '', anonKey: anonKey || '' });
    }, [reason]);

    const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAndCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!credentials.url.trim().startsWith('http') || credentials.anonKey.trim().length < 20) {
            addToast('Lütfen geçerli bir Supabase URL ve Anon Key girin.', 'error');
            return;
        }
        setSupabaseCredentials(credentials.url.trim(), credentials.anonKey.trim());
        addToast('Kimlik bilgileri kaydedildi. Bağlantı kontrol ediliyor...', 'info');
        
        await onCheckAgain();
    };


    const copySqlToClipboard = (sql: string, message: string) => {
        navigator.clipboard.writeText(sql)
            .then(() => {
                addToast(message, 'success');
            })
            .catch(err => {
                console.error('Copy failed', err);
                addToast('Kopyalama başarısız oldu. Lütfen manuel olarak kopyalayın.', 'error');
            });
    };
    
    const handleCheckAgain = async () => {
        addToast('Bağlantı ve veritabanı durumu kontrol ediliyor...', 'info');
        await onCheckAgain();
    };

    if (showGuide) {
        return <SupabaseSetupGuidePage onBack={() => setShowGuide(false)} />;
    }

    const effectiveReason = reason || 'config';

    if (effectiveReason === 'config') {
        return (
             <div id="setup-page-credentials" className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
                <div className="setup-panel text-left p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl mx-auto w-full">
                    <h1 className="panel-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Supabase Bağlantı Kurulumu</h1>
                    <p className="panel-description text-slate-600 dark:text-slate-300 mb-6">
                        Uygulamanın veritabanına bağlanabilmesi için Supabase proje bilgilerinizi girin.
                        Bu bilgilere nasıl ulaşacağınızı bilmiyorsanız, 
                        <button onClick={() => setShowGuide(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold ml-1">
                            adım adım kurulum rehberini görüntüleyebilirsiniz.
                        </button>
                    </p>
                    <form id="supabase-config-form" onSubmit={handleSaveAndCheck}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="supabase-url-input" className={formLabelClass}>Supabase URL</label>
                                <input
                                    type="text"
                                    id="supabase-url-input"
                                    name="url"
                                    value={credentials.url}
                                    onChange={handleCredentialChange}
                                    placeholder="https://proje-id.supabase.co"
                                    className={formInputClass}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="supabase-anon-key-input" className={formLabelClass}>Supabase Anon Key (Public)</label>
                                <input
                                    type="text"
                                    id="supabase-anon-key-input"
                                    name="anonKey"
                                    value={credentials.anonKey}
                                    onChange={handleCredentialChange}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    className={formInputClass}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-actions mt-8 pt-6 border-t dark:border-slate-700 flex justify-end gap-4">
                            {onClose && (
                                <button id="back-to-settings-button" type="button" onClick={onClose} className="secondary-action-button font-semibold py-3 px-6 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                                    <i className="fa-solid fa-arrow-left mr-2"></i> Geri Dön
                                </button>
                            )}
                            <button
                                type="submit"
                                id="save-credentials-button"
                                disabled={loading}
                                className="primary-action-button font-semibold py-3 px-6 rounded-md inline-flex items-center gap-3 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait"
                            >
                                {loading ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> Kontrol Ediliyor...</>
                                ) : (
                                    <><i className="fa-solid fa-save"></i> Kaydet ve Bağlan</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
    
    const CopyButton: React.FC<{ sqlToCopy: string, message: string, id: string }> = ({ sqlToCopy, message, id }) => {
        const [copied, setCopied] = useState(false);
        
        const handleClick = () => {
            copySqlToClipboard(sqlToCopy, message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }

        return (
            <button id={id} onClick={handleClick} className="copy-sql-button bg-slate-600 text-white py-1 px-3 rounded-md text-sm hover:bg-slate-500 transition-colors">
                {copied ? <><i className="fa-solid fa-check mr-2"></i>Kopyalandı</> : <><i className="fa-solid fa-copy mr-2"></i>Kopyala</>}
            </button>
        );
    }


    return (
        <div id="setup-page-db-management" className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
            <div className="setup-panel text-left p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl mx-auto w-full">
                <div className="panel-header flex justify-between items-start">
                    <div>
                        <h1 className="panel-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Veritabanı Yönetimi</h1>
                        <p className="panel-description text-slate-600 dark:text-slate-300 mb-6">
                           Uygulamanın veritabanını kurun veya güncelleyin.
                        </p>
                    </div>
                     {onClose && (
                        <button id="close-db-management-button" type="button" onClick={onClose} className="secondary-action-button font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                             <i className="fa-solid fa-times mr-2"></i> Kapat
                        </button>
                    )}
                </div>

                <div id="db-management-tabs" className="mb-6 border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button id="setup-sql-tab-button" onClick={() => setActiveTab('setup')} className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'setup' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'}`}>
                            İlk Kurulum
                        </button>
                        <button id="update-sql-tab-button" onClick={() => setActiveTab('updates')} className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'updates' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'}`}>
                            Versiyon Güncellemeleri
                        </button>
                    </nav>
                </div>
                
                <div className="tab-content">
                    {activeTab === 'setup' && (
                        <div id="setup-sql-tab-content">
                             <div id="setup-sql-warning" className="alert-box-danger p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 rounded-md mb-4">
                               <h3 className="alert-title font-bold text-lg text-red-800 dark:text-red-200 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> DİKKAT!</h3>
                               <p className="alert-message text-red-700 dark:text-red-300 mt-1">Bu betik, mevcut tüm stok takip tablolarınızı silip yeniden oluşturacaktır. Yalnızca uygulamayı <strong>ilk defa kuruyorsanız</strong> veya tüm verilerinizi sıfırlamak istiyorsanız çalıştırın.</p>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">Aşağıdaki betiği kopyalayıp Supabase projenizdeki <strong>SQL Editor</strong>'e yapıştırın ve çalıştırın. Bu işlem, uygulamanın en güncel sürümüyle uyumlu tüm tabloları ve fonksiyonları oluşturacaktır.</p>
                             <div className="relative">
                                <div id="setup-sql-code-block" className="code-block bg-slate-800 text-white p-4 rounded-md my-4 max-h-60 overflow-y-auto">
                                    <pre><code className="text-sm font-mono whitespace-pre-wrap">{SETUP_SQL}</code></pre>
                                </div>
                                <div className="absolute top-6 right-2">
                                    <CopyButton sqlToCopy={SETUP_SQL} message="Kurulum Betiği Panoya Kopyalandı!" id="copy-setup-sql-button"/>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'updates' && (
                        <div id="update-sql-tab-content">
                             <div id="update-sql-info" className="alert-box-info p-4 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-500/50 rounded-md mb-4">
                               <h3 className="alert-title font-bold text-lg text-sky-800 dark:text-sky-200 flex items-center gap-2"><i className="fa-solid fa-circle-info"></i> ÖNEMLİ!</h3>
                               <p className="alert-message text-sky-700 dark:text-sky-300 mt-1">Bu bölümdeki betikler, mevcut verilerinizi kaybetmeden veritabanı şemanızı günceller. Uygulamanızı güncel tutmak için yeni eklenen betikleri sırayla çalıştırmanız önerilir.</p>
                            </div>
                             {VERSION_UPDATES.length === 0 ? (
                                <p className="text-slate-500 dark:text-slate-400 text-center py-8">Şu anda bekleyen bir veritabanı güncellemesi yok. Gelecekteki güncellemeler burada listelenecektir.</p>
                            ) : (
                                <div className="space-y-6">
                                    {VERSION_UPDATES.map(update => (
                                       <div key={update.version} className="update-script-item border dark:border-slate-700 rounded-lg p-4">
                                          <div className="flex justify-between items-center mb-2">
                                             <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">Versiyon {update.version} ({update.date})</h4>
                                             <CopyButton sqlToCopy={update.sql} message={`Versiyon ${update.version} Güncelleme Betiği Kopyalandı!`} id={`copy-update-sql-button-${update.version}`}/>
                                          </div>
                                          <p className="text-slate-600 dark:text-slate-300 mb-4">{update.description}</p>
                                          <div className="code-block bg-slate-800 text-white p-2 rounded-md max-h-40 overflow-auto">
                                             <pre><code className="text-sm font-mono whitespace-pre-wrap">{update.sql}</code></pre>
                                          </div>
                                       </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="form-actions mt-8 pt-6 border-t dark:border-slate-700 flex justify-end">
                    <button
                        id="check-setup-button"
                        onClick={handleCheckAgain}
                        disabled={loading}
                        className="primary-action-button font-semibold py-3 px-6 rounded-md inline-flex items-center gap-3 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait"
                    >
                        {loading ? (
                            <><i className="fa-solid fa-spinner fa-spin"></i> Kontrol Ediliyor...</>
                        ) : (
                            <><i className="fa-solid fa-check-double"></i> Kurulumu Kontrol Et ve Devam Et</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetupPage;