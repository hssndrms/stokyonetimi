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

Uygulamanızı tamamladığınızda, kullanıcılarınızın erişebilmesi için canlı ortama almanız gerekir. Bu süreç iki ana adımdan oluşur: derleme (`build`) ve dağıtım (`deployment`).

### 1. Derleme Adımı

Projenin üretim versiyonunu oluşturmak için aşağıdaki komutu çalıştırın:
```bash
npm run build
```
Bu komut, projenin optimize edilmiş, sıkıştırılmış ve tarayıcıların doğrudan çalıştırabileceği statik dosyaları (`index.html`, CSS, JavaScript dosyaları vb.) içeren bir `dist` klasörü oluşturacaktır.

Oluşturulan `dist` klasörünün içeriği artık bir web sunucusunda barındırılmaya hazırdır.

### 2. Dağıtım Yöntemleri

#### Yöntem 1: Manuel Dağıtım (Windows Sunucusu - IIS)

Bu yöntem, `dist` klasöründeki dosyaları manuel olarak sunucuya kopyalamayı içerir. Her güncellemede bu adımların tekrarlanması gerekir.

**Ön Gereksinimler:**
-   Sunucuda IIS rolünün kurulu olması.
-   [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)'ün IIS üzerine yüklenmiş olması. Bu modül, tek sayfa uygulamalarının (SPA) yönlendirme (routing) mekanizmasının düzgün çalışması için kritiktir.

**Adımlar:**

1.  **Dosyaları Sunucuya Kopyalayın:**
    `npm run build` ile oluşturulan `dist` klasörünün **içindeki tüm dosyaları**, sunucunuzda siteyi barındırmak istediğiniz bir klasöre kopyalayın (örn: `C:\inetpub\wwwroot\stok-uygulamasi`).

2.  **IIS'te Yeni Bir Site Oluşturun:**
    -   IIS Yöneticisi'ni açın.
    -   "Sites" üzerine sağ tıklayın ve "Add Website..." seçeneğini seçin.
    -   **Site name:** Uygulamanıza bir isim verin.
    -   **Physical path:** Dosyaları kopyaladığınız klasörün yolunu seçin.
    -   **Binding:** Sitenin çalışacağı portu belirleyin.

3.  **`web.config` Dosyasını Oluşturun:**
    React gibi tek sayfa uygulamaları, sayfa yönlendirmelerini tarayıcı tarafında yönetir. Kullanıcı `site.com/urunler` gibi bir adrese doğrudan gittiğinde, sunucunun bu isteği alıp ana `index.html` dosyasına yönlendirmesi gerekir.

    -   Dosyaları kopyaladığınız klasörün içine `web.config` adında yeni bir dosya oluşturun.
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

4.  **Siteyi Ziyaret Edin:**
    Tarayıcınızdan sitenin adresine giderek uygulamanızın çalıştığını doğrulayın.

#### Yöntem 2: Otomatik Dağıtım (CI/CD ile Windows Sunucusu - IIS) - ÖNERİLEN

Bu yöntem, güncellemelerin otomatik olarak ve hatasız bir şekilde sunucuya aktarılmasını sağlar. Kurulumu bir kez yapılır ve sonrasında güncelleme süreci tamamen otomatikleşir.

Bu otomasyon, **GitHub Actions** ve sunucunuza kuracağınız **Self-Hosted Runner** (Kendi Sunucunda Çalışan Koşucu) adı verilen bir program aracılığıyla çalışır. Runner, GitHub'daki projenizi dinler ve `release` dalına yeni bir kod gönderildiğinde, uygulamayı otomatik olarak derleyip sunucunuzdaki doğru klasöre kopyalar.

**Kurulum Adımları:**

Bu kurulum, **sadece bir kez** son kullanıcının sunucusunda veya sistem yöneticisi tarafından yapılır.

**Adım 1: GitHub'da Runner Token'ı Oluşturma**

1.  Uygulamanın GitHub deposuna gidin.
2.  `Settings` -> `Actions` -> `Runners` sekmelerine tıklayın.
3.  Sağ üstteki **`New self-hosted runner`** butonuna tıklayın.
4.  İşletim sistemi olarak **`Windows`** seçeneğini seçin. Mimarinin `x64` olduğundan emin olun.
5.  Sayfada, sunucunuzda çalıştırmanız gereken bir dizi komut (`Download` ve `Configure` başlıkları altında) görünecektir. **Bu sayfayı kapatmayın**, bir sonraki adımda bu komutlara ihtiyacınız olacak.

**Adım 2: Sunucuda Runner'ı Kurma ve Yapılandırma**

Aşağıdaki adımları uygulamanın barındırılacağı Windows sunucusunda gerçekleştirin.

1.  **PowerShell'i Yönetici Olarak Açın:**
    Başlat menüsüne `PowerShell` yazın, **Windows PowerShell**'e sağ tıklayın ve **"Yönetici olarak çalıştır"** seçeneğini seçin.

2.  **Runner İçin Klasör Oluşturun:**
    Runner dosyalarını saklamak için bir klasör oluşturun. Örneğin:
    ```powershell
    mkdir C:\actions-runner
    cd C:\actions-runner
    ```

3.  **Runner'ı İndirin ve Yapılandırın:**
    Bir önceki adımda açık bıraktığınız GitHub sayfasındaki komutları sırayla PowerShell'e yapıştırıp çalıştırın. Bu komutlar şuna benzer olacaktır:

    ```powershell
    # Download bölümündeki ilk komut (versiyon farklı olabilir)
    Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-win-x64-2.311.0.zip -OutFile actions-runner-win-x64-2.311.0.zip
    
    # Download bölümündeki ikinci komut
    Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.311.0.zip", "$PWD")

    # Configure bölümündeki komut
    ./config.cmd --url https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ --token TOKEN_BILGINIZ
    ```
    -   `config.cmd` komutunu çalıştırdığınızda, size birkaç soru sorulacaktır:
        -   **Enter the name of the runner group:** `Enter` tuşuna basarak varsayılanı (`default`) kabul edebilirsiniz.
        -   **Enter the name of runner:** `Enter` tuşuna basarak sunucu adını (`server-name`) kabul edebilirsiniz.
        -   **Enter additional labels:** `Enter` tuşuna basarak boş bırakabilirsiniz.
        -   **Enter name of work folder:** `Enter` tuşuna basarak varsayılanı (`_work`) kabul edebilirsiniz.

4.  **Runner'ı Servis Olarak Kurun:**
    Yapılandırma tamamlandıktan sonra, runner'ın sunucu yeniden başladığında bile otomatik olarak çalışması için onu bir Windows servisi olarak kurun:
    ```powershell
    ./svc.ps1 install
    ./svc.ps1 start
    ```
    -   Bu komutlardan sonra GitHub'daki runner sayfasını yenilediğinizde, yeni koşucunuzun `Idle` (Boşta) durumunda göründüğünü göreceksiniz.

**Adım 3: Gerekli Klasör İzinlerini Ayarlama (ÇOK ÖNEMLİ!)**

Runner'ın IIS klasörüne dosya yazabilmesi için, çalıştığı kullanıcıya ilgili klasör üzerinde yazma izni vermeniz gerekir.

1.  Uygulama dosyalarının bulunduğu klasöre gidin (örn: `C:\inetpub\wwwroot\stok-uygulamasi`).
2.  Klasöre sağ tıklayın ve `Properties` (Özellikler) seçeneğini seçin.
3.  `Security` (Güvenlik) sekmesine gidin ve `Edit...` butonuna tıklayın.
4.  `Add...` (Ekle) butonuna tıklayın.
5.  Açılan pencereye `NT AUTHORITY\NETWORK SERVICE` yazın ve `Check Names` butonuna tıklayın. Adın altı çizili hale gelmesi gerekir. `OK`'a tıklayın.
6.  `NETWORK SERVICE` kullanıcısını seçtikten sonra, alttaki izinler kutusunda `Modify` (Değiştir) izni için `Allow` (İzin Ver) kutucuğunu işaretleyin. Bu, `Read` ve `Write` izinlerini de otomatik olarak seçecektir.
7.  `Apply` ve `OK` butonlarına basarak tüm pencereleri kapatın.

**Kurulum Tamamlandı!**

Artık CI/CD sisteminiz hazır. Geliştirici, projede `release` dalına yeni bir kod gönderdiği anda, sunucunuzdaki bu runner görevi otomatik olarak alacak, uygulamayı derleyecek ve dosyaları IIS klasörünüze kopyalayacaktır. Güncelleme işlemi için artık manuel bir işlem yapmanıza gerek kalmamıştır.

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