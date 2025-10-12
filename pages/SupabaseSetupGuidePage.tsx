import React from 'react';
import { SETUP_SQL } from '../data/setupSql';
import { useToast } from '../context/ToastContext';

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const { addToast } = useToast();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code)
            .then(() => addToast('SQL betiği panoya kopyalandı!', 'success'))
            .catch(() => addToast('Kopyalama başarısız oldu.', 'error'));
    };

    return (
        <div className="relative my-4">
            <pre className="code-block bg-slate-800 text-white p-4 rounded-md max-h-60 overflow-y-auto text-sm font-mono whitespace-pre-wrap">
                <code>{code}</code>
            </pre>
            <button
                onClick={copyToClipboard}
                className="copy-sql-button absolute top-3 right-3 bg-slate-600 text-white py-1 px-3 rounded-md text-sm hover:bg-slate-500 transition-colors"
                aria-label="Kopyala"
                title="Kopyala"
            >
                <i className="fa-solid fa-copy mr-2"></i>Kopyala
            </button>
        </div>
    );
};

const GuideStep: React.FC<{ step: number; title: string; children: React.ReactNode }> = ({ step, title, children }) => (
    <div className="guide-step mb-8">
        <h2 className="step-title text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">
            <span className="step-number bg-indigo-600 dark:bg-indigo-500 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-3">{step}</span>
            {title}
        </h2>
        <div className="step-content pl-11 text-slate-700 dark:text-slate-300 space-y-2">
            {children}
        </div>
    </div>
);

const SupabaseSetupGuidePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
            <div className="guide-panel text-left p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl mx-auto w-full">
                <div className="panel-header flex justify-between items-start mb-6">
                    <div>
                        <h1 className="panel-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Supabase Kurulum Rehberi</h1>
                        <p className="panel-description text-slate-600 dark:text-slate-300">
                            Uygulamayı kullanmaya başlamak için aşağıdaki adımları takip ederek ücretsiz bir Supabase projesi oluşturun.
                        </p>
                    </div>
                </div>

                <div className="guide-content">
                    <GuideStep step={1} title="Supabase Hesabı Oluşturun ve Proje Başlatın">
                        <p>
                            Öncelikle Supabase üzerinde ücretsiz bir hesap oluşturmanız gerekmektedir.
                        </p>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Supabase web sitesine</a> gidin ve bir hesap oluşturun.</li>
                            <li>Giriş yaptıktan sonra, "Dashboard" (Kontrol Paneli) üzerinden yeni bir proje (<b>New project</b>) oluşturun.</li>
                            <li>Projenize bir isim verin, güçlü bir veritabanı şifresi belirleyin ve projenizin oluşturulmasını bekleyin. Bu işlem birkaç dakika sürebilir.</li>
                        </ol>
                    </GuideStep>

                    <GuideStep step={2} title="Veritabanı Betiğini (SQL) Çalıştırın">
                        <p>
                            Projeniz hazır olduğunda, uygulamanın ihtiyaç duyduğu tabloları ve fonksiyonları oluşturmanız gerekir.
                        </p>
                         <ol className="list-decimal list-inside space-y-2">
                            <li>Supabase projenizin sol menüsünden veritabanı ikonuna sahip <b>SQL Editor</b> bölümüne gidin.</li>
                            <li><b>+ New query</b> butonuna tıklayarak yeni bir sorgu ekranı açın.</li>
                            <li>Aşağıdaki kutuda bulunan SQL kodunun tamamını kopyalayın ve Supabase'deki SQL Editor'e yapıştırın.</li>
                        </ol>
                        <CodeBlock code={SETUP_SQL.trim()} />
                        <ol className="list-decimal list-inside space-y-2" start={4}>
                           <li>Sağ alttaki <b>RUN</b> butonuna tıklayarak betiği çalıştırın. İşlem başarılı olduğunda "Success. No rows returned" mesajını göreceksiniz.</li>
                        </ol>
                    </GuideStep>

                    <GuideStep step={3} title="Bağlantı Bilgilerini Alın ve Girin">
                         <p>
                            Son olarak, uygulamanın veritabanına bağlanabilmesi için gerekli olan iki bilgiyi almanız gerekiyor.
                        </p>
                        <ol className="list-decimal list-inside space-y-2">
                           <li>Supabase projenizin sol menüsünden çark ikonuna sahip <b>Project Settings</b> bölümüne, ardından <b>API</b> sekmesine gidin.</li>
                           <li>Bu sayfadaki <b>Project URL</b> değerini kopyalayın.</li>
                           <li><b>Project API Keys</b> başlığı altındaki <b>anon</b> <code>public</code> anahtarını kopyalayın.</li>
                           <li>Bu rehber sayfasından geri dönmek için aşağıdaki butonu kullanın ve kopyaladığınız bu iki bilgiyi ilgili alanlara yapıştırın.</li>
                        </ol>
                    </GuideStep>
                </div>

                <div className="form-actions mt-8 pt-6 border-t dark:border-slate-700 flex justify-end">
                    <button
                        type="button"
                        onClick={onBack}
                        id="back-to-credentials-button"
                        className="primary-action-button font-semibold py-3 px-6 rounded-md inline-flex items-center gap-3 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                         <i className="fa-solid fa-arrow-left mr-2"></i> Bağlantı Ekranına Geri Dön
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupabaseSetupGuidePage;
