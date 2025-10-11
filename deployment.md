# Uygulama Dağıtım (Deployment) ve Versiyonlama Rehberi

Bu rehber, uygulamanın canlı ortama nasıl dağıtılacağını ve uygulama versiyonlarının nasıl yönetileceğini açıklar.

## 1. Dallanma ve Dağıtım Stratejisi

Projemiz, `main` dalının sürekli geliştirme için kullanıldığı ve `release` dalının kararlı, canlıya alınacak sürümleri barındırdığı bir iş akışı benimser.

-   **`main` Dalı:** Geliştiricilerin yeni özellikleri eklediği, hataları düzelttiği ve günlük olarak çalıştığı ana geliştirme dalıdır. Bu dala yapılan her `push` işlemi, canlı ortamı etkilemez.
-   **`release` Dalı:** Sadece test edilmiş, kararlı ve yayınlanmaya hazır kodları içerir. Bu dala bir kod birleştirildiğinde veya gönderildiğinde, otomatik dağıtım (deployment) süreci tetiklenir ve uygulama canlıya alınır.

## 2. Dağıtım Yöntemi: GitHub Actions ve Self-Hosted Runner ile Otomatik Dağıtım

Bu yöntem, uygulamanın bir Windows sunucusundaki IIS ortamına otomatik olarak dağıtılmasını sağlar. Bu süreç, GitHub Actions tarafından yönetilir ve sunucuya kurulan bir "Self-Hosted Runner" aracılığıyla gerçekleştirilir.

### Neden Bu Yöntem?
- **Tam Otomasyon:** `release` dalına her kod gönderildiğinde, siteniz otomatik olarak derlenir ve canlıya alınır. Manuel dosya kopyalama zahmetini ortadan kaldırır.
- **Güvenli:** GitHub ve özel sunucunuz arasında güvenli bir köprü kurar. Sunucu şifrelerinizi veya hassas bilgilerinizi GitHub'a kaydetmeniz gerekmez.
- **Hızlı ve Hatasız:** Manuel işlemlerde oluşabilecek insan hatalarını ortadan kaldırır ve dağıtım sürecini standartlaştırır.

### Kurulum Adımları

Bu kurulum, **sadece bir kez** son kullanıcının sunucusunda veya sistem yöneticisi tarafından yapılır.

**Adım 1: GitHub'da Runner Token'ı Oluşturma**

1.  Uygulamanın GitHub deposuna gidin.
2.  `Settings` -> `Actions` -> `Runners` sekmelerine tıklayın.
3.  Sağ üstteki **`New self-hosted runner`** butonuna tıklayın.
4.  İşletim sistemi olarak **`Windows`** seçeneğini seçin. Mimarinin `x64` olduğundan emin olun.
5.  Sayfada, sunucunuzda çalıştırmanız gereken bir dizi komut (`Download` ve `Configure` başlıkları altında) görünecektir. **Bu sayfayı kapatmayın**, bir sonraki adımlarda bu komutlara ihtiyacınız olacak.

**Adım 2: Runner'ı Sunucuya İndirme ve Kurma**

Aşağıdaki adımları uygulamanın barındırılacağı Windows sunucusunda gerçekleştirin.

1.  **PowerShell'i Yönetici Olarak Açın:**
    Başlat menüsüne `PowerShell` yazın, **Windows PowerShell**'e sağ tıklayın ve **"Yönetici olarak çalıştır"** seçeneğini seçin.

2.  **Runner İçin Klasör Oluşturun:**
    Runner dosyalarını saklamak için bir klasör oluşturun. Örneğin:
    ```powershell
    mkdir C:\actions-runner
    cd C:\actions-runner
    ```

3.  **Runner'ı İndirin:**
    Bir önceki adımda açık bıraktığınız GitHub sayfasındaki **`Download`** başlığı altındaki komutları sırayla PowerShell'e yapıştırıp çalıştırın. Bu komutlar, runner yazılımını sunucunuza indirecek ve `.zip` dosyasından çıkaracaktır. Komutlar şuna benzer olacaktır:

    ```powershell
    # Örnek indirme komutu (GitHub sayfasındaki güncel versiyonu kopyalayın)
    Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.317.0/actions-runner-win-x64-2.317.0.zip -OutFile actions-runner-win-x64-2.317.0.zip
    
    # Zip'ten çıkarma komutu
    Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.317.0.zip", "$PWD")
    ```
    
**Adım 3: Runner'ı Yapılandırma ve Servis Olarak Başlatma**

1.  **Yapılandırma Komutunu Çalıştırın:**
    İndirme işlemi bittikten sonra, yine GitHub sayfasındaki **`Configure`** başlığı altındaki komutu çalıştırın. Bu komut, runner'ı GitHub deponuza bağlayacaktır.
    ```powershell
    ./config.cmd --url https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ --token TOKEN_BILGINIZ
    ```
    -   `config.cmd` komutunu çalıştırdığınızda, size birkaç soru sorulacaktır:
        -   **Enter the name of the runner group:** `Enter` tuşuna basarak varsayılanı (`default`) kabul edebilirsiniz.
        -   **Enter the name of runner:** `Enter` tuşuna basarak sunucu adını (`server-name`) kabul edebilirsiniz.
        -   **Enter additional labels:** `Enter` tuşuna basarak boş bırakabilirsiniz.
        -   **Enter name of work folder:** `Enter` tuşuna basarak varsayılanı (`_work`) kabul edebilirsiniz.

2.  **Runner'ı Servis Olarak Kurun:**
    Yapılandırma tamamlandıktan sonra, runner'ın sunucu yeniden başladığında bile otomatik olarak çalışması için onu bir Windows servisi olarak kurun:
    ```powershell
    ./svc.ps1 install
    ./svc.ps1 start
    ```
    -   Bu komutlardan sonra GitHub'daki runner sayfasını yenilediğinizde, yeni koşucunuzun `Idle` (Boşta) durumunda göründüğünü göreceksiniz.

**Adım 4: Gerekli Klasör İzinlerini Ayarlama (ÇOK ÖNEMLİ!)**

Runner'ın IIS klasörüne dosya yazabilmesi için, çalıştığı kullanıcıya ilgili klasör üzerinde yazma izni vermeniz gerekir.

1.  Uygulama dosyalarının bulunduğu klasöre gidin (örn: `C:\inetpub\wwwroot\stok-uygulamasi`).
2.  Klasöre sağ tıklayın ve `Properties` (Özellikler) seçeneğini seçin.
3.  `Security` (Güvenlik) sekmesine gidin ve `Edit...` butonuna tıklayın.
4.  `Add...` (Ekle) butonuna tıklayın.
5.  Açılan pencereye `NT AUTHORITY\NETWORK SERVICE` yazın ve `Check Names` butonuna tıklayın. Adın altı çizili hale gelmesi gerekir. `OK`'a tıklayın.
6.  `NETWORK SERVICE` kullanıcısını seçtikten sonra, alttaki izinler kutusunda `Modify` (Değiştir) izni için `Allow` (İzin Ver) kutucuğunu işaretleyin. Bu, `Read` ve `Write` izinlerini de otomatik olarak seçecektir.
7.  `Apply` ve `OK` butonlarına basarak tüm pencereleri kapatın.

**Adım 5: GitHub Actions Workflow'u Oluşturma**

- Projenizin ana dizininde `.github/workflows` adında bir klasör oluşturun.
- İçine `deploy.yml` adında bir dosya ekleyin ve aşağıdaki içeriği yapıştırın. Bu dosya, otomasyon sürecinin adımlarını tanımlar.

```yaml
name: Deploy to Windows IIS Server

on:
  push:
    branches:
      - release # Sadece 'release' dalına push yapıldığında çalışır

jobs:
  build-and-deploy:
    # Bu işin, sizin kurduğunuz sunucudaki runner'da çalışmasını sağlar
    runs-on: self-hosted 

    steps:
      - name: Checkout 🛎️
        # Kodu runner'ın çalıştığı makineye indirir
        uses: actions/checkout@v4

      - name: Setup Node.js
        # Projeyi derlemek için gerekli Node.js ortamını kurar
        uses: actions/setup-node@v4
        with:
          node-version: '18' # Projenize uygun Node.js versiyonu
          cache: 'npm'

      - name: Install dependencies 📦
        # Gerekli kütüphaneleri (paketleri) yükler
        run: npm install

      - name: Build 🔧
        # Uygulamayı derleyip 'dist' klasörünü oluşturur
        run: npm run build

      - name: Deploy to IIS 🚀
        # Derlenmiş dosyaları IIS klasörüne kopyalar
        run: |
          # DİKKAT: Bu yolu kendi sunucunuzdaki doğru IIS klasör yolu ile değiştirin!
          $targetPath = "C:\inetpub\wwwroot\stok-uygulamasi"
          
          Write-Host "Hedef klasördeki eski dosyalar siliniyor: $targetPath"
          if (Test-Path $targetPath) {
            Get-ChildItem -Path $targetPath | Remove-Item -Recurse -Force
          }
          
          Write-Host "'dist' klasöründeki yeni dosyalar kopyalanıyor..."
          Copy-Item -Path ".\dist\*" -Destination $targetPath -Recurse -Force
          
          Write-Host "Dağıtım tamamlandı!"
        shell: powershell
```

### Workflow Dosyasının Açıklaması

-   **`on: push: branches: [release]`**: Bu otomasyonun sadece `release` dalına yeni bir kod gönderildiğinde tetikleneceğini belirtir.
-   **`runs-on: self-hosted`**: En önemli kısımdır. Bu komut, işin GitHub'ın sanal makineleri yerine, sizin etiketlediğiniz ve sunucunuza kurduğunuz koşucuda çalışmasını sağlar.
-   **`steps`**: İşin adımlarını tanımlar. Kodları indirme (`checkout`), Node.js ortamını kurma, bağımlılıkları yükleme (`npm install`), uygulamayı derleme (`npm run build`) ve son olarak dosyaları kopyalama adımlarından oluşur.
-   **`Deploy to IIS` adımı**:
    -   `shell: powershell` komutu, bu adımı Windows PowerShell ile çalıştırır.
    -   `$targetPath` değişkenine, uygulamanızın IIS'te barındırıldığı klasörün tam yolunu yazmalısınız. **Bu yolu kendi sunucu yapılandırmanıza göre düzenlemeniz kritiktir.**
    -   Betik önce hedef klasördeki tüm eski dosyaları siler, sonra `dist` klasörünün içindeki yeni dosyaları oraya kopyalar.

## 3. Versiyonlama ve Sürüm Yayınlama İş Akışı

Yeni bir sürüm yayınlamak için aşağıdaki adımları izleyin. Bu süreç, versiyon numarasını güncellemeyi, değişiklikleri `release` dalına aktarmayı ve dağıtımı tetiklemeyi içerir.

### Kural: `MAJOR.MINOR.PATCH` (Örnek: `1.2.0`)
- **MAJOR (1):** Geriye dönük uyumluluğu bozan büyük değişiklikler yaptığınızda artırılır.
- **MINOR (2):** Geriye dönük uyumlu yeni özellikler eklediğinizde artırılır.
- **PATCH (0):** Geriye dönük uyumlu hata düzeltmeleri yaptığınızda artırılır.

### Versiyon Yayınlama Adımları

1.  **`main` Dalını Güncel Tutun:**
    Yeni sürüm için hazırlıklara başlamadan önce, `main` dalınızdaki tüm son değişikliklerin reponuza gönderildiğinden emin olun.
    ```bash
    git checkout main
    git pull origin main
    ```

2.  **`release` Dalına Geçin ve `main`'den Değişiklikleri Alın:**
    Yerel makinenizde `release` dalına geçin ve `main` dalındaki en son kararlı kodları bu dala birleştirin (`merge`).
    ```bash
    git checkout release
    git pull origin release
    git merge main
    ```
    *(Eğer birleştirme sırasında çakışma (conflict) olursa, bunları çözüp devam etmeniz gerekir.)*

3.  **Versiyon Numarasını Yükseltin:**
    `release` dalındayken, `npm version` komutunu kullanarak projenin versiyonunu yükseltin. Bu komut, `package.json` dosyasını güncelleyecek ve bu versiyon için bir Git etiketi (`git tag`) oluşturacaktır.

    -   Bir hata düzeltmesi için (Patch): `npm version patch`
    -   Yeni bir özellik için (Minor): `npm version minor`
    -   Büyük bir değişiklik için (Major): `npm version major`

    Örnek (yeni bir özellik eklediniz):
    ```bash
    npm version minor
    ```

4.  **`release` Dalını ve Etiketleri Sunucuya Gönderin:**
    Son olarak, güncellenmiş `release` dalını ve oluşturulan yeni versiyon etiketini GitHub'a gönderin. `--follow-tags` bayrağı, yeni oluşturulan etiketi de göndermenizi sağlar.
    ```bash
    git push origin release --follow-tags
    ```

5.  **Dağıtımı Kontrol Edin:**
    Bu `push` işlemi, `deploy.yml` dosyasındaki kuralı tetikleyecek ve sunucunuzdaki Self-Hosted Runner, uygulamayı otomatik olarak derleyip IIS klasörünüze kopyalayacaktır. GitHub reponuzun "Actions" sekmesinden dağıtım sürecinin ilerlemesini takip edebilirsiniz. İşlem tamamlandığında, siteniz güncellenmiş olacaktır.
