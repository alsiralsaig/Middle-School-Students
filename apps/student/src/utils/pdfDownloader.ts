import { ResourceItem } from '../types';
import { RESOURCE_DOCUMENTS, ResourceDocument } from '../data/resourcePagesData';

/**
 * تحميل المذكرة كملف PDF.
 *
 * ⚠️ كان هنا مولّد PDF مكتوب بالإيد يطلع ملف **تالف** (إزاحات xref ثابتة)
 * و**يحذف كل العربي** (لأن الخطوط اللاتينية ما بتدعمهوش) وفوق ده كان يكتب
 * داخل الملف "Verified by Ministry of Education" — انتحال صفة جهة حكومية.
 *
 * البديل الصحيح: نفتح نافذة طباعة A4 مصمّمة (**نفس مكوّن الطباعة الجاهز**)
 * والطالب يختار «حفظ كـ PDF» — يطلع ملف سليم والعربي فيه مظبوط 100%.
 */
export function downloadResourcePDF(item: ResourceItem): void {
  printResourceDocument(item);
}

/**
 * Formats a clean printable window for PDF pages so the student can print or "Save as PDF"
 * with complete A4 layout, headers, emblems, and typography.
 */
export function printResourceDocument(item: ResourceItem): void {
  const doc = RESOURCE_DOCUMENTS[item.id];
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const pagesHtml = doc
    ? doc.pages
        .map(
          (page) => `
    <div class="pdf-page">
      <div class="page-header">
        <div class="header-right">منصة الطالب السوداني الذكية<br/>محتوى تعليمي مطابق للمنهج القومي</div>
        <div class="header-center">الصف الثالث المتوسط — الشهادة المتوسطة<br/><strong>${doc.documentTitle}</strong></div>
        <div class="header-left">🇸🇩 إعداد المنصة<br/>الصفحة ${page.pageNumber} من ${doc.pageCount}</div>
      </div>
      <hr class="header-line" />
      <div class="page-title-block">
        <h2 class="page-title">${page.title}</h2>
        ${page.subtitle ? `<p class="page-subtitle">${page.subtitle}</p>` : ''}
      </div>
      <div class="page-content">
        ${page.sections
          .map((sec) => {
            let secHtml = '';
            if (sec.heading) secHtml += `<h3 class="section-heading">${sec.heading}</h3>`;
            if (sec.type === 'box') {
              secHtml += `<div class="box-content">${sec.content?.replace(/\n/g, '<br/>')}</div>`;
            } else if (sec.type === 'formula') {
              secHtml += `<div class="formula-box">${sec.content?.replace(/\n/g, '<br/>')}</div>`;
              if (sec.points) {
                secHtml += `<ul class="points-list">${sec.points.map((p) => `<li>${p}</li>`).join('')}</ul>`;
              }
            } else if (sec.type === 'table' && sec.tableData) {
              secHtml += `
                <table class="data-table">
                  <thead>
                    <tr>${sec.tableData.headers.map((h) => `<th>${h}</th>`).join('')}</tr>
                  </thead>
                  <tbody>
                    ${sec.tableData.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
                  </tbody>
                </table>
              `;
            } else if (sec.type === 'question' && sec.questionData) {
              secHtml += `
                <div class="question-card">
                  <div class="q-header">
                    <strong>${sec.questionData.qNumber}</strong>
                    ${sec.questionData.marks ? `<span class="q-marks">${sec.questionData.marks}</span>` : ''}
                  </div>
                  <p class="q-text">${sec.questionData.question}</p>
                  <div class="steps-block">
                    <strong>خطوات الحل النموذجية:</strong>
                    <ol>
                      ${sec.questionData.steps.map((st) => `<li>${st}</li>`).join('')}
                    </ol>
                  </div>
                  <div class="final-answer">
                    <strong>الإجابة النهائية:</strong> ${sec.questionData.finalAnswer}
                  </div>
                </div>
              `;
            } else if (sec.content) {
              secHtml += `<p class="text-p">${sec.content.replace(/\n/g, '<br/>')}</p>`;
              if (sec.points) {
                secHtml += `<ul class="points-list">${sec.points.map((p) => `<li>${p}</li>`).join('')}</ul>`;
              }
            }
            return secHtml;
          })
          .join('')}
      </div>
      <div class="page-footer">
        <div>المؤلف: ${doc.author}</div>
        <div>منصة الطالب السوداني الذكية · ${doc.publishYear}</div>
        <div>صفحة ${page.pageNumber} من ${doc.pageCount}</div>
      </div>
    </div>
    `
        )
        .join('')
    : `
    <div class="pdf-page">
      <h1>${item.title}</h1>
      <p>المادة: ${item.subjectName} | المؤلف: ${item.author}</p>
      <p>${item.description}</p>
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${item.title}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body {
          font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #111827;
          background: #fff;
          margin: 0;
          padding: 0;
          line-height: 1.6;
          direction: rtl;
        }
        .pdf-page {
          width: 100%;
          min-height: 270mm;
          box-sizing: border-box;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 5mm;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #1e3a8a;
          margin-bottom: 8px;
        }
        .header-line {
          border: 0;
          border-top: 2px solid #1e3a8a;
          margin-bottom: 12px;
        }
        .page-title {
          font-size: 17px;
          margin: 0 0 4px 0;
          color: #0f172a;
        }
        .page-subtitle {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 16px 0;
        }
        .section-heading {
          font-size: 14px;
          color: #1e3a8a;
          margin: 14px 0 6px 0;
          border-right: 4px solid #f59e0b;
          padding-right: 8px;
        }
        .box-content {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .formula-box {
          background: #eff6ff;
          border-right: 4px solid #2563eb;
          padding: 10px 14px;
          border-radius: 6px;
          font-family: monospace;
          font-weight: bold;
          font-size: 13px;
          color: #1e3a8a;
          margin-bottom: 10px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 11px;
        }
        .data-table th, .data-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          text-align: right;
        }
        .data-table th {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: bold;
        }
        .question-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 14px;
          background: #ffffff;
        }
        .q-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #1e3a8a;
          margin-bottom: 6px;
        }
        .q-marks {
          background: #fef3c7;
          color: #92400e;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
        }
        .steps-block {
          background: #f8fafc;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          margin: 8px 0;
        }
        .final-answer {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
        }
        .points-list {
          font-size: 12px;
          padding-right: 18px;
          margin: 6px 0;
        }
        .page-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          margin-top: 14px;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
