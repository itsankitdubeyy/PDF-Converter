class PDFConverter {
    constructor() {
        this.selectedFiles = [];
        this.pdfFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    setupEventListeners() {
        // PDF upload
        document.getElementById('pdfDropZone').addEventListener('click', () => {
            document.getElementById('pdfFileInput').click();
        });
        
        document.getElementById('pdfFileInput').addEventListener('change', (e) => {
            this.handlePdfUpload(e.target.files[0]);
        });

        // File upload for PDF conversion
        document.getElementById('fileDropZone').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(Array.from(e.target.files));
        });

        // Drag and drop
        this.setupDragDrop();

        // Convert buttons
        document.getElementById('convertFromPdf').addEventListener('click', () => {
            this.convertFromPdf();
        });
        
        document.getElementById('convertToPdf').addEventListener('click', () => {
            this.convertToPdf();
        });
    }

    setupDragDrop() {
        ['pdfDropZone', 'fileDropZone'].forEach(id => {
            const zone = document.getElementById(id);
            
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('border-emerald-400');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('border-emerald-400');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('border-emerald-400');
                
                const files = Array.from(e.dataTransfer.files);
                if (id === 'pdfDropZone' && files[0]?.type === 'application/pdf') {
                    this.handlePdfUpload(files[0]);
                } else if (id === 'fileDropZone') {
                    this.handleFileUpload(files);
                }
            });
        });
    }

    handlePdfUpload(file) {
        if (file && file.type === 'application/pdf') {
            this.pdfFile = file;
            document.getElementById('convertFromPdf').disabled = false;
            document.getElementById('pdfDropZone').innerHTML = `
                <div class="text-center">
                    <i class="fas fa-file-pdf text-3xl text-red-400 mb-2"></i>
                    <p class="text-white/80">${file.name}</p>
                    <p class="text-white/50 text-sm">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            `;
        }
    }

    handleFileUpload(files) {
        this.selectedFiles = files.filter(file => 
            file.type.startsWith('image/') || 
            file.type === 'text/plain' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        
        this.updateFileList();
        document.getElementById('convertToPdf').disabled = this.selectedFiles.length === 0;
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center justify-between bg-white/10 p-3 rounded-lg file-item';
            fileItem.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-file text-white/60 mr-2"></i>
                    <span class="text-white/80 text-sm">${file.name}</span>
                </div>
                <button onclick="converter.removeFile(${index})" class="text-red-400 hover:text-red-300">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileList();
        document.getElementById('convertToPdf').disabled = this.selectedFiles.length === 0;
    }

    showProgress() {
        document.getElementById('progressSection').classList.remove('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
    }

    updateProgress(percent, text) {
        document.getElementById('progressBar').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }

    hideProgress() {
        document.getElementById('progressSection').classList.add('hidden');
    }

    showResults(downloads) {
        const resultsSection = document.getElementById('resultsSection');
        const downloadLinks = document.getElementById('downloadLinks');
        
        downloadLinks.innerHTML = '';
        downloads.forEach(download => {
            const link = document.createElement('a');
            link.href = download.url;
            link.download = download.filename;
            link.className = 'block w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-xl text-center font-semibold hover:from-green-600 hover:to-emerald-600 transition-all download-link';
            link.innerHTML = `<i class="fas fa-download mr-2"></i>Download ${download.filename}`;
            downloadLinks.appendChild(link);
        });
        
        resultsSection.classList.remove('hidden');
    }

    async convertFromPdf() {
        if (!this.pdfFile) return;
        
        this.showProgress();
        const format = document.getElementById('outputFormat').value;
        
        try {
            if (format === 'jpg' || format === 'png') {
                await this.pdfToImages(format);
            } else if (format === 'txt') {
                await this.pdfToText();
            } else if (format === 'docx') {
                await this.pdfToDocx();
            }
        } catch (error) {
            console.error('Conversion error:', error);
            alert('Conversion failed. Please try again.');
            this.hideProgress();
        }
    }

    async pdfToImages(format) {
        this.updateProgress(10, 'Loading PDF...');
        
        const arrayBuffer = await this.pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const downloads = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
            this.updateProgress(10 + (i / pdf.numPages) * 80, `Converting page ${i} of ${pdf.numPages}...`);
            
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport }).promise;
            
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, `image/${format}`, 0.9);
            });
            
            downloads.push({
                url: URL.createObjectURL(blob),
                filename: `page-${i}.${format}`
            });
        }
        
        this.updateProgress(100, 'Conversion complete!');
        setTimeout(() => {
            this.hideProgress();
            this.showResults(downloads);
        }, 500);
    }

    async pdfToText() {
        this.updateProgress(10, 'Extracting text...');
        
        const arrayBuffer = await this.pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            this.updateProgress(10 + (i / pdf.numPages) * 80, `Processing page ${i} of ${pdf.numPages}...`);
            
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `Page ${i}:\n${pageText}\n\n`;
        }
        
        const blob = new Blob([fullText], { type: 'text/plain' });
        
        this.updateProgress(100, 'Text extraction complete!');
        setTimeout(() => {
            this.hideProgress();
            this.showResults([{
                url: URL.createObjectURL(blob),
                filename: 'extracted-text.txt'
            }]);
        }, 500);
    }

    async pdfToDocx() {
        // Simplified DOCX conversion (text only)
        await this.pdfToText();
    }

    async convertToPdf() {
        if (this.selectedFiles.length === 0) return;
        
        this.showProgress();
        
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            let pageAdded = false;
            
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress((i / this.selectedFiles.length) * 90, `Processing ${file.name}...`);
                
                if (file.type.startsWith('image/')) {
                    await this.addImageToPdf(pdf, file, pageAdded);
                    pageAdded = true;
                } else if (file.type === 'text/plain') {
                    await this.addTextToPdf(pdf, file, pageAdded);
                    pageAdded = true;
                }
            }
            
            this.updateProgress(100, 'Generating PDF...');
            
            const pdfBlob = pdf.output('blob');
            
            setTimeout(() => {
                this.hideProgress();
                this.showResults([{
                    url: URL.createObjectURL(pdfBlob),
                    filename: 'converted-document.pdf'
                }]);
            }, 500);
        } catch (error) {
            console.error('PDF creation error:', error);
            alert('PDF creation failed. Please try again.');
            this.hideProgress();
        }
    }

    async addImageToPdf(pdf, file, pageAdded) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (pageAdded) pdf.addPage();
                
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const imgRatio = img.width / img.height;
                
                let width = pageWidth - 20;
                let height = width / imgRatio;
                
                if (height > pageHeight - 20) {
                    height = pageHeight - 20;
                    width = height * imgRatio;
                }
                
                const x = (pageWidth - width) / 2;
                const y = (pageHeight - height) / 2;
                
                pdf.addImage(img, 'JPEG', x, y, width, height);
                resolve();
            };
            img.src = URL.createObjectURL(file);
        });
    }

    async addTextToPdf(pdf, file, pageAdded) {
        const text = await file.text();
        if (pageAdded) pdf.addPage();
        
        const lines = pdf.splitTextToSize(text, 180);
        pdf.text(lines, 10, 20);
    }
}

// Initialize the converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.converter = new PDFConverter();
});