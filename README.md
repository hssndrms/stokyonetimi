# Stok Takip Uygulaması (Supabase ile)

Bu proje, modern ve kullanıcı dostu bir arayüze sahip, çoklu depo ve raf yönetimini destekleyen, verilerini bulutta Supabase üzerinde depolayan bir stok takip uygulamasıdır.

 <!-- Projenizin bir ekran görüntüsünü buraya ekleyebilirsiniz -->

## ✨ Temel Özellikler

- **Çoklu Depo ve Raf Yönetimi:** Fiziksel konumlarınızı gruplandırarak ve detaylandırarak stoklarınızı hassas bir şekilde takip edin.
- **Detaylı Ürün Yönetimi:** Ürünlerinizi gruplara ayırın, birimlerini tanımlayın ve otomatik SKU (Stok Kodu) üretme özelliğinden faydalanın.
- **Cari Hesap Yönetimi:** Müşteri ve tedarikçilerinizi ayrı ayrı kaydedin ve stok hareketlerinizi bu carilerle ilişkilendirin.
- **Kapsamlı Stok Hareketleri:** Stok Giriş, Stok Çıkış ve Depolar Arası Transfer fişleri ile tüm envanter hareketlerinizi kaydedin.
- **Gelişmiş Raporlama:**
    - Stok Hareket Raporu: Belirli bir tarih aralığındaki tüm envanter aktivitelerini listeleyin.
    - Mevcut Stok Raporu: Depo ve raf bazında anlık stok durumunu görüntüleyin.
    - Envanter Raporu: Belirli bir tarihteki ürün envanterini hesaplayın.
- **Veri Aktarımı:** Oluşturduğunuz tüm raporları tek tıkla Excel (.xlsx) veya CSV formatında dışa aktarın.
- **Özelleştirilebilir Ayarlar:** Cari ve fiş kodlamaları için önek ve uzunluk gibi genel ayarları yönetin.
- **Dinamik Menü Yönetimi:** Uygulama menüsünü sürükle-bırak arayüzü ile kendi kullanım alışkanlıklarınıza göre düzenleyin ve sık kullandığınız işlemleri favorilere ekleyin.

## 🚀 Teknoloji Yığını

- **Frontend:** React, TypeScript, Tailwind CSS
- **Veritabanı & Backend:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Paket Yöneticisi:** npm

---

## 🛠️ Yerel Geliştirme Ortamı Kurulumu

Projeyi kendi bilgisayarınızda çalıştırıp geliştirmek için aşağıdaki adımları izleyin.

### 1. Ön Gereksinimler

- [Node.js](https://nodejs.org/) (LTS versiyonu önerilir)
- [npm](https://www.npmjs.com/) (Node.js ile birlikte gelir)
- [Git](https://git-scm.com/)

### 2. Supabase Projesi Oluşturma

1.  [Supabase](https://supabase.com/) üzerinde ücretsiz bir hesap oluşturun ve yeni bir proje başlatın.
2.  Proje dashboard'unda, sol menüden **SQL Editor**'e gidin.
3.  **+ New query**'ye tıklayın ve bu projedeki `pages/SetupPage.tsx` dosyasında bulunan `SETUP_SQL` içeriğinin tamamını kopyalayıp yapıştırın.
4.  Sağ alttaki **RUN** butonuna tıklayarak veritabanı şemasını, tabloları ve fonksiyonları oluşturun.
5.  Kurulum tamamlandıktan sonra, sol menüden **Project Settings > API** bölümüne gidin.
6.  `Project URL` ve `Project API Keys` altındaki `anon` `public` anahtarını not alın. Bu bilgilere bir sonraki adımda ihtiyacınız olacak.

### 3. Projeyi Bilgisayara İndirme ve Ayarlama

Aşağıda işletim sisteminize uygun adımları takip edebilirsiniz.

---

#### 🖥️ **Windows Kurulumu**

1.  **Komut İstemi'ni Açın:**
    -   Başlat menüsünü açın, `cmd` yazın ve "Komut İstemi" (Command Prompt) uygulamasını çalıştırın.

2.  **Projeyi Klonlayın:**
    -   Çalışmak istediğiniz bir klasöre gidin (örneğin, `cd Belgeler`) ve aşağıdaki komutu çalıştırın:
        ```bash
        git clone https://github.com/kullanici-adiniz/proje-repo-adi.git
        cd proje-repo-adi
        ```
      *(Not: `kullanici-adiniz/proje-repo-adi` kısmını kendi GitHub bilgilerinizle güncelleyin.)*

3.  **Gerekli Paketleri Yükleyin:**
    ```bash
    npm install
    ```

4.  **Ortam Değişkenleri Dosyasını Oluşturun (`.env`):**
    -   Komut İstemi'nde, projenin ana dizinindeyken şu komutu çalıştırın:
        ```bash
        copy NUL .env
        ```
    -   Bu komut, `.env` adında boş bir dosya oluşturacaktır. Dosyayı Visual Studio Code veya Not Defteri gibi bir metin düzenleyici ile açın.

5.  **Uygulamayı Çalıştırın:**
    -   Uygulamayı çalıştırdığınızda, sizden Supabase URL ve Anon Key bilgilerini isteyecektir. Bu bilgileri web arayüzü üzerinden girerek kurulumu tamamlayabilirsiniz.

6.  **Geliştirme Sunucusunu Başlatın:**
    ```bash
    npm run dev
    ```

---

#### 🍏 **macOS Kurulumu**

1.  **Terminal'i Açın:**
    -   `Applications > Utilities` klasöründen veya Spotlight aramasına (`Cmd + Space`) `Terminal` yazarak uygulamayı açın.

2.  **Projeyi Klonlayın:**
    -   Çalışmak istediğiniz bir klasöre gidin (örneğin, `cd ~/Documents`) ve aşağıdaki komutu çalıştırın:
        ```bash
        git clone https://github.com/kullanici-adiniz/proje-repo-adi.git
        cd proje-repo-adi
        ```
       *(Not: `kullanici-adiniz/proje-repo-adi` kısmını kendi GitHub bilgilerinizle güncelleyin.)*

3.  **Gerekli Paketleri Yükleyin:**
    ```bash
    npm install
    ```

4.  **Ortam Değişkenleri Dosyasını Oluşturun (`.env`):**
    -   Terminal'de, projenin ana dizinindeyken şu komutu çalıştırın:
        ```bash
        touch .env
        ```
    -   Bu komut, `.env` adında boş bir dosya oluşturacaktır.

5.  **Uygulamayı Çalıştırın:**
    -   Uygulamayı çalıştırdığınızda, sizden Supabase URL ve Anon Key bilgilerini isteyecektir. Bu bilgileri web arayüzü üzerinden girerek kurulumu tamamlayabilirsiniz.


6.  **Geliştirme Sunucusunu Başlatın:**
    ```bash
    npm run dev
    ```

---
## 📦 Derleme ve Dağıtım (Build & Deployment)

Uygulamanızı tamamladığınızda, kullanıcılarınızın erişebilmesi için canlıya almanız gerekir.

### Derleme Adımı

1.  Projenin üretim versiyonunu oluşturmak için aşağıdaki komutu çalıştırın:
    ```bash
    npm run build
    ```
2.  Bu komut, projenin optimize edilmiş, sıkıştırılmış ve tarayıcıların doğrudan çalıştırabileceği statik dosyaları (`index.html`, CSS, JavaScript dosyaları vb.) içeren bir `dist` klasörü oluşturacaktır.

### Dağıtım Adımı

Oluşturulan `dist` klasörünün içeriği artık bir web sunucusunda barındırılmaya hazırdır. Bu dosyaları aşağıdaki gibi platformlara kolayca yükleyebilirsiniz:

-   **Statik Hosting Servisleri (Önerilen):** [Netlify](https://www.netlify.com/), [Vercel](https://vercel.com/), [GitHub Pages](https://pages.github.com/) gibi servisler, `dist` klasörünü sürükleyip bırakarak veya bir Git reposuna bağlayarak projenizi saniyeler içinde yayınlamanıza olanak tanır.
-   **Gelenşeksel Sunucular:** `dist` klasörünün içindeki tüm dosyaları Nginx veya Apache gibi bir web sunucusunun hizmet verdiği dizine kopyalayarak da dağıtım yapabilirsiniz.

Uygulama, `dist` klasörü içindeki `index.html` dosyası üzerinden çalışacaktır.

---

## 📂 Proje Yapısı

```
/
├── public/                # Statik dosyalar
├── src/
│   ├── components/        # Tekrar kullanılabilir React bileşenleri (Modal, Sidebar, İkonlar vb.)
│   ├── context/           # React Context API'leri (örn: ToastContext)
│   ├── hooks/             # Özel React Hook'ları (örn: useInventory, useLocalStorage)
│   ├── pages/             # Her bir sayfanın ana bileşeni
│   ├── styles/            # Ortak stil tanımlamaları
│   ├── types/             # TypeScript arayüzleri ve tipleri
│   ├── utils/             # Yardımcı fonksiyonlar (Supabase istemcisi, veri aktarımı vb.)
│   ├── App.tsx            # Ana uygulama bileşeni
│   └── index.tsx          # Uygulamanın giriş noktası
├── .env                   # Ortam değişkenleri (Supabase URL ve Key) - GİZLİ
├── index.html             # Ana HTML dosyası
├── package.json           # Proje bağımlılıkları ve script'leri
└── README.md              # Bu dosya
```

## 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.
