import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { useToast } from '../context/ToastContext';

export const exportToCsv = async (filename: string, rows: Record<string, any>[], addToast: (message: string, type: 'success' | 'error' | 'info') => void) => {
  if (!rows || rows.length === 0) {
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date 
          ? cell.toLocaleString() 
          : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  // @ts-ignore - __TAURI__ global değişkeni Tauri tarafından enjekte edilir.
  if (window.__TAURI__) {
    try {
      const filePath = await save({
        defaultPath: `${filename}.csv`,
        filters: [{
          name: 'CSV File',
          extensions: ['csv']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, csvContent);
        addToast('Dosya başarıyla kaydedildi.', 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Dosya kaydedilirken bir hata oluştu.', 'error');
    }
  } else {
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
