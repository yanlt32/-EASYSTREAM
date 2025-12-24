// Variáveis globais
let currentView = 'dashboard';
let editClientId = null;
let editPurchaseId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    await db.init();
    await initializeServices();
    loadAllData();
    setupEventListeners();
    checkForExpiringPurchases();
});

// Inicializar serviços padrão
async function initializeServices() {
    const existingServices = await db.getAllServices();
    
    if (existingServices.length === 0) {
        const defaultServices = [
            { id: '1', name: 'Netflix 4K Ultra HD', code: 'netflix', price: 39.90, duration: 30 },
            { id: '2', name: 'Disney+ Premium', code: 'disney', price: 34.90, duration: 30 },
            { id: '3', name: 'HBO Max', code: 'hbo', price: 34.90, duration: 30 },
            { id: '4', name: 'YouTube Premium', code: 'youtube', price: 34.90, duration: 30 },
            { id: '5', name: 'Prime Video', code: 'prime', price: 14.90, duration: 30 },
            { id: '6', name: 'Start+', code: 'startplus', price: 29.90, duration: 30 },
            { id: '7', name: 'PlayPlus', code: 'playplus', price: 24.90, duration: 30 },
            { id: '8', name: 'Hulu', code: 'hulu', price: 44.90, duration: 30 },
            { id: '9', name: 'ESPN', code: 'espn', price: 39.90, duration: 30 },
            { id: '10', name: 'Paramount+', code: 'paramount', price: 29.90, duration: 30 },
            { id: '11', name: 'Deezer Premium', code: 'deezer', price: 19.90, duration: 30 },
            { id: '12', name: 'Canva Pro', code: 'canva', price: 14.90, duration: 30 },
            { id: '13', name: 'Crunchyroll', code: 'crunchyroll', price: 24.90, duration: 30 },
            { id: '14', name: 'ChatGPT Plus', code: 'chatgpt', price: 79.90, duration: 30 },
            { id: '15', name: 'Viki', code: 'viki', price: 9.90, duration: 30 },
            { id: '16', name: 'Apple TV+', code: 'apple', price: 19.90, duration: 30 }
        ];

        for (const service of defaultServices) {
            await db.addService(service);
        }
    }
}

// Carregar todos os dados
async function loadAllData() {
    await loadClients();
    await loadPurchases();
    await loadServices();
    await updateDashboard();
}

// Configurar event listeners
function setupEventListeners() {
    // Report period toggle
    document.getElementById('report-period').addEventListener('change', function() {
        const customDates = document.getElementById('custom-dates');
        customDates.style.display = this.value === 'custom' ? 'block' : 'none';
    });

    // Service selection
    document.getElementById('purchaseServices').addEventListener('change', updatePurchaseValue);

    // Filter events
    document.getElementById('service-filter').addEventListener('change', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('start-date').addEventListener('change', applyFilters);
    document.getElementById('end-date').addEventListener('change', applyFilters);
}

// Navegação entre seções
function showSection(sectionId) {
    currentView = sectionId;
    
    // Atualizar navegação
    document.querySelectorAll('.admin-nav a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Mostrar seção correta
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    // Carregar dados específicos da seção
    switch(sectionId) {
        case 'clients':
            loadClients();
            break;
        case 'purchases':
            loadPurchases();
            break;
        case 'services':
            loadServices();
            break;
        case 'reports':
            updateReports();
            break;
    }
}

// Modal Functions
function openNewClientModal() {
    document.getElementById('clientForm').reset();
    document.getElementById('newClientModal').classList.add('active');
}

function openNewPurchaseModal() {
    loadClientSelect();
    loadServicesSelect();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = today;
    
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    document.getElementById('purchaseExpiry').value = expiry.toISOString().split('T')[0];
    
    document.getElementById('purchaseForm').reset();
    document.getElementById('newPurchaseModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    editClientId = null;
    editPurchaseId = null;
}

// Carregar clientes no select
async function loadClientSelect() {
    const select = document.getElementById('purchaseClient');
    select.innerHTML = '<option value="">Selecione um cliente...</option>';
    
    const clients = await db.getAllClients();
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} (${client.whatsApp})`;
        select.appendChild(option);
    });
}

// Carregar serviços no select
async function loadServicesSelect() {
    const select = document.getElementById('purchaseServices');
    select.innerHTML = '';
    
    const services = await db.getAllServices();
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} - R$ ${service.price.toFixed(2)}`;
        option.dataset.price = service.price;
        select.appendChild(option);
    });
}

// Atualizar valor total da compra baseado nos serviços selecionados
function updatePurchaseValue() {
    const select = document.getElementById('purchaseServices');
    const selectedOptions = Array.from(select.selectedOptions);
    const total = selectedOptions.reduce((sum, option) => {
        return sum + parseFloat(option.dataset.price || 0);
    }, 0);
    
    document.getElementById('purchaseValue').value = total.toFixed(2);
}

// Salvar cliente
async function saveClient(event) {
    event.preventDefault();
    
    const client = {
        id: generateId(),
        name: document.getElementById('clientName').value.trim(),
        whatsApp: document.getElementById('clientWhatsApp').value.trim(),
        email: document.getElementById('clientEmail').value.trim() || null,
        cpf: document.getElementById('clientCpf').value.trim() || null,
        address: document.getElementById('clientAddress').value.trim() || null,
        notes: document.getElementById('clientNotes').value.trim() || null,
        registrationDate: new Date().toISOString().split('T')[0],
        status: 'active',
        totalPurchases: 0,
        lastPurchase: null
    };
    
    try {
        await db.addClient(client);
        closeModal('newClientModal');
        await loadClients();
        await updateDashboard();
        showNotification('Cliente cadastrado com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao salvar cliente: ' + error.message, 'error');
    }
}

// Salvar compra GGMAX (com múltiplos serviços)
async function savePurchase(event) {
    event.preventDefault();
    
    const clientId = document.getElementById('purchaseClient').value;
    const servicesSelect = document.getElementById('purchaseServices');
    const selectedServices = Array.from(servicesSelect.selectedOptions).map(option => option.value);
    
    if (selectedServices.length === 0) {
        showNotification('Selecione pelo menos um serviço!', 'error');
        return;
    }
    
    try {
        // Obter informações dos serviços selecionados
        const services = await Promise.all(
            selectedServices.map(id => db.getService(id))
        );
        
        // Criar uma compra para cada serviço
        const purchasePromises = services.map(service => {
            const purchase = {
                id: generateId(),
                clientId: clientId,
                serviceId: service.id,
                serviceName: service.name,
                serviceCode: service.code,
                value: parseFloat(document.getElementById('purchaseValue').value) / services.length,
                purchaseDate: document.getElementById('purchaseDate').value,
                expiryDate: document.getElementById('purchaseExpiry').value,
                ggmaxLink: document.getElementById('purchaseLink').value,
                code: document.getElementById('purchaseCode').value,
                password: document.getElementById('purchasePassword').value,
                notes: document.getElementById('purchaseNotes').value,
                status: getPurchaseStatus(document.getElementById('purchaseExpiry').value),
                createdAt: new Date().toISOString()
            };
            
            return db.addPurchase(purchase);
        });
        
        await Promise.all(purchasePromises);
        
        // Atualizar dados do cliente
        const client = await db.getClient(clientId);
        if (client) {
            const clientPurchases = await db.getPurchasesByClient(clientId);
            client.totalPurchases = clientPurchases.length;
            client.lastPurchase = new Date().toISOString().split('T')[0];
            await db.updateClient(client);
        }
        
        closeModal('newPurchaseModal');
        await loadPurchases();
        await updateDashboard();
        showNotification('Compra GGMAX cadastrada com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao salvar compra: ' + error.message, 'error');
    }
}

// Carregar clientes na tabela
async function loadClients() {
    try {
        const clients = await db.getAllClients();
        const purchases = await db.getAllPurchases();
        
        const tbody = document.getElementById('clients-list');
        tbody.innerHTML = '';
        
        for (const client of clients) {
            const clientPurchases = purchases.filter(p => p.clientId === client.id);
            const purchasesCount = clientPurchases.length;
            const lastPurchase = clientPurchases.length > 0 ? 
                clientPurchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0] : null;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.id.substring(0, 8)}</td>
                <td>${client.name}</td>
                <td>${client.whatsApp}</td>
                <td>${formatDate(client.registrationDate)}</td>
                <td>${purchasesCount}</td>
                <td>${lastPurchase ? formatDate(lastPurchase.purchaseDate) : 'Nenhuma'}</td>
                <td><span class="status ${client.status}">${getStatusText(client.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewClient('${client.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="action-btn-small edit" onclick="editClient('${client.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn-small delete" onclick="deleteClient('${client.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes', 'error');
    }
}

// Carregar compras na tabela
async function loadPurchases() {
    try {
        const purchases = await db.getAllPurchases();
        const clients = await db.getAllClients();
        
        const tbody = document.getElementById('ggmax-purchases-list');
        tbody.innerHTML = '';
        
        for (const purchase of purchases) {
            const client = clients.find(c => c.id === purchase.clientId);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${purchase.id.substring(0, 8)}</td>
                <td>${client ? client.name : 'Cliente não encontrado'}</td>
                <td>${purchase.serviceName || getServiceName(purchase.serviceCode)}</td>
                <td><a href="${purchase.ggmaxLink}" target="_blank" style="color: var(--secondary);">Ver compra GGMAX</a></td>
                <td>R$ ${purchase.value.toFixed(2)}</td>
                <td>${formatDate(purchase.purchaseDate)}</td>
                <td>${formatDate(purchase.expiryDate)}</td>
                <td><span class="status ${purchase.status}">${getStatusText(purchase.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewPurchase('${purchase.id}')">
                            <i class="fas fa-eye"></i> Detalhes
                        </button>
                        <button class="action-btn-small edit" onclick="editPurchase('${purchase.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn-small renew" onclick="renewPurchase('${purchase.id}')">
                            <i class="fas fa-redo"></i> Renovar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro ao carregar compras:', error);
        showNotification('Erro ao carregar compras', 'error');
    }
}

// Carregar serviços
async function loadServices() {
    try {
        const services = await db.getAllServices();
        const purchases = await db.getAllPurchases();
        
        // Atualizar select de filtro
        const filterSelect = document.getElementById('service-filter');
        filterSelect.innerHTML = '<option value="all">Todos os Serviços</option>';
        
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.code;
            option.textContent = service.name;
            filterSelect.appendChild(option);
        });
        
        // Atualizar tabela de serviços
        const tbody = document.getElementById('services-list');
        tbody.innerHTML = '';
        
        for (const service of services) {
            const servicePurchases = purchases.filter(p => p.serviceCode === service.code);
            const totalSales = servicePurchases.length;
            const totalRevenue = servicePurchases.reduce((sum, p) => sum + p.value, 0);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.id.substring(0, 8)}</td>
                <td>${service.name}</td>
                <td>${service.code}</td>
                <td>R$ ${service.price.toFixed(2)}</td>
                <td>${service.duration} dias</td>
                <td>${totalSales}</td>
                <td>R$ ${totalRevenue.toFixed(2)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small edit" onclick="editService('${service.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn-small delete" onclick="deleteService('${service.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        showNotification('Erro ao carregar serviços', 'error');
    }
}

// Visualizar cliente
async function viewClient(clientId) {
    try {
        const client = await db.getClient(clientId);
        const clientPurchases = await db.getPurchasesByClient(clientId);
        
        let html = `
            <div class="client-detail">
                <div class="client-header">
                    <div class="client-info">
                        <div class="client-avatar">${client.name.charAt(0)}</div>
                        <div class="client-name">
                            <h2>${client.name}</h2>
                            <div class="client-contact">
                                <span><i class="fab fa-whatsapp"></i> ${client.whatsApp}</span>
                                ${client.email ? `<span><i class="fas fa-envelope"></i> ${client.email}</span>` : ''}
                                ${client.cpf ? `<span><i class="fas fa-id-card"></i> ${client.cpf}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="editClient('${client.id}')">
                            <i class="fas fa-edit"></i> Editar Cliente
                        </button>
                        <button class="btn btn-success" onclick="openNewPurchaseForClient('${client.id}')">
                            <i class="fas fa-plus"></i> Nova Compra
                        </button>
                    </div>
                </div>
                
                ${client.address ? `<p><strong>Endereço:</strong> ${client.address}</p>` : ''}
                ${client.notes ? `<p><strong>Observações:</strong> ${client.notes}</p>` : ''}
                
                <div class="client-stats">
                    <div class="client-stat-item">
                        <div class="client-stat-value">${clientPurchases.length}</div>
                        <div class="client-stat-label">Compras Realizadas</div>
                    </div>
                    <div class="client-stat-item">
                        <div class="client-stat-value">R$ ${clientPurchases.reduce((sum, p) => sum + p.value, 0).toFixed(2)}</div>
                        <div class="client-stat-label">Total Gasto</div>
                    </div>
                    <div class="client-stat-item">
                        <div class="client-stat-value">${formatDate(client.registrationDate)}</div>
                        <div class="client-stat-label">Cliente desde</div>
                    </div>
                    <div class="client-stat-item">
                        <div class="client-stat-value">${client.status}</div>
                        <div class="client-stat-label">Status</div>
                    </div>
                </div>
                
                <h3 style="margin: 30px 0 20px;">Histórico de Compras</h3>
        `;
        
        if (clientPurchases.length > 0) {
            html += '<div class="table-responsive"><table><thead><tr>';
            html += '<th>Serviço</th><th>Valor</th><th>Data Compra</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
            
            clientPurchases.forEach(purchase => {
                html += `
                    <tr>
                        <td>${purchase.serviceName}</td>
                        <td>R$ ${purchase.value.toFixed(2)}</td>
                        <td>${formatDate(purchase.purchaseDate)}</td>
                        <td>${formatDate(purchase.expiryDate)}</td>
                        <td><span class="status ${purchase.status}">${getStatusText(purchase.status)}</span></td>
                        <td>
                            <button class="action-btn-small view" onclick="viewPurchase('${purchase.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn-small renew" onclick="renewPurchase('${purchase.id}')">
                                <i class="fas fa-redo"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
        } else {
            html += '<p style="text-align: center; color: #666; padding: 40px;">Nenhuma compra registrada para este cliente.</p>';
        }
        
        html += '</div>';
        
        // Criar modal dinâmico
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                ${html}
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        showNotification('Erro ao carregar detalhes do cliente', 'error');
    }
}

// Visualizar compra
async function viewPurchase(purchaseId) {
    try {
        const purchase = await db.getPurchase(purchaseId);
        const client = await db.getClient(purchase.clientId);
        const service = await db.getServiceByCode(purchase.serviceCode);
        
        let html = `
            <div class="client-detail">
                <div class="client-header">
                    <div class="client-info">
                        <div class="client-avatar">${purchase.serviceName.charAt(0)}</div>
                        <div class="client-name">
                            <h2>${purchase.serviceName}</h2>
                            <div class="client-contact">
                                <span><i class="fas fa-user"></i> ${client.name}</span>
                                <span><i class="fab fa-whatsapp"></i> ${client.whatsApp}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <span class="status ${purchase.status}" style="font-size: 1rem;">${getStatusText(purchase.status)}</span>
                    </div>
                </div>
                
                <div class="client-stats">
                    <div class="client-stat-item">
                        <div class="client-stat-value">R$ ${purchase.value.toFixed(2)}</div>
                        <div class="client-stat-label">Valor Pago</div>
                    </div>
                    <div class="client-stat-item">
                        <div class="client-stat-value">${formatDate(purchase.purchaseDate)}</div>
                        <div class="client-stat-label">Data da Compra</div>
                    </div>
                    <div class="client-stat-item">
                        <div class="client-stat-value">${formatDate(purchase.expiryDate)}</div>
                        <div class="client-stat-label">Vencimento</div>
                    </div>
                    <div class="client-stat-item">
                        <div class="client-stat-value">${service ? service.duration + ' dias' : 'N/A'}</div>
                        <div class="client-stat-label">Duração</div>
                    </div>
                </div>
                
                <h3 style="margin: 30px 0 15px;">Informações da Compra</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label><i class="fas fa-link"></i> Link GGMAX</label>
                        <p><a href="${purchase.ggmaxLink}" target="_blank">${purchase.ggmaxLink}</a></p>
                    </div>
                    ${purchase.code ? `
                    <div class="form-group">
                        <label><i class="fas fa-key"></i> Código/Login</label>
                        <p>${purchase.code}</p>
                    </div>` : ''}
                    ${purchase.password ? `
                    <div class="form-group">
                        <label><i class="fas fa-lock"></i> Senha</label>
                        <p>${purchase.password}</p>
                    </div>` : ''}
                    ${purchase.notes ? `
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label><i class="fas fa-sticky-note"></i> Observações</label>
                        <p>${purchase.notes}</p>
                    </div>` : ''}
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                    <button class="btn btn-primary" onclick="editPurchase('${purchase.id}')">
                        <i class="fas fa-edit"></i> Editar Compra
                    </button>
                    <button class="btn btn-success" onclick="renewPurchase('${purchase.id}')">
                        <i class="fas fa-redo"></i> Renovar Serviço
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('purchaseDetailContent').innerHTML = html;
        document.getElementById('purchaseDetailModal').classList.add('active');
    } catch (error) {
        showNotification('Erro ao carregar detalhes da compra', 'error');
    }
}

// Editar cliente
async function editClient(clientId) {
    try {
        const client = await db.getClient(clientId);
        
        document.getElementById('editClientId').value = client.id;
        document.getElementById('editClientName').value = client.name;
        document.getElementById('editClientWhatsApp').value = client.whatsApp;
        document.getElementById('editClientEmail').value = client.email || '';
        document.getElementById('editClientStatus').value = client.status;
        
        editClientId = clientId;
        document.getElementById('editClientModal').classList.add('active');
    } catch (error) {
        showNotification('Erro ao carregar cliente para edição', 'error');
    }
}

// Atualizar cliente
async function updateClient(event) {
    event.preventDefault();
    
    try {
        const client = await db.getClient(editClientId);
        
        client.name = document.getElementById('editClientName').value.trim();
        client.whatsApp = document.getElementById('editClientWhatsApp').value.trim();
        client.email = document.getElementById('editClientEmail').value.trim() || null;
        client.status = document.getElementById('editClientStatus').value;
        
        await db.updateClient(client);
        closeModal('editClientModal');
        await loadClients();
        await updateDashboard();
        showNotification('Cliente atualizado com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao atualizar cliente: ' + error.message, 'error');
    }
}

// Editar compra
async function editPurchase(purchaseId) {
    editPurchaseId = purchaseId;
    showNotification('Funcionalidade de edição em desenvolvimento', 'warning');
}

// Renovar compra
async function renewPurchase(purchaseId) {
    try {
        const purchase = await db.getPurchase(purchaseId);
        const client = await db.getClient(purchase.clientId);
        
        // Criar nova compra com base na anterior
        const newPurchase = {
            ...purchase,
            id: generateId(),
            purchaseDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
            status: 'active'
        };
        
        delete newPurchase.createdAt;
        
        await db.addPurchase(newPurchase);
        
        // Atualizar cliente
        client.lastPurchase = newPurchase.purchaseDate;
        client.totalPurchases = (client.totalPurchases || 0) + 1;
        await db.updateClient(client);
        
        await loadPurchases();
        await updateDashboard();
        showNotification('Serviço renovado com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao renovar serviço: ' + error.message, 'error');
    }
}

// Excluir cliente
async function deleteClient(clientId) {
    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
        try {
            // Verificar se o cliente tem compras
            const clientPurchases = await db.getPurchasesByClient(clientId);
            
            if (clientPurchases.length > 0) {
                if (!confirm('Este cliente possui compras associadas. Deseja excluí-lo mesmo assim?')) {
                    return;
                }
                
                // Opcional: também excluir as compras
                for (const purchase of clientPurchases) {
                    await db.deletePurchase(purchase.id);
                }
            }
            
            await db.deleteClient(clientId);
            await loadClients();
            await updateDashboard();
            showNotification('Cliente excluído com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao excluir cliente: ' + error.message, 'error');
        }
    }
}

// Excluir serviço
async function deleteService(serviceId) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        try {
            // Verificar se há compras com este serviço
            const service = await db.getService(serviceId);
            const purchases = await db.getPurchasesByService(service.code);
            
            if (purchases.length > 0) {
                showNotification('Não é possível excluir este serviço pois existem compras associadas a ele.', 'error');
                return;
            }
            
            await db.deleteService(serviceId);
            await loadServices();
            showNotification('Serviço excluído com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao excluir serviço: ' + error.message, 'error');
        }
    }
}

// Adicionar novo serviço
async function addNewService() {
    const name = document.getElementById('service-name').value.trim();
    const code = document.getElementById('service-code').value.trim().toLowerCase();
    const price = parseFloat(document.getElementById('service-price').value) || 0;
    const duration = parseInt(document.getElementById('service-duration').value) || 30;
    
    if (!name || !code) {
        showNotification('Preencha o nome e código do serviço!', 'error');
        return;
    }
    
    const service = {
        id: generateId(),
        name,
        code,
        price,
        duration,
        createdAt: new Date().toISOString()
    };
    
    try {
        await db.addService(service);
        resetServiceForm();
        await loadServices();
        showNotification('Serviço adicionado com sucesso!', 'success');
    } catch (error) {
        if (error.name === 'ConstraintError') {
            showNotification('Já existe um serviço com este código!', 'error');
        } else {
            showNotification('Erro ao adicionar serviço: ' + error.message, 'error');
        }
    }
}

function resetServiceForm() {
    document.getElementById('service-name').value = '';
    document.getElementById('service-code').value = '';
    document.getElementById('service-price').value = '';
    document.getElementById('service-duration').value = '30';
}

// Buscar clientes
async function searchClients(query) {
    if (!query.trim()) {
        await loadClients();
        return;
    }
    
    try {
        const clients = await db.searchClients(query);
        const purchases = await db.getAllPurchases();
        
        const tbody = document.getElementById('clients-list');
        tbody.innerHTML = '';
        
        for (const client of clients) {
            const clientPurchases = purchases.filter(p => p.clientId === client.id);
            const purchasesCount = clientPurchases.length;
            const lastPurchase = clientPurchases.length > 0 ? 
                clientPurchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0] : null;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.id.substring(0, 8)}</td>
                <td>${client.name}</td>
                <td>${client.whatsApp}</td>
                <td>${formatDate(client.registrationDate)}</td>
                <td>${purchasesCount}</td>
                <td>${lastPurchase ? formatDate(lastPurchase.purchaseDate) : 'Nenhuma'}</td>
                <td><span class="status ${client.status}">${getStatusText(client.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewClient('${client.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="action-btn-small edit" onclick="editClient('${client.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn-small delete" onclick="deleteClient('${client.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro na busca:', error);
    }
}

// Filtrar clientes por status
async function filterClientsByStatus(status) {
    try {
        const clients = await db.getClientsByStatus(status);
        const purchases = await db.getAllPurchases();
        
        const tbody = document.getElementById('clients-list');
        tbody.innerHTML = '';
        
        for (const client of clients) {
            const clientPurchases = purchases.filter(p => p.clientId === client.id);
            const purchasesCount = clientPurchases.length;
            const lastPurchase = clientPurchases.length > 0 ? 
                clientPurchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0] : null;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.id.substring(0, 8)}</td>
                <td>${client.name}</td>
                <td>${client.whatsApp}</td>
                <td>${formatDate(client.registrationDate)}</td>
                <td>${purchasesCount}</td>
                <td>${lastPurchase ? formatDate(lastPurchase.purchaseDate) : 'Nenhuma'}</td>
                <td><span class="status ${client.status}">${getStatusText(client.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewClient('${client.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="action-btn-small edit" onclick="editClient('${client.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn-small delete" onclick="deleteClient('${client.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro no filtro:', error);
    }
}

// Aplicar filtros avançados
async function applyFilters() {
    try {
        const service = document.getElementById('service-filter').value;
        const status = document.getElementById('status-filter').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        let purchases = await db.getAllPurchases();
        const clients = await db.getAllClients();
        
        // Aplicar filtros
        if (service !== 'all') {
            purchases = purchases.filter(p => p.serviceCode === service);
        }
        
        if (status !== 'all') {
            purchases = purchases.filter(p => p.status === status);
        }
        
        if (startDate) {
            purchases = purchases.filter(p => new Date(p.purchaseDate) >= new Date(startDate));
        }
        
        if (endDate) {
            purchases = purchases.filter(p => new Date(p.purchaseDate) <= new Date(endDate));
        }
        
        // Atualizar tabela
        const tbody = document.getElementById('ggmax-purchases-list');
        tbody.innerHTML = '';
        
        for (const purchase of purchases) {
            const client = clients.find(c => c.id === purchase.clientId);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${purchase.id.substring(0, 8)}</td>
                <td>${client ? client.name : 'Cliente não encontrado'}</td>
                <td>${purchase.serviceName}</td>
                <td><a href="${purchase.ggmaxLink}" target="_blank" style="color: var(--secondary);">Ver compra GGMAX</a></td>
                <td>R$ ${purchase.value.toFixed(2)}</td>
                <td>${formatDate(purchase.purchaseDate)}</td>
                <td>${formatDate(purchase.expiryDate)}</td>
                <td><span class="status ${purchase.status}">${getStatusText(purchase.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewPurchase('${purchase.id}')">
                            <i class="fas fa-eye"></i> Detalhes
                        </button>
                        <button class="action-btn-small edit" onclick="editPurchase('${purchase.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
    }
}

function resetFilters() {
    document.getElementById('service-filter').value = 'all';
    document.getElementById('status-filter').value = 'all';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    loadPurchases();
}

// Buscar serviços
async function searchServices(query) {
    if (!query.trim()) {
        await loadServices();
        return;
    }
    
    try {
        const services = await db.getAllServices();
        const purchases = await db.getAllPurchases();
        
        const filteredServices = services.filter(service =>
            service.name.toLowerCase().includes(query.toLowerCase()) ||
            service.code.toLowerCase().includes(query.toLowerCase())
        );
        
        const tbody = document.getElementById('services-list');
        tbody.innerHTML = '';
        
        for (const service of filteredServices) {
            const servicePurchases = purchases.filter(p => p.serviceCode === service.code);
            const totalSales = servicePurchases.length;
            const totalRevenue = servicePurchases.reduce((sum, p) => sum + p.value, 0);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.id.substring(0, 8)}</td>
                <td>${service.name}</td>
                <td>${service.code}</td>
                <td>R$ ${service.price.toFixed(2)}</td>
                <td>${service.duration} dias</td>
                <td>${totalSales}</td>
                <td>R$ ${totalRevenue.toFixed(2)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small edit" onclick="editService('${service.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn-small delete" onclick="deleteService('${service.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro na busca:', error);
    }
}

// Atualizar dashboard
async function updateDashboard() {
    try {
        const stats = await db.getDashboardStats();
        
        document.getElementById('total-clients').textContent = stats.totalClients;
        document.getElementById('total-purchases').textContent = stats.totalPurchases;
        document.getElementById('monthly-revenue').textContent = `R$ ${stats.monthlyRevenue.toFixed(2)}`;
        document.getElementById('to-renew').textContent = stats.expiringSoon;
        document.getElementById('today-clients').textContent = stats.todayClients;
        document.getElementById('today-sales').textContent = stats.todaySales;
        document.getElementById('today-revenue').textContent = `R$ ${stats.todayRevenue.toFixed(2)}`;
        document.getElementById('expiring-soon').textContent = stats.expiringSoon;
        document.getElementById('inactive-clients').textContent = stats.inactiveClients;
        
        // Atualizar últimas compras
        const purchases = await db.getAllPurchases();
        const clients = await db.getAllClients();
        
        const tbody = document.getElementById('purchases-list');
        tbody.innerHTML = '';
        
        const recentPurchases = purchases
            .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
            .slice(0, 10);
        
        for (const purchase of recentPurchases) {
            const client = clients.find(c => c.id === purchase.clientId);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${purchase.id.substring(0, 8)}</td>
                <td>${client ? client.name : 'Cliente não encontrado'}</td>
                <td>${purchase.serviceName}</td>
                <td>R$ ${purchase.value.toFixed(2)}</td>
                <td>${formatDate(purchase.purchaseDate)}</td>
                <td>${formatDate(purchase.expiryDate)}</td>
                <td><span class="status ${purchase.status}">${getStatusText(purchase.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewPurchase('${purchase.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
    }
}

// Filtrar compras no dashboard
async function filterPurchases(query) {
    if (!query.trim()) {
        await updateDashboard();
        return;
    }
    
    try {
        const purchases = await db.getAllPurchases();
        const clients = await db.getAllClients();
        
        const filteredPurchases = purchases.filter(purchase => {
            const client = clients.find(c => c.id === purchase.clientId);
            return (
                (client && client.name.toLowerCase().includes(query.toLowerCase())) ||
                purchase.serviceName.toLowerCase().includes(query.toLowerCase()) ||
                purchase.id.toLowerCase().includes(query.toLowerCase())
            );
        });
        
        const tbody = document.getElementById('purchases-list');
        tbody.innerHTML = '';
        
        for (const purchase of filteredPurchases.slice(0, 10)) {
            const client = clients.find(c => c.id === purchase.clientId);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${purchase.id.substring(0, 8)}</td>
                <td>${client ? client.name : 'Cliente não encontrado'}</td>
                <td>${purchase.serviceName}</td>
                <td>R$ ${purchase.value.toFixed(2)}</td>
                <td>${formatDate(purchase.purchaseDate)}</td>
                <td>${formatDate(purchase.expiryDate)}</td>
                <td><span class="status ${purchase.status}">${getStatusText(purchase.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewPurchase('${purchase.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Erro no filtro:', error);
    }
}

// Verificar compras a vencer
async function checkForExpiringPurchases() {
    try {
        const purchases = await db.getAllPurchases();
        const today = new Date();
        
        const expiringPurchases = purchases.filter(purchase => {
            const expiryDate = new Date(purchase.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 3 && daysUntilExpiry > 0 && purchase.status !== 'expired';
        });
        
        if (expiringPurchases.length > 0) {
            const clients = await db.getAllClients();
            const expiringList = expiringPurchases.map(p => {
                const client = clients.find(c => c.id === p.clientId);
                return `${p.serviceName} - ${client ? client.name : 'Cliente desconhecido'} (Vence em ${formatDate(p.expiryDate)})`;
            }).join('\n');
            
            if (confirm(`${expiringPurchases.length} serviços estão próximos do vencimento!\n\n${expiringList}\n\nDeseja visualizar agora?`)) {
                showSection('purchases');
                document.getElementById('status-filter').value = 'warning';
                applyFilters();
            }
        }
    } catch (error) {
        console.error('Erro ao verificar vencimentos:', error);
    }
}

// Backup de dados
async function backupData() {
    try {
        const data = await db.exportData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `easystream_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('Backup criado com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao criar backup: ' + error.message, 'error');
    }
}

// Restaurar dados
async function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('Esta ação substituirá todos os dados atuais. Deseja continuar?')) {
        return;
    }
    
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                await db.importData(data);
                await loadAllData();
                showNotification('Dados restaurados com sucesso!', 'success');
            } catch (error) {
                showNotification('Erro ao restaurar dados: Arquivo inválido', 'error');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        showNotification('Erro ao ler arquivo: ' + error.message, 'error');
    }
    
    // Resetar input
    event.target.value = '';
}

// Exportar todos os dados
async function exportAllData() {
    await backupData();
}

// Limpar todos os dados
async function clearAllData() {
    if (confirm('ATENÇÃO: Esta ação excluirá TODOS os dados do sistema (clientes, compras, serviços). Esta ação NÃO pode ser desfeita. Deseja continuar?')) {
        try {
            await db.clearAllData();
            await loadAllData();
            showNotification('Todos os dados foram excluídos!', 'success');
        } catch (error) {
            showNotification('Erro ao limpar dados: ' + error.message, 'error');
        }
    }
}

// Gerar relatório personalizado
async function generateCustomReport() {
    showNotification('Funcionalidade de relatório em desenvolvimento', 'warning');
}

// Gerar relatório específico
async function generateReport(type) {
    switch(type) {
        case 'monthly':
            await generateMonthlyReport();
            break;
        case 'clients':
            await generateClientsReport();
            break;
        case 'services':
            await generateServicesReport();
            break;
        case 'expiring':
            await generateExpiringReport();
            break;
    }
}

async function generateMonthlyReport() {
    try {
        const purchases = await db.getAllPurchases();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyPurchases = purchases.filter(p => {
            const date = new Date(p.purchaseDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        
        const totalRevenue = monthlyPurchases.reduce((sum, p) => sum + p.value, 0);
        const totalClients = new Set(monthlyPurchases.map(p => p.clientId)).size;
        
        const report = `
            RELATÓRIO MENSAL - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            =====================================================================
            
            RESUMO:
            - Total de Vendas: ${monthlyPurchases.length}
            - Receita Total: R$ ${totalRevenue.toFixed(2)}
            - Clientes Atendidos: ${totalClients}
            
            VENDAS POR SERVIÇO:
            ${await getSalesByService(monthlyPurchases)}
            
            CLIENTES DESTAQUE:
            ${await getTopClients(monthlyPurchases)}
            
            Gerado em: ${new Date().toLocaleString('pt-BR')}
        `;
        
        downloadReport(report, `relatorio_mensal_${currentMonth + 1}_${currentYear}.txt`);
    } catch (error) {
        showNotification('Erro ao gerar relatório: ' + error.message, 'error');
    }
}

async function getSalesByService(purchases) {
    const serviceSales = {};
    purchases.forEach(p => {
        serviceSales[p.serviceName] = (serviceSales[p.serviceName] || 0) + 1;
    });
    
    return Object.entries(serviceSales)
        .map(([service, count]) => `  - ${service}: ${count} venda(s)`)
        .join('\n');
}

async function getTopClients(purchases) {
    const clientPurchases = {};
    purchases.forEach(p => {
        clientPurchases[p.clientId] = (clientPurchases[p.clientId] || 0) + p.value;
    });
    
    const clients = await db.getAllClients();
    const topClients = Object.entries(clientPurchases)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([clientId, total]) => {
            const client = clients.find(c => c.id === clientId);
            return `  - ${client ? client.name : 'Cliente desconhecido'}: R$ ${total.toFixed(2)}`;
        })
        .join('\n');
    
    return topClients || '  Nenhum dado disponível';
}

function downloadReport(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Mudar tema
function changeTheme(theme) {
    document.body.className = theme + '-theme';
    localStorage.setItem('easystream_theme', theme);
    showNotification('Tema alterado com sucesso!', 'success');
}

// Alterar senha
function changePassword() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword && newPassword === confirmPassword) {
        localStorage.setItem('easystream_password', newPassword);
        showNotification('Senha alterada com sucesso!', 'success');
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } else if (newPassword !== confirmPassword) {
        showNotification('As senhas não coincidem!', 'error');
    }
}

// Atualizar relatórios
async function updateReports() {
    // Implementar atualização de dados dos relatórios
}

// Abrir nova compra para cliente específico
async function openNewPurchaseForClient(clientId) {
    await loadClientSelect();
    await loadServicesSelect();
    
    document.getElementById('purchaseClient').value = clientId;
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = today;
    
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    document.getElementById('purchaseExpiry').value = expiry.toISOString().split('T')[0];
    
    document.getElementById('purchaseForm').reset();
    document.getElementById('newPurchaseModal').classList.add('active');
}

// Logout
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        window.location.href = 'login.html';
    }
}

// Funções auxiliares
function generateId() {
    return 'easystream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function getServiceName(serviceCode) {
    const serviceNames = {
        'netflix': 'Netflix 4K Ultra HD',
        'disney': 'Disney+ Premium',
        'hbo': 'HBO Max',
        'youtube': 'YouTube Premium',
        'prime': 'Prime Video',
        'startplus': 'Start+',
        'playplus': 'PlayPlus',
        'hulu': 'Hulu',
        'espn': 'ESPN',
        'paramount': 'Paramount+',
        'deezer': 'Deezer Premium',
        'canva': 'Canva Pro',
        'crunchyroll': 'Crunchyroll',
        'chatgpt': 'ChatGPT Plus',
        'viki': 'Viki',
        'apple': 'Apple TV+'
    };
    return serviceNames[serviceCode] || serviceCode;
}

function getPurchaseStatus(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'warning';
    return 'active';
}

function getStatusText(status) {
    const statusTexts = {
        'active': 'Ativo',
        'pending': 'Pendente',
        'expired': 'Expirado',
        'warning': 'A Vencer',
        'inactive': 'Inativo'
    };
    return statusTexts[status] || status;
}

function showNotification(message, type) {
    // Remover notificações existentes
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Verificar dados ao carregar
async function checkData() {
    const clients = await db.getAllClients();
    const purchases = await db.getAllPurchases();
    const services = await db.getAllServices();
    
    console.log('Clientes:', clients.length);
    console.log('Compras:', purchases.length);
    console.log('Serviços:', services.length);
}