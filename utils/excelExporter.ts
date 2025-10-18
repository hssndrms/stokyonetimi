import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';
import { useToast } from '../context/ToastContext';

declare var XLSX: any;

export const exportToExcel = async (filename: string, rows: Record<string, any>[], addToast: (message: string, type: 'success' | 'error' | 'info') => void) => {
  if (typeof XLSX === 'undefined') {
    console.error('XLSX library is not loaded.');
    return;
  }
    
  if (!rows || rows.length === 0) {
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor');

  // @ts-ignore - __TAURI__ global değişkeni Tauri tarafından enjekte edilir.
  if (window.__TAURI__) {
    try {
      const filePath = await save({
        defaultPath: `${filename}.xlsx`,
        filters: [{
          name: 'Excel Workbook',
          extensions: ['xlsx']
        }]
      });

      if (filePath) {
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        await writeBinaryFile(filePath, wbout);
        addToast('Dosya başarıyla kaydedildi.', 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Dosya kaydedilirken bir hata oluştu.', 'error');
    }
  } else {
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
};
