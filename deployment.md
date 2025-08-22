# Uygulama Dağıtım (Deployment) ve Versiyonlama Rehberi

Bu rehber, uygulamanın canlı ortama nasıl dağıtılacağını ve uygulama versiyonlarının nasıl yönetileceğini açıklar.

## 1. Dağıtım (Deployment) Stratejisi

Uygulamamız, `npm run build` komutuyla statik dosyalara (HTML, CSS, JS) derlenen bir React uygulamasıdır. Bu, dağıtım için bize çok esnek ve modern seçenekler sunar.

**Önerilen Yöntem: GitHub Actions ile GitHub Pages'e Otomatik Dağıtım**

Bu yöntem, tüm kod ve dağıtım sürecini GitHub ekosisteminde tutmanızı sağlar, tamamen otomatiktir ve ücretsizdir.

### Neden Bu Yöntem?
- **Maliyetsiz ve Ölçeklenebilir:** GitHub'ın ücretsiz planı çoğu proje için yeterlidir.
- **Hızlı ve Güvenli:** Dosyalarınız küresel bir CDN (Content Delivery Network) üzerinden sunulur, bu da hızlı yükleme süreleri sağlar. SSL (HTTPS) otomatik olarak yapılandırılır.
- **Otomatikleştirilmiş:** GitHub reponuzun `main` branch'ine her kod gönderdiğinizde (push), siteniz otomatik olarak derlenir ve canlıya alınır. Manuel yükleme zahmetini ortadan kaldırır.

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
          - main # Sadece main branch'ine push yapıldığında çalışır

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
    - Bu dosyayı reponuza ekleyip `main` branch'ine push yaptığınızda, GitHub Actions otomatik olarak projenizi derleyecek ve `kullanici-adiniz.github.io/repo-adiniz` adresinde yayınlayacaktır.

## 2. Uygulama Versiyon Takibi

Veritabanı versiyonlamasına ek olarak, uygulama kodunun versiyonunu da takip etmek önemlidir. Bunun için endüstri standardı olan **Semantic Versioning (Anlamsal Sürümleme)** kullanılır.

### Kural: `MAJOR.MINOR.PATCH` (Örnek: `1.2.0`)
- **MAJOR (1):** Geriye dönük uyumluluğu bozan büyük değişiklikler yaptığınızda artırılır.
- **MINOR (2):** Geriye dönük uyumlu yeni özellikler eklediğinizde artırılır.
- **PATCH (0):** Geriye dönük uyumlu hata düzeltmeleri yaptığınızda artırılır.

### Versiyon Yönetimi

1.  **Tek Kaynak: `package.json`**
    Uygulamanızın versiyonu için tek bir doğruluk kaynağı olmalıdır: `package.json` dosyasındaki `version` alanı.

    ```json
    // package.json
    {
      "name": "stok-takip-uygulamasi",
      "version": "1.0.0", // Versiyon bilgisi burada tutulur
      // ...
    }
    ```

2.  **Versiyonu `npm` ile Yükseltme**
    Versiyonu manuel olarak değiştirmek yerine `npm`'in kendi komutunu kullanmak en iyi pratiktir. Bu komut hem `package.json` dosyasını günceller hem de bu versiyon için bir Git etiketi (`git tag`) oluşturur.

    -   Bir hata düzeltmesi yaptınız (Patch güncellemesi):
        ```bash
        npm version patch
        ```
        (Sonuç: `1.0.0` -> `1.0.1`)

    -   Yeni bir özellik eklediniz (Minor güncellemesi):
        ```bash
        npm version minor
        ```
        (Sonuç: `1.0.1` -> `1.1.0`)

    -   Büyük, uyumsuz bir değişiklik yaptınız (Major güncellemesi):
        ```bash
        npm version major
        ```
        (Sonuç: `1.1.0` -> `2.0.0`)

    Bu komutu çalıştırdıktan sonra değişiklikleri ve yeni etiketi Git reponuza aşağıdaki komutla gönderin:
    ```bash
    git push --follow-tags
    ```

3.  **Versiyonu Arayüzde Gösterme**
    Kullanıcıların veya sizin, uygulamanın hangi versiyonunu kullandığını görmesi çok faydalıdır. Bunu genellikle Ayarlar sayfasının bir köşesinde veya bir "Hakkında" penceresinde gösteririz.

    Bunu yapmak için `package.json`'daki versiyonu uygulamaya almamız gerekir. En basit yolu, versiyonu tutan ayrı bir dosya oluşturmaktır.

    -   **Adım 1:** `src/version.ts` adında bir dosya oluşturun:
        ```typescript
        export const APP_VERSION = '1.0.0';
        ```
    -   **Adım 2:** `package.json`'daki versiyonu `npm version` ile güncellediğinizde, bu dosyayı da güncellemeyi bir alışkanlık haline getirin.
    -   **Adım 3:** İstediğiniz bir bileşende bu versiyonu gösterin. Örneğin `pages/SuppliersPage.tsx` (Genel Ayarlar sayfası) içinde:
        ```tsx
        import { APP_VERSION } from '../../version'; // Dosya yolunu ayarlayın

        const GeneralSettingsPage = () => {
          // ...
          return (
            <div>
              {/* ...diğer ayarlar... */}
              <div className="text-center mt-8 text-sm text-slate-500">
                Uygulama Versiyonu: {APP_VERSION}
              </div>
            </div>
          );
        };
        ```
