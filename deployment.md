# Uygulama Dağıtım (Deployment) ve Versiyonlama Rehberi

Bu rehber, uygulamanın canlı ortama nasıl dağıtılacağını ve uygulama versiyonlarının nasıl yönetileceğini açıklar.

## 1. Dallanma ve Dağıtım Stratejisi

Projemiz, `main` dalının sürekli geliştirme için kullanıldığı ve `release` dalının kararlı, canlıya alınacak sürümleri barındırdığı bir iş akışı benimser.

-   **`main` Dalı:** Geliştiricilerin yeni özellikleri eklediği, hataları düzelttiği ve günlük olarak çalıştığı ana geliştirme dalıdır. Bu dala yapılan her `push` işlemi, canlı ortamı etkilemez.
-   **`release` Dalı:** Sadece test edilmiş, kararlı ve yayınlanmaya hazır kodları içerir. Bu dala bir kod birleştirildiğinde veya gönderildiğinde, otomatik dağıtım (deployment) süreci tetiklenir ve uygulama canlıya alınır.

**Önerilen Yöntem: GitHub Actions ile GitHub Pages'e Otomatik Dağıtım**

Bu yöntem, tüm kod ve dağıtım sürecini GitHub ekosisteminde tutmanızı sağlar, tamamen otomatiktir ve ücretsizdir.

### Neden Bu Yöntem?
- **Maliyetsiz ve Ölçeklenebilir:** GitHub'ın ücretsiz planı çoğu proje için yeterlidir.
- **Hızlı ve Güvenli:** Dosyalarınız küresel bir CDN (Content Delivery Network) üzerinden sunulur, bu da hızlı yükleme süreleri sağlar. SSL (HTTPS) otomatik olarak yapılandırılır.
- **Otomatikleştirilmiş:** GitHub reponuzun `release` dalına her kod gönderdiğinizde, siteniz otomatik olarak derlenir ve canlıya alınır. Manuel yükleme zahmetini ortadan kaldırır.

### Kurulum Adımları

1.  **Repo Ayarları:**
    - GitHub reponuzun `Settings` -> `Pages` bölümüne gidin.
    - `Source` olarak "GitHub Actions" seçeneğini belirleyin.

2.  **GitHub Actions Workflow'u Oluşturma:**
    - Projenizin ana dizininde `.github/workflows` adında bir klasör oluşturun.
    - İçine `deploy.yml` adında bir dosya ekleyin ve aşağıdaki içeriği yapıştırın:

    ```yaml
    name: Deploy to GitHub Pages

    on:
      push:
        branches:
          - release # Sadece release branch'ine push yapıldığında çalışır

    permissions:
      contents: read
      pages: write
      id-token: write

    jobs:
      build-and-deploy:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout 🛎️
            uses: actions/checkout@v3

          - name: Setup Node.js
            uses: actions/setup-node@v3
            with:
              node-version: '18' # Projenize uygun Node.js versiyonu
              cache: 'npm'

          - name: Install dependencies 📦
            run: npm install

          - name: Build 🔧
            run: npm run build

          - name: Setup Pages
            uses: actions/configure-pages@v3

          - name: Upload artifact 🚀
            uses: actions/upload-pages-artifact@v2
            with:
              path: './dist' # Derlenmiş dosyaların olduğu klasör

          - name: Deploy to GitHub Pages 🚀
            id: deployment
            uses: actions/deploy-pages@v2
    ```
    - Bu dosyayı reponuza ekleyip `main` dalına push yaptığınızda henüz bir şey olmaz. Dağıtım, sadece `release` dalına bir kod gönderildiğinde başlayacaktır.

## 2. Versiyonlama ve Sürüm Yayınlama İş Akışı

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
    Bu `push` işlemi, `deploy.yml` dosyasındaki kuralı tetikleyecek ve GitHub Actions, uygulamanızı otomatik olarak derleyip canlıya alacaktır. GitHub reponuzun "Actions" sekmesinden dağıtım sürecinin ilerlemesini takip edebilirsiniz. İşlem tamamlandığında, siteniz güncellenmiş olacaktır.
```
</content>
  </change>
</changes>
```