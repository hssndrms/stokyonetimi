# Stok Takip Uygulaması (Supabase ile)

Bu proje, modern ve kullanıcı dostu bir arayüze sahip, çoklu depo ve raf yönetimini destekleyen, verilerini bulutta Supabase üzerinde depolayan bir stok takip uygulamasıdır.

Bu bir web uygulamasıdır. Genellikle bir web sunucusunda barındırılır ve kullanıcılar bir URL üzerinden erişir. Ancak, geliştirme yapmak veya kişisel kullanım için kendi bilgisayarınızda da çalıştırabilirsiniz. Kendi bilgisayarınızda çalıştırmak için aşağıdaki kurulum rehberini takip edebilirsiniz.

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

## 🛠️ Uygulamayı Kendi Bilgisayarınızda Çalıştırma (Yerel Kurulum)

Uygulamayı kendi bilgisayarınızda adım adım kurmak ve çalıştırmak için bu rehberi takip edin.

### Adım 1: Gerekli Araçları Yükleyin (Ön Gereksinimler)

Kuruluma başlamadan önce bilgisayarınızda aşağıdaki programların yüklü olduğundan emin olun:

-   [**Node.js**](https://nodejs.org/): JavaScript'i tarayıcı dışında çalıştırmamızı sağlar. LTS (Uzun Süreli Destek) versiyonunu indirmeniz önerilir.
-   [**npm**](https://www.npmjs.com/): Node.js ile birlikte otomatik olarak yüklenir. Projenin bağımlılıklarını (kütüphaneleri) yönetmek için kullanılır.
-   [**Git**](https://git-scm.com/): Proje kodlarını GitHub'dan indirmek için gerekli olan versiyon kontrol sistemidir.

### Adım 2: Veritabanını Hazırlayın (Supabase Kurulumu)

Uygulamanın verileri bulutta, Supabase adlı serviste tutulur. Bu nedenle ücretsiz bir Supabase projesi oluşturmanız gerekmektedir.

1.  **Hesap Oluşturun:** [Supabase](https://supabase.com/) web sitesine gidin ve ücretsiz bir hesap oluşturun.
2.  **Yeni Proje Başlatın:** Giriş yaptıktan sonra yeni bir proje (`New project`) oluşturun. Projenize bir isim verin, güçlü bir veritabanı şifresi belirleyin ve projenizin oluşturulmasını bekleyin.
3.  **SQL Betiğini Çalıştırın:** Projeniz hazır olduğunda, sol menüden bir veritabanı ikonuna sahip **SQL Editor**'e gidin.
4.  **Yeni Sorgu:** `+ New query` butonuna tıklayın.
5.  **Kopyala-Yapıştır:** Bu projedeki `data/setupSql.ts` dosyasında bulunan `SETUP_SQL` değişkeninin içeriğinin tamamını kopyalayıp Supabase'deki SQL Editor'e yapıştırın.
6.  **Çalıştır:** Sağ alttaki **RUN** butonuna tıklayarak veritabanı tablolarını ve gerekli fonksiyonları oluşturun. Bu işlem birkaç saniye sürebilir.
7.  **Bağlantı Bilgilerini Alın:** Kurulum tamamlandıktan sonra, sol menüden çark ikonuna sahip **Project Settings > API** bölümüne gidin. Bu sayfadaki `Project URL` ve `Project API Keys` altındaki `anon` `public` anahtarını kopyalayıp bir yere not alın. Sonraki adımlarda bu bilgilere ihtiyacınız olacak.

### Adım 3: Proje Kodlarını Bilgisayarınıza İndirin

1.  **Terminal'i Açın:**
    -   **Windows'ta:** Başlat menüsünü açın, `cmd` veya `powershell` yazın ve "Komut İstemi" veya "PowerShell" uygulamasını çalıştırın.
    -   **macOS'te:** `Applications > Utilities` klasöründen veya Spotlight (`Cmd + Space`) ile `Terminal` uygulamasını açın.

2.  **Projeyi Klonlayın (İndirin):**
    Terminalde, projeyi indirmek istediğiniz bir klasöre gidin (örneğin, `cd Belgeler` veya `cd Documents`) ve aşağıdaki komutu çalıştırın:
    ```bash
    git clone https://github.com/kullanici-adiniz/proje-repo-adi.git
    ```
    *(Not: `https://github.com/kullanici-adiniz/proje-repo-adi.git` kısmını bu projenin gerçek GitHub URL'si ile değiştirin.)*

3.  **Proje Klasörüne Girin:**
    ```bash
    cd proje-repo-adi
    ```
    *(Not: `proje-repo-adi` kısmını klonladığınız klasörün adıyla değiştirin.)*

### Adım 4: Projeyi Başlatın

1.  **Gerekli Paketleri Yükleyin:**
    Proje klasörünün içindeyken, terminale aşağıdaki komutu yazın. Bu komut, projenin çalışması için gereken tüm kütüphaneleri indirecektir.
    ```bash
    npm install
    ```

2.  **Geliştirme Sunucusunu Başlatın:**
    Paketler yüklendikten sonra, uygulamayı başlatmak için aşağıdaki komutu çalıştırın:
    ```bash
    npm run dev
    ```
    Bu komut, projenizi derleyecek ve test amaçlı bir web sunucusu başlatacaktır. Terminalde `Local:` ile başlayan bir adres (genellikle `http://localhost:5173`) göreceksiniz.

### Adım 5: Uygulamayı Yapılandırın

`npm run dev` komutunu çalıştırdıktan sonra, web tarayıcınızda otomatik olarak yeni bir sekme açılmalıdır.

1.  Uygulama ilk açıldığında, sizden Supabase bağlantı bilgilerinizi girmenizi isteyen bir kurulum ekranı ile karşılaşacaksınız.
2.  **Adım 2.7**'de not aldığınız `Supabase URL` ve `Supabase Anon Key` bilgilerini ilgili alanlara yapıştırın.
3.  **"Kaydet ve Bağlan"** butonuna tıklayın.
4.  Her şey yolunda gittiyse, uygulama veritabanına bağlanacak ve ana ekranı göreceksiniz. Kurulum tamamlandı!

Artık uygulamayı yerel bilgisayarınızda kullanabilirsiniz. Terminali kapatmadığınız sürece uygulama belirtilen adreste çalışmaya devam edecektir.

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