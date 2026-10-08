import Papa from 'papaparse';

export interface CsvSample {
  headers: string[];
  rows: string[][];
}

export function readCsvSample(file: File): Promise<CsvSample> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      preview: 6,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const [rawHeaders, ...rows] = data;
        if (!rawHeaders?.length) {
          reject(new Error('Не удалось прочитать заголовки CSV.'));
          return;
        }
        resolve({
          headers: rawHeaders.map((header, index) =>
            (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
          ),
          rows,
        });
      },
      error: () => reject(new Error('Не удалось прочитать CSV-файл.')),
    });
  });
}
