// ==========================================
// COA ARŞİV - Google Apps Script Backend
// Bu kodu Google Apps Script'e yapıştırın
// ==========================================

// Sheet adı
const SHEET_NAME = 'COA_Arsiv';
const ALTERNATIVE_NAMES = ['COA Arşiv', 'COA_Arsiv', 'COA Arsiv', 'Sayfa1', 'Sheet1'];

// Drive klasör ID - boş bırakın otomatik oluşturulsun
let DRIVE_FOLDER_ID = '';

// Geçici veri deposu (chunk'lar için)
const CHUNK_CACHE = {};

// ==================== Ana Fonksiyonlar ====================

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  let result;
  
  try {
    switch(action) {
      case 'test':
        result = { success: true, message: 'Bağlantı başarılı!', time: new Date().toISOString() };
        break;
      case 'getAllCOA':
        result = getAllCOA();
        break;
      case 'getCOA':
        result = getCOA(e.parameter.id);
        break;
      case 'addCOA':
        const data = e.parameter.data ? JSON.parse(e.parameter.data) : null;
        result = data ? addCOA(data) : { success: false, error: 'Veri eksik' };
        break;
      case 'deleteCOA':
        result = deleteCOA(e.parameter.id);
        break;
      case 'uploadChunk':
        result = uploadChunk(e.parameter);
        break;
      case 'finalizeUpload':
        result = finalizeUpload(e.parameter);
        break;
      default:
        result = { success: false, error: 'Geçersiz action: ' + action };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;
  try {
    const action = e.parameter.action;
    let postData = {};
    
    if (e.postData) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch(err) {
        // Form data olabilir
        const formData = e.postData.contents;
        const params = formData.split('&');
        for (const param of params) {
          const idx = param.indexOf('=');
          if (idx > 0) {
            const key = param.substring(0, idx);
            const value = decodeURIComponent(param.substring(idx + 1));
            if (key === 'data') {
              postData = JSON.parse(value);
            } else if (key === 'chunk') {
              postData.chunk = value;
            } else {
              postData[key] = value;
            }
          }
        }
      }
    }
    
    switch(action) {
      case 'addCOA':
        result = addCOA(postData);
        break;
      case 'uploadChunk':
        result = uploadChunk(postData);
        break;
      case 'finalizeUpload':
        result = finalizeUpload(postData);
        break;
      default:
        result = { success: false, error: 'Geçersiz action' };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== Drive İşlemleri ====================

function getDriveFolder() {
  let folder;
  
  // Mevcut klasörü bul
  const folders = DriveApp.getFoldersByName('COA_Sertifikalar');
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    // Klasör yoksa oluştur
    folder = DriveApp.createFolder('COA_Sertifikalar');
    // Herkese açık yap (görüntüleme)
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  
  return folder;
}

function uploadFileToDrive(base64Data, fileName, mimeType) {
  try {
    const folder = getDriveFolder();
    
    // Base64'ten blob oluştur
    const base64Content = base64Data.split(',')[1] || base64Data;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), mimeType, fileName);
    
    // Dosyayı Drive'a kaydet
    const file = folder.createFile(blob);
    
    // Herkese açık yap
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Görüntüleme linkini al
    const fileId = file.getId();
    const viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
    const directUrl = 'https://drive.google.com/uc?id=' + fileId;
    
    return {
      success: true,
      fileId: fileId,
      viewUrl: viewUrl,
      directUrl: directUrl,
      fileName: fileName
    };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ==================== Chunk Upload İşlemleri ====================

function uploadChunk(params) {
  const uploadId = params.uploadId;
  const chunkIndex = parseInt(params.chunkIndex);
  const totalChunks = parseInt(params.totalChunks);
  const chunk = params.chunk;
  
  if (!uploadId || chunkIndex === undefined || !chunk) {
    return { success: false, error: 'Eksik parametreler' };
  }
  
  // Cache'i al veya oluştur
  const cache = CacheService.getScriptCache();
  const cacheKey = 'upload_' + uploadId;
  
  // Mevcut chunk'ları al
  let chunks = {};
  const cached = cache.get(cacheKey);
  if (cached) {
    chunks = JSON.parse(cached);
  }
  
  // Yeni chunk'ı ekle
  chunks[chunkIndex] = chunk;
  chunks.totalChunks = totalChunks;
  
  // Cache'e kaydet (6 saat geçerli)
  cache.put(cacheKey, JSON.stringify(chunks), 21600);
  
  const receivedCount = Object.keys(chunks).filter(k => k !== 'totalChunks').length;
  
  return {
    success: true,
    uploadId: uploadId,
    chunkIndex: chunkIndex,
    received: receivedCount,
    total: totalChunks
  };
}

function finalizeUpload(params) {
  const uploadId = params.uploadId;
  const fileName = params.fileName;
  const mimeType = params.mimeType;
  const recordData = params.recordData ? JSON.parse(params.recordData) : null;
  
  if (!uploadId || !fileName) {
    return { success: false, error: 'Eksik parametreler' };
  }
  
  const cache = CacheService.getScriptCache();
  const cacheKey = 'upload_' + uploadId;
  const cached = cache.get(cacheKey);
  
  if (!cached) {
    return { success: false, error: 'Upload bulunamadı veya süre doldu' };
  }
  
  const chunks = JSON.parse(cached);
  const totalChunks = chunks.totalChunks;
  
  // Tüm chunk'ları birleştir
  let fullBase64 = '';
  for (let i = 0; i < totalChunks; i++) {
    if (!chunks[i]) {
      return { success: false, error: 'Eksik chunk: ' + i };
    }
    fullBase64 += chunks[i];
  }
  
  // Drive'a yükle
  const uploadResult = uploadFileToDrive(fullBase64, fileName, mimeType);
  
  if (!uploadResult.success) {
    return uploadResult;
  }
  
  // Cache'i temizle
  cache.remove(cacheKey);
  
  // Eğer kayıt verisi varsa, Sheets'e de ekle
  if (recordData) {
    recordData.fileUrl = uploadResult.viewUrl;
    recordData.driveFileId = uploadResult.fileId;
    addCOA(recordData);
  }
  
  return {
    success: true,
    fileId: uploadResult.fileId,
    viewUrl: uploadResult.viewUrl,
    directUrl: uploadResult.directUrl
  };
}

// ==================== Sheet İşlemleri ====================

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    for (const name of ALTERNATIVE_NAMES) {
      sheet = ss.getSheetByName(name);
      if (sheet) break;
    }
  }
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['id', 'supplier', 'materialCode', 'deliveryDate', 'lotNumber', 'notes', 'fileName', 'fileType', 'fileUrl', 'driveFileId', 'createdAt'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function getAllCOA() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return { success: true, data: [] };
  }
  
  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const headers = data[0];
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // id varsa
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = data[i][j];
      }
      records.push(record);
    }
  }
  
  // En yeniler başta
  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return { success: true, data: records, count: records.length };
}

function getCOA(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = data[i][j];
      }
      return { success: true, data: record };
    }
  }
  
  return { success: false, error: 'Kayıt bulunamadı' };
}

function addCOA(record) {
  const sheet = getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // ID kontrolü
  if (!record.id) {
    record.id = 'coa_' + Date.now();
  }
  
  // createdAt yoksa ekle
  if (!record.createdAt) {
    record.createdAt = new Date().toISOString();
  }
  
  // Satır verisini oluştur
  const row = headers.map(header => record[header] || '');
  
  // Satırı ekle
  sheet.appendRow(row);
  
  return { 
    success: true, 
    id: record.id, 
    message: 'COA kaydedildi',
    timestamp: new Date().toISOString()
  };
}

function updateCOA(id, newData) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      // Mevcut veriyi güncelle
      const row = headers.map((header, j) => {
        if (newData.hasOwnProperty(header)) {
          return newData[header];
        }
        return data[i][j];
      });
      
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return { success: true, message: 'Kayıt güncellendi' };
    }
  }
  
  return { success: false, error: 'Kayıt bulunamadı' };
}

function deleteCOA(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Kayıt silindi' };
    }
  }
  
  return { success: false, error: 'Kayıt bulunamadı' };
}

function getStats() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return { success: true, data: { total: 0, suppliers: 0, thisMonth: 0 } };
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const supplierCol = headers.indexOf('supplier');
  const dateCol = headers.indexOf('deliveryDate');
  
  const suppliers = new Set();
  let thisMonth = 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0]) {
      if (supplierCol >= 0 && data[i][supplierCol]) {
        suppliers.add(data[i][supplierCol]);
      }
      if (dateCol >= 0 && data[i][dateCol]) {
        const dateStr = data[i][dateCol].toString();
        if (dateStr.startsWith(currentMonth)) {
          thisMonth++;
        }
      }
    }
  }
  
  return { 
    success: true, 
    data: { 
      total: data.filter(r => r[0]).length, 
      suppliers: suppliers.size, 
      thisMonth: thisMonth 
    } 
  };
}

// ==================== Test Fonksiyonu ====================
function testAPI() {
  // Manuel test için
  console.log('Test başlıyor...');
  
  // 1. Sheet oluştur/kontrol et
  const sheet = getSheet();
  console.log('Sheet: ' + sheet.getName());
  
  // 2. Test kaydı ekle
  const testRecord = {
    id: 'test_' + Date.now(),
    supplier: 'Test Tedarikçi',
    materialCode: 'TEST001',
    deliveryDate: '2026-01-30',
    lotNumber: 'LOT123',
    notes: 'Test kaydı',
    fileName: 'test.jpg',
    fileType: 'image/jpeg',
    fileData: 'data:image/jpeg;base64,TEST',
    createdAt: new Date().toISOString()
  };
  
  const addResult = addCOA(testRecord);
  console.log('Ekleme sonucu: ' + JSON.stringify(addResult));
  
  // 3. Tüm kayıtları al
  const allResult = getAllCOA();
  console.log('Toplam kayıt: ' + allResult.count);
  
  // 4. İstatistikler
  const stats = getStats();
  console.log('İstatistikler: ' + JSON.stringify(stats));
}

// ==================== Kurulum Talimatları ====================
/*
KURULUM ADIMLARI:

1. Google Sheets aç: https://sheets.google.com
2. Yeni bir Spreadsheet oluştur
3. Menüden: Uzantılar → Apps Script
4. Bu kodun tamamını yapıştır
5. Kaydet (Ctrl+S)
6. testAPI() fonksiyonunu çalıştır (test için)
7. Dağıt → Yeni dağıtım:
   - Tür: Web uygulaması
   - Yürütme: Ben
   - Erişim: Herkes (anonim dahil)
8. URL'yi kopyala
9. coa-arsiv.html sayfasında bu URL'yi gir

NOT: Her kod değişikliğinde YENİ DAĞITIM yapın!
Mevcut dağıtımı güncellemeyin, yeni oluşturun.
*/
