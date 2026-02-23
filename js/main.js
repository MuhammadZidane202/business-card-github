// ==================== FUNGSI UTAMA ====================

// Load semua business cards
async function loadBusinessCards(categoryId = '', search = '') {
    try {
        let query = supabaseClient
            .from('business_cards')
            .select(`
                *,
                categories (
                    category_name,
                    icon
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Filter by category
        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        // Filter by search
        if (search) {
            query = query.or(`company_name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        const { data: cards, error } = await query;

        if (error) throw error;

        displayCards(cards);
        updateStatistics(cards);

    } catch (error) {
        console.error('Error loading cards:', error);
        showAlert('Gagal memuat data: ' + error.message, 'danger');
    }
}

// Tampilkan cards ke HTML
function displayCards(cards) {
    const container = document.getElementById('cardsContainer');
    
    if (!cards || cards.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center py-5">
                    <i class="fas fa-id-card fa-3x mb-3"></i>
                    <h4>Tidak ada data kartu nama</h4>
                    <p>Belum ada kartu nama yang ditambahkan.</p>
                    <a href="admin/add.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Tambah Kartu Nama
                    </a>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    cards.forEach(card => {
        html += `
            <div class="col-lg-3 col-md-4 col-sm-6">
                <div class="card h-100 shadow-sm card-hover">
                    ${card.is_featured ? '<div class="featured-badge"><i class="fas fa-crown"></i> Featured</div>' : ''}
                    
                    <div class="card-img-top bg-light text-center py-3">
                        ${card.logo_url ? 
                            `<img src="${card.logo_url}" alt="Logo" style="height: 100px; object-fit: contain;">` : 
                            `<i class="fas fa-building fa-3x text-muted"></i>`
                        }
                    </div>
                    
                    <div class="card-body">
                        <h6 class="card-title fw-bold">${card.company_name}</h6>
                        
                        ${card.categories ? `
                            <span class="badge bg-primary mb-2">
                                <i class="fas ${card.categories.icon || 'fa-tag'} me-1"></i>
                                ${card.categories.category_name}
                            </span>
                        ` : ''}
                        
                        ${card.rating > 0 ? `
                            <div class="mb-2">
                                ${renderStars(card.rating)}
                                <small class="text-muted">(${card.rating})</small>
                            </div>
                        ` : ''}
                        
                        <p class="card-text small">
                            <i class="fas fa-map-marker-alt text-danger me-1"></i>
                            ${truncateText(card.address || '-', 40)}
                        </p>
                        
                        <p class="card-text small">
                            <i class="fas fa-phone text-success me-1"></i>
                            ${card.phone || card.mobile || '-'}
                        </p>
                    </div>
                    
                    <div class="card-footer bg-white border-0 pb-3">
                        <a href="view.html?id=${card.id}" class="btn btn-primary btn-sm w-100">
                            <i class="fas fa-eye"></i> Lihat Detail
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load categories untuk filter
async function loadCategories() {
    try {
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('category_name');

        if (error) throw error;

        const select = document.getElementById('categoryFilter');
        if (select) {
            categories.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.category_name}</option>`;
            });
        }

    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Filter by category
function filterByCategory() {
    const categoryId = document.getElementById('categoryFilter').value;
    const search = document.getElementById('searchInput')?.value || '';
    loadBusinessCards(categoryId, search);
}

// Search function
function searchCards() {
    const search = document.getElementById('searchInput').value;
    const categoryId = document.getElementById('categoryFilter').value;
    loadBusinessCards(categoryId, search);
}

// Update statistics
function updateStatistics(cards) {
    const totalCards = cards.length;
    const totalViews = cards.reduce((sum, card) => sum + (card.views || 0), 0);
    const avgRating = cards.filter(c => c.rating > 0).reduce((sum, c) => sum + c.rating, 0) / 
                      cards.filter(c => c.rating > 0).length || 0;
    
    // Update stats di navbar atau tempat lain
    console.log(`Total: ${totalCards}, Views: ${totalViews}, Rating: ${avgRating.toFixed(1)}`);
}

// ==================== HELPER FUNCTIONS ====================

// Render bintang rating
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star text-warning"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        } else {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    }
    return stars;
}

// Truncate text
function truncateText(text, limit) {
    if (text.length <= limit) return text;
    return text.substr(0, limit) + '...';
}

// Show alert
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// ==================== FUNGSI UNTUK HALAMAN VIEW ====================

// Load detail business card
async function loadBusinessCard(id) {
    try {
        const { data: card, error } = await supabaseClient
            .from('business_cards')
            .select(`
                *,
                categories (*),
                business_gallery (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Update views
        await supabaseClient
            .from('business_cards')
            .update({ views: (card.views || 0) + 1 })
            .eq('id', id);

        displayBusinessCard(card);

    } catch (error) {
        console.error('Error loading card:', error);
        showAlert('Gagal memuat data', 'danger');
    }
}

// Tampilkan detail card
function displayBusinessCard(card) {
    const container = document.getElementById('cardDetail');
    if (!container) return;

    let html = `
        <div class="row">
            <div class="col-md-8">
                <div class="card shadow mb-4">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3 text-center mb-3">
                                ${card.logo_url ? 
                                    `<img src="${card.logo_url}" alt="Logo" class="img-fluid rounded" style="max-height: 150px;">` : 
                                    `<div class="bg-light p-4 rounded"><i class="fas fa-building fa-4x text-muted"></i></div>`
                                }
                            </div>
                            <div class="col-md-9">
                                <h2 class="mb-2">${card.company_name}</h2>
                                
                                ${card.categories ? `
                                    <p class="mb-2">
                                        <span class="badge bg-primary">
                                            <i class="fas ${card.categories.icon || 'fa-tag'} me-1"></i>
                                            ${card.categories.category_name}
                                        </span>
                                        ${card.is_featured ? '<span class="badge bg-warning"><i class="fas fa-crown"></i> Featured</span>' : ''}
                                    </p>
                                ` : ''}
                                
                                ${card.tagline ? `<p class="text-muted fst-italic">${card.tagline}</p>` : ''}
                                
                                <div class="mb-3">
                                    ${renderStars(card.rating)}
                                    <span class="ms-2">(${card.rating || 0} / 5)</span>
                                </div>
                                
                                <div class="text-muted">
                                    <i class="fas fa-eye me-1"></i> Dilihat ${card.views || 0} kali
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Contact Information -->
                <div class="card shadow mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="fas fa-address-card me-2"></i> Informasi Kontak</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <p class="mb-1"><i class="fas fa-map-marker-alt text-danger me-2"></i> <strong>Alamat:</strong></p>
                                <p>${card.address || '-'}</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <p class="mb-1"><i class="fas fa-phone text-success me-2"></i> <strong>Telepon:</strong></p>
                                <p>${card.phone || '-'}</p>
                                
                                ${card.mobile ? `
                                    <p class="mb-1"><i class="fas fa-mobile-alt text-success me-2"></i> <strong>Mobile:</strong></p>
                                    <p>${card.mobile}</p>
                                ` : ''}
                            </div>
                            <div class="col-md-6 mb-3">
                                <p class="mb-1"><i class="fas fa-envelope text-info me-2"></i> <strong>Email:</strong></p>
                                <p>${card.email ? `<a href="mailto:${card.email}">${card.email}</a>` : '-'}</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <p class="mb-1"><i class="fas fa-globe text-info me-2"></i> <strong>Website:</strong></p>
                                <p>${card.website ? `<a href="${card.website}" target="_blank">${card.website}</a>` : '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${card.description ? `
                    <div class="card shadow mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="fas fa-file-alt me-2"></i> Deskripsi</h5>
                        </div>
                        <div class="card-body">
                            ${card.description.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="col-md-4">
                <!-- Contact Person -->
                <div class="card shadow mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="fas fa-user-tie me-2"></i> Contact Person</h5>
                    </div>
                    <div class="card-body">
                        ${card.contact_person ? `
                            <p class="fw-bold mb-1">${card.contact_person}</p>
                            ${card.contact_position ? `<p class="text-muted small">${card.contact_position}</p>` : ''}
                            
                            ${card.contact_phone ? `
                                <p class="mb-1">
                                    <i class="fas fa-phone text-success me-2"></i>
                                    ${card.contact_phone}
                                </p>
                            ` : ''}
                            
                            ${card.contact_email ? `
                                <p class="mb-0">
                                    <i class="fas fa-envelope text-info me-2"></i>
                                    <a href="mailto:${card.contact_email}">${card.contact_email}</a>
                                </p>
                            ` : ''}
                        ` : '<p class="text-muted">Tidak ada informasi contact person</p>'}
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="card shadow mb-4">
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <a href="admin/edit.html?id=${card.id}" class="btn btn-warning">
                                <i class="fas fa-edit"></i> Edit Data
                            </a>
                            <button class="btn btn-danger" onclick="deleteCard('${card.id}')">
                                <i class="fas fa-trash"></i> Hapus Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Delete card
async function deleteCard(id) {
    if (!confirm('Yakin ingin menghapus kartu nama ini?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('business_cards')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        showAlert('Kartu nama berhasil dihapus', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error deleting card:', error);
        showAlert('Gagal menghapus data', 'danger');
    }
}
