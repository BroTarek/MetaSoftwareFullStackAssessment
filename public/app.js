class ResumableUploader {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.dropZone = document.getElementById('dropZone');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.statusText = document.getElementById('statusText');
        this.percentageText = document.getElementById('percentageText');
        this.progressContainer = document.getElementById('progressContainer');
        this.selectedFileName = document.getElementById('selectedFileName');
        this.resultMessage = document.getElementById('resultMessage');
        this.chunkMarkers = document.getElementById('chunkMarkers');

        this.file = null;
        this.uploadId = null;
        this.chunkSize = 1 * 1024 * 1024; // 1MB chunks for demo
        this.isPaused = false;
        this.abortController = null;

        this.initEventListeners();
    }

    initEventListeners() {
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.style.borderColor = '#6366f1';
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.style.borderColor = '#cbd5e1';
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileSelect(e);
        });

        this.uploadBtn.addEventListener('click', () => this.startUpload());
        this.pauseBtn.addEventListener('click', () => this.simulateFailure());
    }

    handleFileSelect(e) {
        const files = e.target.files || e.dataTransfer.files;
        if (files.length > 0) {
            this.file = files[0];
            this.selectedFileName.textContent = `${this.file.name} (${(this.file.size / 1024 / 1024).toFixed(2)} MB)`;
            this.uploadBtn.disabled = false;
            this.resetUI();

            // Check if we have an existing uploadId in localStorage for this file
            this.uploadId = localStorage.getItem(`upload_id_${this.file.name}_${this.file.size}`);
        }
    }

    resetUI() {
        this.progressBar.style.width = '0%';
        this.percentageText.textContent = '0%';
        this.statusText.textContent = 'Ready to upload';
        this.progressContainer.style.display = 'none';
        this.resultMessage.style.display = 'none';
        this.pauseBtn.disabled = true;
        this.chunkMarkers.innerHTML = '';
    }

    async startUpload() {
        this.isPaused = false;
        this.uploadBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.progressContainer.style.display = 'block';
        this.resultMessage.style.display = 'none';

        try {
            if (!this.uploadId) {
                this.statusText.textContent = 'Initializing upload...';
                const response = await fetch('/upload/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: this.file.name,
                        size: this.file.size,
                        chunkSize: this.chunkSize
                    })
                });
                const data = await response.json();
                this.uploadId = data.uploadId;
                localStorage.setItem(`upload_id_${this.file.name}_${this.file.size}`, this.uploadId);
            }

            // Check progress
            this.statusText.textContent = 'Checking existing progress...';
            const statusResponse = await fetch(`/upload/status/${this.uploadId}`);
            if (!statusResponse.ok) {
                // Session might have expired on server
                this.uploadId = null;
                return this.startUpload();
            }
            const status = await statusResponse.json();
            console.log(status)
            this.createChunkMarkers(status.totalChunks);
            await this.uploadChunks(status.uploadedChunksIndices, status.totalChunks);

        } catch (error) {
            this.statusText.textContent = 'Upload failed: ' + error.message;
            this.uploadBtn.disabled = false;
        }
    }

    createChunkMarkers(total) {
        this.chunkMarkers.innerHTML = '';
        for (let i = 0; i < total; i++) {
            const marker = document.createElement('div');
            marker.className = 'chunk-marker';
            marker.id = `marker-${i}`;
            this.chunkMarkers.appendChild(marker);
        }
    }

    async uploadChunks(uploadedIndices, total) {
        const uploadedSet = new Set(uploadedIndices);
        console.log(`[Frontend] Found ${uploadedIndices.length}/${total} chunks already on server.`);

        // Update UI for existing chunks
        uploadedIndices.forEach(idx => {
            const marker = document.getElementById(`marker-${idx}`);
            if (marker) marker.style.background = 'rgba(99, 102, 241, 0.4)';
        });

        for (let i = 0; i < total; i++) {
            if (this.isPaused) {
                console.log(`[Frontend] Upload paused at chunk ${i}`);
                this.statusText.textContent = 'Upload interrupted (Simulated)';
                this.uploadBtn.disabled = false;
                this.uploadBtn.textContent = 'Resume Upload';
                return;
            }

            if (uploadedSet.has(i)) {
                console.log(`[Frontend] Skipping chunk ${i + 1} (Already uploaded)`);
                this.updateProgress(i + 1, total);
                continue;
            }

            console.log(`[Frontend] Uploading chunk ${i + 1}/${total}...`);
            this.statusText.textContent = `Uploading chunk ${i + 1}/${total}...`;

            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, this.file.size);
            const chunk = this.file.slice(start, end);

            const formData = new FormData();
            formData.append('chunk', chunk);

            try {
                const response = await fetch(`/upload/chunk/${this.uploadId}/${i}`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Chunk upload failed');

                console.log(`[Frontend] Chunk ${i + 1} uploaded successfully.`);
                uploadedSet.add(i);
                const marker = document.getElementById(`marker-${i}`);
                if (marker) marker.style.background = 'rgba(99, 102, 241, 0.4)';

                this.updateProgress(i + 1, total);
            } catch (err) {
                if (!this.isPaused) {
                    console.error(`[Frontend] Error uploading chunk ${i + 1}:`, err);
                    throw err;
                }
            }
        }

        this.finalizeUpload();
    }

    updateProgress(current, total) {
        const percent = Math.floor((current / total) * 100);
        this.progressBar.style.width = `${percent}%`;
        this.percentageText.textContent = `${percent}%`;
    }

    async finalizeUpload() {
        this.statusText.textContent = 'Finalizing file...';
        try {
            const response = await fetch(`/upload/finalize/${this.uploadId}`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                this.statusText.textContent = 'Upload Complete!';
                this.resultMessage.textContent = `File "${data.filename}" uploaded successfully and reconstructed from Redis cache.`;
                this.resultMessage.className = 'message success';
                this.resultMessage.style.display = 'block';
                this.uploadBtn.disabled = true;
                this.pauseBtn.disabled = true;
                localStorage.removeItem(`upload_id_${this.file.name}_${this.file.size}`);
            }
        } catch (error) {
            this.statusText.textContent = 'Finalization failed';
        }
    }

    simulateFailure() {
        this.isPaused = true;
        this.statusText.textContent = 'Simulating network failure...';
        this.pauseBtn.disabled = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ResumableUploader();
});
