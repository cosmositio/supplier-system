// ==========================================
// COA ARŞİV - Google Apps Script Backend
// Bu kodu Google Apps Script'e yapıştırın
// ==========================================

// Sheet adı - Türkçe ise "Sayfa1", İngilizce ise "Sheet1"
const SHEET_NAME = 'COA_Arsiv';

// CORS için header'lar
function doGet(e) {
  return handleCORS(e, processGet);
}

function doPost(e) {
  return handleCORS(e, processPost);
}

function handleCORS(e, handler) {
  const response = handler(e);
  return response;
}

function processGet(e) {
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
        // GET ile de ekleme yapabilmek için (JSONP desteği)
        const data = e.parameter.data ? JSON.parse(e.parameter.data) : null;
        result = data ? addCOA(data) : { success: false, error: 'Veri eksik' };
        break;
      case 'deleteCOA':
        result = deleteCOA(e.parameter.id);
        break;
      case 'getStats':
        result = getStats();
        break;
      default:
        result = { success: false, error: 'Geçersiz action: ' + action };
    }
  } catch(error) {
    result = { success: false, error: error.toString(), stack: error.stack };
  }
  
  // JSONP callback desteği
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function processPost(e) {
  const action = e.parameter.action;
  let result;
  
  try {
    let postData = {};
    
    // Form data veya JSON data olabilir
    if (e.postData) {
      const contentType = e.postData.type;
      if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        // Form data - parse et
        const formData = e.postData.contents;
        const params = formData.split('&');
        for (const param of params) {
          const [key, value] = param.split('=');
          if (key === 'data') {
            postData = JSON.parse(decodeURIComponent(value));
          }
        }
      } else {
        // JSON data
        postData = JSON.parse(e.postData.contents);
      }
    }
    
    // Parameter'dan da data gelebilir
    if (e.parameter.data && Object.keys(postData).length === 0) {
      postData = JSON.parse(e.parameter.data);
    }
    
    switch(action) {
      case 'addCOA':
        result = addCOA(postData);
        break;
      case 'updateCOA':
        result = updateCOA(e.parameter.id, postData);
        break;
      case 'deleteCOA':
        result = deleteCOA(e.parameter.id);
        break;
      default:
        result = { success: false, error: 'Geçersiz POST action: ' + action };
    }
  } catch(error) {
    result = { success: false, error: error.toString(), details: e.postData ? e.postData.type : 'no postData' };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== Sheet İşlemleri ====================

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  // Sheet yoksa oluştur
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Başlıkları ekle
    const headers = ['id', 'supplier', 'materialCode', 'deliveryDate', 'lotNumber', 'notes', 'fileName', 'fileType', 'fileData', 'createdAt'];
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
