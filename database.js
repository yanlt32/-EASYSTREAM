class Database {
    constructor() {
        this.dbName = 'EasyStreamDB';
        this.version = 1;
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('Erro ao abrir o banco de dados:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Banco de dados aberto com sucesso');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Criar object store para clientes
                if (!db.objectStoreNames.contains('clients')) {
                    const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
                    clientStore.createIndex('whatsApp', 'whatsApp', { unique: false });
                    clientStore.createIndex('name', 'name', { unique: false });
                    clientStore.createIndex('status', 'status', { unique: false });
                }

                // Criar object store para compras
                if (!db.objectStoreNames.contains('purchases')) {
                    const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id' });
                    purchaseStore.createIndex('clientId', 'clientId', { unique: false });
                    purchaseStore.createIndex('service', 'service', { unique: false });
                    purchaseStore.createIndex('status', 'status', { unique: false });
                    purchaseStore.createIndex('expiryDate', 'expiryDate', { unique: false });
                    purchaseStore.createIndex('purchaseDate', 'purchaseDate', { unique: false });
                }

                // Criar object store para serviços
                if (!db.objectStoreNames.contains('services')) {
                    const serviceStore = db.createObjectStore('services', { keyPath: 'id' });
                    serviceStore.createIndex('code', 'code', { unique: true });
                }

                // Criar object store para configurações
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                }

                console.log('Estrutura do banco de dados criada');
            };
        });
    }

    // Métodos genéricos
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async query(storeName, indexName, range) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // Métodos específicos para clientes
    async addClient(client) {
        return this.add('clients', client);
    }

    async getClient(id) {
        return this.get('clients', id);
    }

    async getAllClients() {
        return this.getAll('clients');
    }

    async updateClient(client) {
        return this.update('clients', client);
    }

    async deleteClient(id) {
        return this.delete('clients', id);
    }

    async searchClients(query) {
        const clients = await this.getAll('clients');
        return clients.filter(client => 
            client.name.toLowerCase().includes(query.toLowerCase()) ||
            client.whatsApp.includes(query)
        );
    }

    async getClientsByStatus(status) {
        if (status === 'all') return this.getAll('clients');
        return this.query('clients', 'status', status);
    }

    // Métodos específicos para compras
    async addPurchase(purchase) {
        return this.add('purchases', purchase);
    }

    async getPurchase(id) {
        return this.get('purchases', id);
    }

    async getAllPurchases() {
        return this.getAll('purchases');
    }

    async updatePurchase(purchase) {
        return this.update('purchases', purchase);
    }

    async deletePurchase(id) {
        return this.delete('purchases', id);
    }

    async getPurchasesByClient(clientId) {
        return this.query('purchases', 'clientId', clientId);
    }

    async getPurchasesByService(service) {
        if (service === 'all') return this.getAll('purchases');
        return this.query('purchases', 'service', service);
    }

    async getPurchasesByStatus(status) {
        if (status === 'all') return this.getAll('purchases');
        return this.query('purchases', 'status', status);
    }

    async getPurchasesByDateRange(startDate, endDate) {
        const purchases = await this.getAll('purchases');
        return purchases.filter(purchase => {
            const date = new Date(purchase.purchaseDate);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    }

    // Métodos específicos para serviços
    async addService(service) {
        return this.add('services', service);
    }

    async getService(id) {
        return this.get('services', id);
    }

    async getAllServices() {
        return this.getAll('services');
    }

    async updateService(service) {
        return this.update('services', service);
    }

    async deleteService(id) {
        return this.delete('services', id);
    }

    async getServiceByCode(code) {
        const services = await this.getAll('services');
        return services.find(service => service.code === code);
    }

    // Métodos para configurações
    async getSetting(key) {
        return this.get('settings', key);
    }

    async saveSetting(key, value) {
        return this.update('settings', { key, value });
    }

    // Métodos de backup
    async exportData() {
        const [clients, purchases, services, settings] = await Promise.all([
            this.getAll('clients'),
            this.getAll('purchases'),
            this.getAll('services'),
            this.getAll('settings')
        ]);

        return {
            clients,
            purchases,
            services,
            settings,
            exportedAt: new Date().toISOString(),
            version: this.version
        };
    }

    async importData(data) {
        const transaction = this.db.transaction(
            ['clients', 'purchases', 'services', 'settings'],
            'readwrite'
        );

        // Limpar dados existentes
        await Promise.all([
            this.clearStore('clients'),
            this.clearStore('purchases'),
            this.clearStore('services'),
            this.clearStore('settings')
        ]);

        // Importar novos dados
        const promises = [];

        if (data.clients) {
            data.clients.forEach(client => {
                promises.push(this.addClient(client));
            });
        }

        if (data.purchases) {
            data.purchases.forEach(purchase => {
                promises.push(this.addPurchase(purchase));
            });
        }

        if (data.services) {
            data.services.forEach(service => {
                promises.push(this.addService(service));
            });
        }

        if (data.settings) {
            data.settings.forEach(setting => {
                promises.push(this.saveSetting(setting.key, setting.value));
            });
        }

        await Promise.all(promises);
        return true;
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async clearAllData() {
        await Promise.all([
            this.clearStore('clients'),
            this.clearStore('purchases'),
            this.clearStore('services'),
            this.clearStore('settings')
        ]);
        return true;
    }

    // Métodos de estatísticas
    async getDashboardStats() {
        const [clients, purchases, services] = await Promise.all([
            this.getAll('clients'),
            this.getAll('purchases'),
            this.getAll('services')
        ]);

        const today = new Date().toISOString().split('T')[0];
        const todayPurchases = purchases.filter(p => p.purchaseDate === today);
        const todayRevenue = todayPurchases.reduce((sum, p) => sum + p.value, 0);
        const todayClients = clients.filter(c => c.registrationDate === today).length;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyPurchases = purchases.filter(p => {
            const date = new Date(p.purchaseDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const monthlyRevenue = monthlyPurchases.reduce((sum, p) => sum + p.value, 0);

        const expiringSoon = purchases.filter(p => {
            const expiryDate = new Date(p.expiryDate);
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return expiryDate >= today && expiryDate <= nextWeek && p.status !== 'expired';
        }).length;

        const inactiveClients = clients.filter(client => {
            const clientPurchases = purchases.filter(p => p.clientId === client.id);
            if (clientPurchases.length === 0) return true;
            
            const lastPurchase = clientPurchases.sort((a, b) => 
                new Date(b.purchaseDate) - new Date(a.purchaseDate)
            )[0];
            
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            return new Date(lastPurchase.purchaseDate) < thirtyDaysAgo;
        }).length;

        return {
            totalClients: clients.length,
            totalPurchases: purchases.length,
            monthlyRevenue,
            todayClients,
            todaySales: todayPurchases.length,
            todayRevenue,
            expiringSoon,
            inactiveClients
        };
    }
}

// Instância global do banco de dados
const db = new Database();