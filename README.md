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
6.  `Project URL` ve `Project API Keys` altındaki `anon` `public` anahtarını not alın. Uygulamayı ilk çalıştırdığınızda bu bilgilere ihtiyacınız olacak.

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

4.  **Geliştirme Sunucusunu Başlatın:**
    ```bash
    npm run dev
    ```

5.  **Kurulumu Tamamlayın:**
    -   Uygulama tarayıcıda açıldığında, sizden Supabase URL ve Anon Key bilgilerinizi girmenizi isteyecektir. Bu bilgileri web arayüzü üzerinden girerek kurulumu tamamlayabilirsiniz.

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

4.  **Geliştirme Sunucusunu Başlatın:**
    ```bash
    npm run dev
    ```

5.  **Kurulumu Tamamlayın:**
    -   Uygulama tarayıcıda açıldığında, sizden Supabase URL ve Anon Key bilgilerinizi isteyecektir. Bu bilgileri web arayüzü üzerinden girerek kurulumu tamamlayabilirsiniz.


---
## 📦 Derleme ve Dağıtım (Build & Deployment)

Uygulamanızı tamamladığınızda, kullanıcılarınızın erişebilmesi için canlıya almanız gerekir.

### 1. Derleme Adımı

Projenin üretim versiyonunu oluşturmak için aşağıdaki komutu çalıştırın:
```bash
npm run build
```
Bu komut, projenin optimize edilmiş, sıkıştırılmış ve tarayıcıların doğrudan çalıştırabileceği statik dosyaları (`index.html`, CSS, JavaScript dosyaları vb.) içeren bir `dist` klasörü oluşturacaktır.

Oluşturulan `dist` klasörünün içeriği artık bir web sunucusunda barındırılmaya hazırdır.

### 2. Dağıtım Yöntemleri

#### Yöntem 1: Statik Hosting Servisleri (Netlify, Vercel vb.)

En kolay ve hızlı yöntemdir. [Netlify](https://www.netlify.com/), [Vercel](https://vercel.com/), [GitHub Pages](https://pages.github.com/) gibi modern hosting servisleri, `dist` klasörünü sürükleyip bırakarak veya bir Git reposuna bağlayarak projenizi saniyeler içinde SSL sertifikası dahil olmak üzere yayınlamanıza olanak tanır.

#### Yöntem 2: Node.js ile Yerel Sunucu Başlatma (Hızlı Test)

Bu, derlenmiş uygulamanızı canlı ortama taşımadan önce test etmenin en hızlı ve en yaygın yollarından biridir. Adımlar Windows ve macOS için aynıdır.

1.  **Serve Paketini Yükleyin:**
    Eğer bilgisayarınızda `serve` paketi yüklü değilse, Terminal veya Komut İstemi'nde aşağıdaki komutla global olarak yükleyin:
    ```bash
    npm install -g serve
    ```

2.  **Sunucuyu Başlatın:**
    Projenizin ana dizininde (`dist` klasörünün bulunduğu yerde), aşağıdaki komutu çalıştırın:
    ```bash
    serve -s dist
    ```
    -   `-s`: Bu bayrak, projenin tek sayfa uygulaması (Single Page Application - SPA) olduğunu belirtir. Bu sayede, `site.com/urunler` gibi alt sayfalara doğrudan gidildiğinde sayfanın düzgün yüklenmesini sağlar.
    -   `dist`: Sunucunun hangi klasördeki dosyaları sunacağını belirtir.

3.  **Uygulamayı Açın:**
    Terminalde size verilen adresi (genellikle `http://localhost:3000`) tarayıcınızda açarak uygulamanızı görüntüleyebilirsiniz.

#### Yöntem 3: Yerel HTTPS Test Sunucusu

Uygulamanızı canlıya almadan önce güvenli bir ortamda (HTTPS) test etmek için bu yöntemi kullanabilirsiniz. Bu adımlar hem **Windows** hem de **macOS** için geçerlidir.

1.  **Serve Paketini Yükleyin:**
    Eğer bilgisayarınızda `serve` paketi yüklü değilse, Terminal veya Komut İstemi'nde aşağıdaki komutla global olarak yükleyin:
    ```bash
    npm install -g serve
    ```

2.  **Sunucuyu Başlatın:**
    Projenizin ana dizininde, aşağıdaki komutu çalıştırarak `dist` klasörünü HTTPS üzerinden sunun:
    ```bash
    serve -s -S dist -l 5000
    ```
    -   `-s`: Tek sayfa uygulamaları (SPA) için tüm istekleri `index.html`'e yönlendirir.
    -   `-S`: SSL (HTTPS) modunu aktif eder ve otomatik olarak geçici bir sertifika oluşturur.
    -   `-l 5000`: Sunucunun `5000` portunda çalışmasını sağlar.

3.  **Tarayıcıda Açın:**
    Tarayıcınızda `https://localhost:5000` adresine gidin. Tarayıcı, sertifikanın "kendinden imzalı" (self-signed) olması nedeniyle bir güvenlik uyarısı gösterecektir. Bu normaldir. "Gelişmiş" veya "Yine de devam et" seçeneğine tıklayarak siteyi görüntüleyebilirsiniz.

#### Yöntem 4: Windows Sunucusu (IIS)

Uygulamayı bir Windows sunucusunda IIS (Internet Information Services) üzerinden yayınlamak için aşağıdaki adımları izleyin.

**Ön Gereksinimler:**
-   Sunucuda IIS rolünün kurulu olması.
-   [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)'ün IIS üzerine yüklenmiş olması. Bu modül, tek sayfa uygulamalarının (SPA) yönlendirme (routing) mekanizmasının düzgün çalışması için kritiktir.

**Adımlar:**

1.  **Projenizi Derleyin:**
    Yerel makinenizde `npm run build` komutunu çalıştırarak `dist` klasörünü oluşturun.

2.  **Dosyaları Sunucuya Kopyalayın:**
    `dist` klasörünün **içindeki tüm dosyaları** (klasörün kendisini değil) sunucunuzda siteyi barındırmak istediğiniz bir klasöre kopyalayın (örn: `C:\inetpub\wwwroot\stok-uygulamasi`).

3.  **IIS'te Yeni Bir Site Oluşturun:**
    -   IIS Yöneticisi'ni açın.
    -   Sol taraftaki "Connections" panelinde sunucu adınızı genişletin, "Sites" üzerine sağ tıklayın ve "Add Website..." seçeneğini seçin.
    -   **Site name:** Uygulamanıza bir isim verin (örn: `Stok Takip`).
    -   **Physical path:** Dosyaları kopyaladığınız klasörün yolunu seçin (örn: `C:\inetpub\wwwroot\stok-uygulamasi`).
    -   **Binding:** Sitenin çalışacağı portu ve isteğe bağlı olarak bir hostname belirleyin.

4.  **`web.config` Dosyasını Oluşturun:**
    React gibi tek sayfa uygulamaları, sayfa yönlendirmelerini tarayıcı tarafında yönetir. Kullanıcı `site.com/urunler` gibi bir adrese doğrudan gittiğinde, sunucunun bu isteği alıp ana `index.html` dosyasına yönlendirmesi gerekir. IIS'te bu işlemi `web.config` dosyası ve URL Rewrite modülü yapar.

    -   Dosyaları kopyaladığınız klasörün (`C:\inetpub\wwwroot\stok-uygulamasi`) içine `web.config` adında yeni bir dosya oluşturun.
    -   Dosyayı bir metin düzenleyici ile açın ve aşağıdaki içeriği içine yapıştırın:

    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <configuration>
      <system.webServer>
        <rewrite>
          <rules>
            <rule name="React SPA" stopProcessing="true">
              <match url=".*" />
              <conditions logicalGrouping="MatchAll">
                <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
              </conditions>
              <action type="Rewrite" url="/" />
            </rule>
          </rules>
        </rewrite>
      </system.webServer>
    </configuration>
    ```

5.  **Siteyi Ziyaret Edin:**
    Tarayıcınızdan sitenin adresine giderek uygulamanızın çalıştığını doğrulayın. Artık hem ana sayfaya hem de alt sayfalara (örn: `/urunler`) doğrudan erişebiliyor olmalısınız.

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
├── index.html             # Ana HTML dosyası
├── package.json           # Proje bağımlılıkları ve script'leri
└── README.md              # Bu dosya
```

## 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.