const Storage = (function () {
    const DB_NAME = 'gate-da-warroom';
    const DB_VERSION = 1;
    let dbInstance = null;

    // Key encryption using Web Crypto API (AES-GCM)
    const KEY_VAULT = {
        async generateEncryptionKey() {
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw', encoder.encode('gate-da-warroom-vault-' + navigator.userAgent.slice(0, 20)),
                'PBKDF2', false, ['deriveKey']
            );
            return crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt: encoder.encode('warroom-salt'), iterations: 100000, hash: 'SHA-256' },
                keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
            );
        },

        async encrypt(text) {
            if (!text) return null;
            const key = await this.generateEncryptionKey();
            const encoder = new TextEncoder();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
            return JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) });
        },

        async decrypt(encryptedJson) {
            if (!encryptedJson) return null;
            const key = await this.generateEncryptionKey();
            const { iv, data } = JSON.parse(encryptedJson);
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(data)
            );
            return new TextDecoder().decode(decrypted);
        }
    };

    function init() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (event) => reject('Database error: ' + event.target.error);
            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('progress')) {
                    db.createObjectStore('progress', { keyPath: 'conceptId' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('quizHistory')) {
                    const quizStore = db.createObjectStore('quizHistory', { keyPath: 'id', autoIncrement: true });
                    quizStore.createIndex('conceptId', 'conceptId', { unique: false });
                }
            };
        });
    }

    function _getStore(storeName, mode = 'readonly') {
        if (!dbInstance) throw new Error('Database not initialized');
        const transaction = dbInstance.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    function getProgress(conceptId) {
        return new Promise((resolve, reject) => {
            const store = _getStore('progress');
            const request = store.get(conceptId);
            request.onsuccess = () => resolve(request.result || { conceptId, status: 'Not Started' });
            request.onerror = () => reject(request.error);
        });
    }

    function saveProgress(conceptId, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const current = await getProgress(conceptId);
                const updated = { ...current, ...data, conceptId };
                const store = _getStore('progress', 'readwrite');
                const request = store.put(updated);
                request.onsuccess = () => resolve(updated);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    function getAllProgress() {
        return new Promise((resolve, reject) => {
            const store = _getStore('progress');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    function getSettings() {
        return new Promise((resolve, reject) => {
            const store = _getStore('settings');
            const request = store.get('userSettings');
            request.onsuccess = () => {
                const defaultSettings = { 
                    id: 'userSettings', 
                    userName: 'Commander', 
                    dailyTarget: 4, 
                    theme: 'dark',
                    geminiKeys: [],
                    secondaryKeys: [],
                    currentGeminiIndex: 0,
                    currentSecondaryIndex: 0
                };
                resolve(request.result || defaultSettings);
            };
            request.onerror = () => reject(request.error);
        });
    }

    function saveSettings(settings) {
        return new Promise((resolve, reject) => {
            const store = _getStore('settings', 'readwrite');
            settings.id = 'userSettings';
            const request = store.put(settings);
            request.onsuccess = () => resolve(settings);
            request.onerror = () => reject(request.error);
        });
    }

    function saveQuizResult(result) {
        return new Promise((resolve, reject) => {
            const store = _getStore('quizHistory', 'readwrite');
            result.timestamp = Date.now();
            const request = store.add(result);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function getQuizHistory(conceptId) {
        return new Promise((resolve, reject) => {
            const store = _getStore('quizHistory');
            const index = store.index('conceptId');
            const request = index.getAll(conceptId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    function getAllQuizHistory() {
        return new Promise((resolve, reject) => {
            const store = _getStore('quizHistory');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async function exportData() {
        const progress = await getAllProgress();
        const settings = await getSettings();
        // Clear out encrypted keys before exporting to prevent accidental leakage
        const safeSettings = { ...settings };
        safeSettings.geminiKeys = [];
        safeSettings.secondaryKeys = [];
        
        const quizHistory = await getAllQuizHistory();
        return JSON.stringify({ progress, settings: safeSettings, quizHistory });
    }

    async function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.progress) {
                const pStore = _getStore('progress', 'readwrite');
                for (let p of data.progress) pStore.put(p);
            }
            if (data.settings) {
                // Merge with existing settings so we don't lose current keys
                const currentSettings = await getSettings();
                const newSettings = { ...currentSettings, ...data.settings };
                // Keep local keys
                newSettings.geminiKeys = currentSettings.geminiKeys;
                newSettings.secondaryKeys = currentSettings.secondaryKeys;
                const sStore = _getStore('settings', 'readwrite');
                sStore.put(newSettings);
            }
            if (data.quizHistory) {
                const qStore = _getStore('quizHistory', 'readwrite');
                qStore.clear(); 
                for (let q of data.quizHistory) {
                    delete q.id; 
                    qStore.add(q);
                }
            }
            return true;
        } catch (e) {
            console.error("Import error", e);
            return false;
        }
    }

    return {
        init,
        getProgress,
        saveProgress,
        getAllProgress,
        getSettings,
        saveSettings,
        saveQuizResult,
        getQuizHistory,
        getAllQuizHistory,
        exportData,
        importData,
        encryptKey: KEY_VAULT.encrypt.bind(KEY_VAULT),
        decryptKey: KEY_VAULT.decrypt.bind(KEY_VAULT)
    };
})();
