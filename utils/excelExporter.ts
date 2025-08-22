declare var XLSX: any;

export const exportToExcel = (filename: string, rows: Record<string, any>[]) => {
  if (typeof XLSX === 'undefined') {
    console.error('XLSX library is not loaded. Please make sure to include it in your HTML.');
    // The calling component is now responsible for showing an error toast.
    return;
  }
    
  if (!rows || rows.length === 0) {
    // The calling component is now responsible for showing an error toast.
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
