# Tedarikçi Analiz Sistemi - Hızlı Başlangıç

## 📌 Temel Dosyalar

- **index.html** - Ana uygulama (tarayıcıda açın)
- **debug.html** - Dosya tanılama aracı (sorun yaşıyorsanız kullanın)
- **SORUN_COZUMU.md** - Detaylı sorun giderme rehberi

## 🚀 Hızlı Başlangıç

1. **index.html** dosyasını tarayıcıda açın
2. Excel dosyasını yükleyin
3. Hesaplamaları görün ve düzenleyin

## ❓ "Hesaplamaları Görmüyorum" Hatası?

### Adım 1: debug.html Aracını Kullanın
```
1. debug.html dosyasını tarayıcıda açın
2. Excel dosyasını sürükle-bırak yöntemiyle yükleyin
3. Dosyada hangi sütunların olduğunu kontrol edin
```

### Adım 2: Konsolu Kontrol Edin
```
1. index.html'de dosya yükledikten sonra F12 tuşuna basın
2. "Console" sekmesini açın
3. Şu satırları arayın:
   
   "Sevk sütunları: X"
   "İade sütunları: Y" 
   "Hata sütunları: Z"

   Eğer hepsi 0 ise → SORUN_COZUMU.md dosyasını okuyun
   Eğer 0 değilse → Diğer hataları kontrol edin
```

## 📋 Dosya Yapısı Gereksinimleri

### Mutlaka Bulunması Gereken Sütunlar:

```
┌─────────────────┬──────────────────────────────────────┐
│ Sütun Adı       │ Kabul Edilen Yazımlar                │
├─────────────────┼──────────────────────────────────────┤
│ Tedarikçi       │ "Tedarikçi" / "Firma" / "Supplier"   │
│ Sevk            │ "Sevk" / "Sevkiyat" / "Shipment"     │
│ İade            │ "İade" / "Return"                    │
│ Hata            │ "Hata" / "Error" / "Defect"          │
│ Durum           │ "Durum" / "Status" (isteğe bağlı)    │
└─────────────────┴──────────────────────────────────────┘
```

### Ay Bilgisi:
Sevk, İade ve Hata sütunlarının başlığında **ay numarası (1-12)** olmalıdır:

✅ **Doğru:**
- "1 Sevk" / "Sevk 1" / "Sevk (1)" → Ocak
- "2 İade" / "İade 2" → Şubat
- "Ocak Hata" / "Hata Ocak"
- "1" / "2" (başlık adı sadece ay numarası)

❌ **Yanlış:**
- "Sevk" (ay bilgisi yok)
- "Sevkiyat" (ay bilgisi yok)
- "13 Sevk" (ay numarası 13 – geçersiz)

## 📊 Örnek Dosya

### Yapı 1: Ay numarası ön/arka tarafta
```
Tedarikçi | Durum  | 1 Sevk | 1 İade | 1 Hata | 2 Sevk | 2 İade | 2 Hata | ...
----------|--------|--------|--------|--------|--------|--------|--------|
A Firma   | ONAYLI | 1000   | 5      | 2      | 1100   | 6      | 3      | ...
B Şirketi | ONAYLI | 2000   | 10     | 1      | 2100   | 12     | 2      | ...
```

### Yapı 2: Ay adı
```
Tedarikçi | Durum  | Ocak Sevk | Ocak İade | Ocak Hata | Şubat Sevk | ...
----------|--------|-----------|-----------|-----------|------------|
A Firma   | ONAYLI | 1000      | 5         | 2         | 1100       | ...
B Şirketi | ONAYLI | 2000      | 10        | 1         | 2100       | ...
```

## 🔧 Konsol Mesajları

Dosya yüklendikten sonra konsoldaki şu mesajları kontrol edin:

```
=== DOSYA ANALİZİ BAŞLADI ===
✅ Toplam Satır: 50
✅ Toplam Sütun: 20
✅ Sütun Başlıkları: [...] 
Sevk sütunları: 12        ← Bulundu!
İade sütunları: 12        ← Bulundu!
Hata sütunları: 12        ← Bulundu!
```

**Tüm sayılar 0 ise** → Sütun adlarını debug.html ile kontrol edin

## 💡 Yaygın Sorunlar ve Çözümleri

| Sorun | Neden | Çözüm |
|-------|-------|--------|
| Hesaplamalar gösterilmiyor | Sütun adları uyuşmuyor | debug.html aracını kullanın |
| Hata mesajı: "Tedarikçi sütunu bulunamadı" | Tedarikçi sütun adı farklı | Excel'de sütun ismini "Tedarikçi" yapın |
| Ay filtreleri çalışmıyor | Sütunlarda ay bilgisi yok | Sütun başlıklarına ay numarası ekleyin |
| Tablo boş görüntüleniyor | Veri satırları yok | Excel dosyasında veri satırı olduğunu kontrol edin |

## 🔗 Dosya Linkler

- [**Ana Uygulama**](index.html) - Excel analiz sistemi
- [**Debug Aracı**](debug.html) - Dosya yapısını kontrol edin
- [**Sorun Çözümü**](SORUN_COZUMU.md) - Detaylı rehber

## 📞 İletişim

Hâlâ sorun yaşıyorsanız:
1. debug.html ile dosya yapısını kontrol edin
2. Konsol mesajlarını (F12 > Console) okuyun
3. SORUN_COZUMU.md dosyasını okuyun
4. Excel dosya örneğini kontrol edin

---

**Son Güncelleme:** 18 Ocak 2026
