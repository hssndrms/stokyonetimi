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

1.  **Sunucuya Self-Hosted Runner Kurulumu:**
    Bu sürecin en kritik adımı, dağıtımın yapılacağı Windows sunucusuna bir "Self-Hosted Runner" kurmaktır. Bu, GitHub'dan gelen komutları dinleyen ve sunucunuzda çalıştıran küçük bir programdır.
    
    Detaylı kurulum adımları için projenin ana dizinindeki `README.md` dosyasının **"Otomatik Dağıtım (CI/CD ile Windows Sunucusu - IIS)"** bölümünü takip edin.

2.  **GitHub Actions Workflow'u Oluşturma:**
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
