# Masaüstü Uygulama Kurulum ve Dağıtım Rehberi (Tauri)

Bu rehber, uygulamanın Tauri ile paketlenmiş masaüstü versiyonunun son kullanıcılar tarafından nasıl kurulacağını ve geliştiriciler tarafından yeni sürümlerin nasıl oluşturulup yayınlanacağını açıklar.

## 1. Son Kullanıcılar İçin: Uygulamayı Yükleme ve Kullanma

Masaüstü uygulamasını kullanmak için bir geliştirici olmanıza gerek yoktur. Sadece işletim sisteminize uygun kurulum dosyasını indirip çalıştırmanız yeterlidir.

### Kurulum Adımları

1.  **Releases Sayfasına Gidin:**
    Projenin GitHub deposuna gidin ve sağ taraftaki menüden **"Releases"** başlığına tıklayın.

2.  **En Son Sürümü Bulun:**
    Açılan sayfada, en üstte yer alan sürüm en güncel olanıdır (genellikle "Latest" olarak etiketlenmiştir).

3.  **Kurulum Dosyasını İndirin:**
    Sürüm notlarının altındaki **"Assets"** bölümünü genişletin. İşletim sisteminize uygun dosyayı indirin:
    -   **Windows için:** `.msi` uzantılı dosyayı indirin (örneğin: `Stok-Takip-Uygulamasi_1.4.1_x64_en-US.msi`).
    -   **macOS için:** `.app.tar.gz` uzantılı dosyayı indirin.

4.  **Kurulumu Başlatın:**
    -   **Windows'ta:** İndirdiğiniz `.msi` dosyasına çift tıklayın ve ekrandaki kurulum sihirbazını takip edin. Kurulum tamamlandığında, uygulama Başlat menünüze ve/veya masaüstünüze eklenecektir.
    -   **macOS'te:** İndirdiğiniz `.tar.gz` dosyasını açın. Ortaya çıkan `.app` dosyasını `Applications` (Uygulamalar) klasörünüze sürükleyin.

5.  **Uygulamayı Çalıştırın:**
    Kurulum tamamlandıktan sonra, uygulamayı diğer programlarınız gibi başlatabilirsiniz. İlk açılışta sizden Supabase bağlantı bilgilerinizi girmeniz istenecektir. Bu bilgileri girdikten sonra uygulama kullanıma hazır olacaktır.

---

## 2. Geliştiriciler İçin: Yeni Bir Sürüm Oluşturma ve Yayınlama

Bu bölüm, geliştiricilerin yeni bir masaüstü uygulama sürümünü nasıl derleyip yayınlayacağını açıklar. Süreç, GitHub Actions ile tamamen otomatize edilmiştir.

### Ön Gereksinimler

Masaüstü uygulamasını yerel makinenizde derleyebilmek için sisteminizde Rust ve diğer bazı bağımlılıkların kurulu olması gerekir.

1.  **Tauri Kurulum Rehberini Takip Edin:**
    [Tauri'nin resmi "Prerequisites" rehberini](https://tauri.app/v1/guides/getting-started/prerequisites) takip ederek işletim sisteminize (Windows, macOS veya Linux) göre gerekli tüm araçları (Rust, WebView2 vb.) kurun.

### Yeni Bir Sürüm Yayınlama İş Akışı

Yeni bir masaüstü sürümü yayınlamak, web sürümüyle benzer bir iş akışı izler ancak son adımda `release` dalına doğrudan `push` yapmak yerine bir versiyon etiketi (`tag`) oluşturulur.

1.  **`main` Dalını `release` Dalı ile Birleştirin:**
    Test edilmiş ve yayınlanmaya hazır olan `main` dalındaki son değişiklikleri `release` dalına birleştirin.
    ```bash
    git checkout release
    git pull origin release
    git merge main
    ```

2.  **Versiyon Numarasını Yükseltin:**
    `npm version` komutunu kullanarak projenin versiyonunu (`package.json` ve `src-tauri/tauri.conf.json` içinde) güncelleyin. Bu komut aynı zamanda bu versiyon için bir Git etiketi oluşturacaktır.
    -   Küçük bir hata düzeltmesi için: `npm version patch`
    -   Yeni bir özellik eklediyseniz: `npm version minor`
    -   Büyük, geriye uyumsuz bir değişiklik yaptıysanız: `npm version major`

    Örnek:
    ```bash
    npm version patch # v1.4.1 -> v1.4.2
    ```

3.  **Değişiklikleri ve Etiketleri GitHub'a Gönderin:**
    Güncellenmiş `release` dalını ve yeni oluşturulan versiyon etiketini GitHub'a gönderin.
    ```bash
    git push origin release --follow-tags
    ```

### Otomatik Süreç Nasıl Çalışır?

Yukarıdaki `git push` komutunu çalıştırdığınızda, projedeki `.github/workflows/release-desktop.yml` dosyasında tanımlanan GitHub Actions iş akışı otomatik olarak tetiklenir. Bu iş akışı aşağıdaki adımları gerçekleştirir:

1.  **Tetiklenme:** Yeni bir versiyon etiketinin (`v*.*.*` formatında) gönderildiğini algılar.
2.  **Derleme:** Farklı işletim sistemleri (Windows ve macOS) için sanal makineler başlatır.
3.  **Kurulum:** Her sanal makinede Node.js ve Rust ortamını kurar.
4.  **Paketleme:** `npm install` ve `npm run tauri:build` komutlarını çalıştırarak uygulamayı derler ve kurulum dosyalarını (.msi, .app.tar.gz) oluşturur.
5.  **Yayınlama:** Otomatik olarak GitHub'da yeni bir "Release" (Sürüm) taslağı oluşturur.
6.  **Yükleme:** Derlenen kurulum dosyalarını bu yeni sürümün "Assets" bölümüne yükler.

Bu süreç tamamlandığında, son kullanıcılar yukarıdaki "Son Kullanıcılar İçin" bölümünde anlatıldığı gibi yeni sürümü GitHub Releases sayfasından indirebilirler. Dağıtım için ek bir manuel işlem yapmanıza gerek yoktur.
