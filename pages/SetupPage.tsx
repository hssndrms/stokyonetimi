

import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { getSupabaseCredentials, setSupabaseCredentials } from '../utils/supabase';
import { formInputClass, formLabelClass } from '../styles/common';
import { SETUP_SQL } from '../data/setupSql';
import { VERSION_UPDATES } from '../data/versionUpdates';


const SetupPage: React.FC<{ onCheckAgain: () => void; reason: 'tables' | 'config' | null; onClose?: () => void; loading: boolean; }> = ({ onCheckAgain, reason, onClose, loading }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'setup' | 'updates'>('setup');
    
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

    const effectiveReason = reason || 'config';

    if (effectiveReason === 'config') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
                <div className="text-left p-8 bg-white rounded-lg shadow-xl max-w-2xl mx-auto w-full">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Supabase Bağlantı Kurulumu</h1>
                    <p className="text-slate-600 mb-6">
                        Uygulamanın veritabanına bağlanabilmesi için Supabase proje bilgilerinizi girin.
                        Bu bilgileri Supabase projenizin "Project Settings &gt; API" bölümünde bulabilirsiniz.
                    </p>
                    <form onSubmit={handleSaveAndCheck}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="url" className={formLabelClass}>Supabase URL</label>
                                <input
                                    type="text"
                                    id="url"
                                    name="url"
                                    value={credentials.url}
                                    onChange={handleCredentialChange}
                                    placeholder="https://proje-id.supabase.co"
                                    className={formInputClass}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="anonKey" className={formLabelClass}>Supabase Anon Key (Public)</label>
                                <input
                                    type="text"
                                    id="anonKey"
                                    name="anonKey"
                                    value={credentials.anonKey}
                                    onChange={handleCredentialChange}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    className={formInputClass}
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t flex justify-end gap-4">
                            {onClose && (
                                <button type="button" onClick={onClose} className="font-semibold py-3 px-6 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                                    <i className="fa-solid fa-arrow-left mr-2"></i> Geri Dön
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="font-semibold py-3 px-6 rounded-md inline-flex items-center gap-3 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait"
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
    
    const CopyButton: React.FC<{ sqlToCopy: string, message: string }> = ({ sqlToCopy, message }) => {
        const [copied, setCopied] = useState(false);
        
        const handleClick = () => {
            copySqlToClipboard(sqlToCopy, message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }

        return (
            <button onClick={handleClick} className="bg-slate-600 text-white py-1 px-3 rounded-md text-sm hover:bg-slate-500 transition-colors">
                {copied ? <><i className="fa-solid fa-check mr-2"></i>Kopyalandı</> : <><i className="fa-solid fa-copy mr-2"></i>Kopyala</>}
            </button>
        );
    }


    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="text-left p-8 bg-white rounded-lg shadow-xl max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Veritabanı Yönetimi</h1>
                        <p className="text-slate-600 mb-6">
                           Uygulamanın veritabanını kurun veya güncelleyin.
                        </p>
                    </div>
                     {onClose && (
                        <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                             <i className="fa-solid fa-times mr-2"></i> Kapat
                        </button>
                    )}
                </div>

                <div className="mb-6 border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('setup')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'setup' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            İlk Kurulum
                        </button>
                        <button onClick={() => setActiveTab('updates')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'updates' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            Versiyon Güncellemeleri
                        </button>
                    </nav>
                </div>
                
                <div>
                    {activeTab === 'setup' && (
                        <div>
                             <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                               <h3 className="font-bold text-lg text-red-800 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> DİKKAT!</h3>
                               <p className="text-red-700 mt-1">Bu betik, mevcut tüm stok takip tablolarınızı silip yeniden oluşturacaktır. Yalnızca uygulamayı <strong>ilk defa kuruyorsanız</strong> veya tüm verilerinizi sıfırlamak istiyorsanız çalıştırın.</p>
                            </div>
                            <p className="text-slate-700 mb-4">Aşağıdaki betiği kopyalayıp Supabase projenizdeki <strong>SQL Editor</strong>'e yapıştırın ve çalıştırın. Bu işlem, uygulamanın en güncel sürümüyle uyumlu tüm tabloları ve fonksiyonları oluşturacaktır.</p>
                             <div className="relative">
                                <div className="bg-slate-800 text-white p-4 rounded-md my-4 max-h-60 overflow-y-auto">
                                    <pre><code className="text-sm font-mono whitespace-pre-wrap">{SETUP_SQL}</code></pre>
                                </div>
                                <div className="absolute top-6 right-2">
                                    <CopyButton sqlToCopy={SETUP_SQL} message="Kurulum Betiği Panoya Kopyalandı!" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'updates' && (
                        <div>
                             <div className="p-4 bg-sky-50 border border-sky-200 rounded-md mb-4">
                               <h3 className="font-bold text-lg text-sky-800 flex items-center gap-2"><i className="fa-solid fa-circle-info"></i> ÖNEMLİ!</h3>
                               <p className="text-sky-700 mt-1">Bu bölümdeki betikler, mevcut verilerinizi kaybetmeden veritabanı şemanızı günceller. Uygulamanızı güncel tutmak için yeni eklenen betikleri sırayla çalıştırmanız önerilir.</p>
                            </div>
                             {VERSION_UPDATES.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Şu anda bekleyen bir veritabanı güncellemesi yok. Gelecekteki güncellemeler burada listelenecektir.</p>
                            ) : (
                                <div className="space-y-6">
                                    {VERSION_UPDATES.map(update => (
                                       <div key={update.version} className="border rounded-lg p-4">
                                          <div className="flex justify-between items-center mb-2">
                                             <h4 className="font-bold text-lg text-slate-800">Versiyon {update.version} ({update.date})</h4>
                                             <CopyButton sqlToCopy={update.sql} message={`Versiyon ${update.version} Güncelleme Betiği Kopyalandı!`} />
                                          </div>
                                          <p className="text-slate-600 mb-4">{update.description}</p>
                                          <div className="bg-slate-800 text-white p-2 rounded-md max-h-40 overflow-auto">
                                             <pre><code className="text-sm font-mono whitespace-pre-wrap">{update.sql}</code></pre>
                                          </div>
                                       </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t flex justify-end">
                    <button
                        onClick={handleCheckAgain}
                        disabled={loading}
                        className="font-semibold py-3 px-6 rounded-md inline-flex items-center gap-3 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait"
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