// ==================== GLOBAL VARIABLES ====================
let currentPage = 1;
const itemsPerPage = 12;
let totalCards = 0;
let currentFilters = {};

// ==================== UTILITY FUNCTIONS ====================

// Render bintang rating
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Truncate text
function truncateText(text, limit) {
    if (!text) return '-';
    if (text.length <= limit) return text;
    return text.substr(0, limit) + '...';
}

// Show alert
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// ==================== CATEGORIES FUNCTIONS ====================

// Load categories untuk filter
async function loadCategories() {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('category_name');

        if (error) throw error;

        const select = document.getElementById('categoryFilter');
        if (select) {
            select.innerHTML = '<option value="">Semua Kategori</option>';
            categories.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.category_name}</option>`;
            });
        }

        return categories;

    } catch (error) {
        console.error('Error loading categories:', error);
        showAlert('Gagal memuat kategori', 'danger');
        return [];
    }
}

// Load categories untuk dropdown di form
async function loadCategoryOptions(selectedId = null) {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('category_name');

        if (error) throw error;

        const select = document.getElementById('category_id');
        if (select) {
            select.innerHTML = '<option value="">Pilih Kategori</option>';
            categories.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}" ${selectedId === cat.id ? 'selected' : ''}>${cat.category_name}</option>`;
            });
        }

    } catch (error) {
        console.error('Error loading category options:', error);
        showAlert('Gagal memuat kategori', 'danger');
    }
}

// ==================== BUSINESS CARDS FUNCTIONS ====================

// Load semua business cards
async function loadBusinessCards(page = 1, filters = {}) {
    try {
        currentPage = page;
        currentFilters = filters;

        let query = supabase
            .from('business_cards')
            .select(`
                *,
                categories (
                    category_name,
                    icon
                )
            `, { count: 'exact' })
            .eq('is_active', true);

        // Filter by category
        if (filters.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }

        // Filter by search
        if (filters.search) {
            query = query.or(`company_name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
        }

        // Filter by rating
        if (filters.minRating) {
            query = query.gte('rating', filters.minRating);
        }

        // Filter featured
        if (filters.featured) {
            query = query.eq('is_featured', true);
        }

        // Sorting
        switch (filters.sortBy) {
            case 'rating':
                query = query.order('rating', { ascending: false });
                break;
            case 'name':
                query = query.order('company_name', { ascending: true });
                break;
            case 'views':
                query = query.order('views', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        // Pagination
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        
        const { data: cards, error, count } = await query.range(from, to);

        if (error) throw error;

        totalCards = count || 0;
        displayCards(cards || []);
        displayPagination();

        // Update statistics
        updateStatistics();

    } catch (error) {
        console.error('Error loading cards:', error);
        showAlert('Gagal memuat data: ' + error.message, 'danger');
        document.getElementById('cardsContainer').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <h4>Gagal Memuat Data</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i> Muat Ulang
                    </button>
                </div>
            </div>
        `;
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
                    <h4>Tidak Ada Data Kartu Nama</h4>
                    <p class="mb-3">Belum ada kartu nama yang ditambahkan ke database.</p>
                    <a href="admin/add.html" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Tambah Kartu Nama Baru
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
                <div class="card card-hover ${card.is_featured ? 'featured' : ''}">
                    ${card.is_featured ? '<div class="featured-badge"><i class="fas fa-crown me-1"></i>Featured</div>' : ''}
                    
                    <div class="card-img-top">
                        ${card.logo_url ? 
                            `<img src="${card.logo_url}" alt="${card.company_name}" style="height: 100px; object-fit: contain;">` : 
                            `<i class="fas fa-building fa-3x"></i>`
                        }
                    </div>
                    
                    <div class="card-body">
                        <h6 class="card-title">${card.company_name}</h6>
                        
                        ${card.categories ? `
                            <span class="badge bg-primary mb-2">
                                <i class="fas ${card.categories.icon || 'fa-tag'} me-1"></i>
                                ${card.categories.category_name}
                            </span>
                        ` : ''}
                        
                        ${card.rating > 0 ? `
                            <div class="rating mb-2">
                                ${renderStars(card.rating)}
                                <small class="text-muted ms-1">(${card.rating})</small>
                            </div>
                        ` : ''}
                        
                        <p class="card-text small text-muted mb-2">
                            <i class="fas fa-map-marker-alt text-danger me-1"></i>
                            ${truncateText(card.address || '-', 35)}
                        </p>
                        
                        <p class="card-text small text-muted mb-0">
                            <i class="fas fa-phone text-success me-1"></i>
                            ${card.phone || card.mobile || '-'}
                        </p>
                    </div>
                    
                    <div class="card-footer">
                        <div class="d-flex gap-2">
                            <a href="view.html?id=${card.id}" class="btn btn-primary btn-sm flex-grow-1">
                                <i class="fas fa-eye me-1"></i>Detail
                            </a>
                            <a href="admin/edit.html?id=${card.id}" class="btn btn-warning btn-sm">
                                <i class="fas fa-edit"></i>
                            </a>
                            <button class="btn btn-danger btn-sm" onclick="deleteCard('${card.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load detail business card
async function loadBusinessCard(id) {
    try {
        const { data: card, error } = await supabase
            .from('business_cards')
            .select(`
                *,
                categories (*),
                business_gallery (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!card) {
            showAlert('Data tidak ditemukan', 'danger');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }

        // Update views
        await supabase
            .from('business_cards')
            .update({ views: (card.views || 0) + 1 })
            .eq('id', id);

        displayBusinessCard(card);

    } catch (error) {
        console.error('Error loading card:', error);
        showAlert('Gagal memuat data: ' + error.message, 'danger');
        document.getElementById('cardDetail').innerHTML = `
            <div class="alert alert-danger text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h4>Gagal Memuat Data</h4>
                <p>${error.message}</p>
                <a href="index.html" class="btn btn-primary mt-3">
                    <i class="fas fa-home me-2"></i>Kembali ke Home
                </a>
            </div>
        `;
    }
}

// Tampilkan detail card
function displayBusinessCard(card) {
    const container = document.getElementById('cardDetail');
    if (!container) return;

    let html = `
        <div class="row">
            <div class="col-md-8">
                <!-- Main Info Card -->
                <div class="card detail-card mb-4">
                    <div class="detail-header">
                        <div class="row align-items-center">
                            <div class="col-md-3 text-center mb-3 mb-md-0">
                                ${card.logo_url ? 
                                    `<img src="${card.logo_url}" alt="${card.company_name}" style="max-height: 120px; max-width: 100%;">` : 
                                    `<i class="fas fa-building fa-4x"></i>`
                                }
                            </div>
                            <div class="col-md-9">
                                <h2 class="mb-2">${card.company_name}</h2>
                                ${card.tagline ? `<p class="mb-2 opacity-75"><i>${card.tagline}</i></p>` : ''}
                                
                                ${card.categories ? `
                                    <span class="badge bg-light text-dark me-2">
                                        <i class="fas ${card.categories.icon || 'fa-tag'} me-1"></i>
                                        ${card.categories.category_name}
                                    </span>
                                ` : ''}
                                
                                ${card.is_featured ? `
                                    <span class="badge bg-warning">
                                        <i class="fas fa-crown me-1"></i>Featured
                                    </span>
                                ` : ''}
                                
                                ${card.rating > 0 ? `
                                    <div class="mt-3">
                                        ${renderStars(card.rating)}
                                        <span class="ms-2">(${card.rating} / 5)</span>
                                    </div>
                                ` : ''}
                                
                                <div class="mt-2">
                                    <small><i class="fas fa-eye me-1"></i> Dilihat ${card.views || 0} kali</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Contact Information -->
                <div class="card mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="fas fa-address-card me-2"></i>Informasi Kontak</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="info-item">
                                    <i class="fas fa-map-marker-alt text-danger"></i>
                                    <strong>Alamat:</strong><br>
                                    <span class="ms-4">${card.address || '-'}</span>
                                </div>
                                
                                <div class="info-item">
                                    <i class="fas fa-phone text-success"></i>
                                    <strong>Telepon:</strong><br>
                                    <span class="ms-4">${card.phone || '-'}</span>
                                </div>
                                
                                ${card.mobile ? `
                                    <div class="info-item">
                                        <i class="fas fa-mobile-alt text-success"></i>
                                        <strong>Mobile:</strong><br>
                                        <span class="ms-4">${card.mobile}</span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="col-md-6">
                                <div class="info-item">
                                    <i class="fas fa-envelope text-info"></i>
                                    <strong>Email:</strong><br>
                                    <span class="ms-4">${card.email ? `<a href="mailto:${card.email}">${card.email}</a>` : '-'}</span>
                                </div>
                                
                                <div class="info-item">
                                    <i class="fas fa-globe text-info"></i>
                                    <strong>Website:</strong><br>
                                    <span class="ms-4">${card.website ? `<a href="${card.website}" target="_blank">${card.website}</a>` : '-'}</span>
                                </div>
                                
                                ${card.fax ? `
                                    <div class="info-item">
                                        <i class="fas fa-fax text-secondary"></i>
                                        <strong>Fax:</strong><br>
                                        <span class="ms-4">${card.fax}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${card.description ? `
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="fas fa-file-alt me-2"></i>Deskripsi</h5>
                        </div>
                        <div class="card-body">
                            ${card.description.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                ` : ''}

                <!-- Gallery -->
                ${card.business_gallery && card.business_gallery.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="fas fa-images me-2"></i>Galeri Foto</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                ${card.business_gallery.map(img => `
                                    <div class="col-md-3 col-6">
                                        <div class="gallery-item">
                                            <img src="${img.image_url}" alt="${img.caption || 'Foto'}">
                                            ${img.caption ? `<div class="caption">${img.caption}</div>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="col-md-4">
                <!-- Contact Person -->
                <div class="card mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="fas fa-user-tie me-2"></i>Contact Person</h5>
                    </div>
                    <div class="card-body">
                        ${card.contact_person ? `
                            <h6 class="fw-bold mb-1">${card.contact_person}</h6>
                            ${card.contact_position ? `<p class="text-muted small mb-2">${card.contact_position}</p>` : ''}
                            
                            ${card.contact_phone ? `
                                <p class="mb-2">
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

                <!-- Business Hours -->
                ${card.operating_hours && card.operating_hours.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="fas fa-clock me-2"></i>Jam Operasional</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <tbody>
                                        ${card.operating_hours.map(hour => `
                                            <tr>
                                                <td>${['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][hour.day_of_week]}</td>
                                                <td>${hour.is_closed ? 
                                                    '<span class="text-danger">Tutup</span>' : 
                                                    `${hour.open_time} - ${hour.close_time}`
                                                }</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Action Buttons -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <a href="admin/edit.html?id=${card.id}" class="btn btn-warning">
                                <i class="fas fa-edit me-2"></i>Edit Data
                            </a>
                            <button class="btn btn-danger" onclick="deleteCard('${card.id}')">
                                <i class="fas fa-trash me-2"></i>Hapus Data
                            </button>
                            <button class="btn btn-secondary" onclick="window.print()">
                                <i class="fas fa-print me-2"></i>Cetak
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Share Buttons -->
                <div class="card">
                    <div class="card-body">
                        <h6 class="mb-3">Bagikan:</h6>
                        <div class="d-flex gap-2">
                            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" 
                               target="_blank" class="btn btn-primary btn-sm flex-grow-1">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(card.company_name)}" 
                               target="_blank" class="btn btn-info btn-sm flex-grow-1">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="https://wa.me/?text=${encodeURIComponent(card.company_name + ' ' + window.location.href)}" 
                               target="_blank" class="btn btn-success btn-sm flex-grow-1">
                                <i class="fab fa-whatsapp"></i>
                            </a>
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
    if (!confirm('Yakin ingin menghapus kartu nama ini? Data yang dihapus tidak dapat dikembalikan.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('business_cards')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        showAlert('Kartu nama berhasil dihapus!', 'success');
        
        // Redirect or reload
        setTimeout(() => {
            if (window.location.pathname.includes('view.html')) {
                window.location.href = 'index.html';
            } else {
                loadBusinessCards(currentPage, currentFilters);
            }
        }, 1500);
        
    } catch (error) {
        console.error('Error deleting card:', error);
        showAlert('Gagal menghapus data: ' + error.message, 'danger');
    }
}

// ==================== SEARCH & FILTER FUNCTIONS ====================

// Search function
function searchCards() {
    const search = document.getElementById('searchInput')?.value || '';
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    
    loadBusinessCards(1, {
        search: search,
        categoryId: categoryId,
        minRating: currentFilters.minRating,
        sortBy: currentFilters.sortBy
    });
}

// Filter by category
function filterByCategory() {
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    const search = document.getElementById('searchInput')?.value || '';
    
    loadBusinessCards(1, {
        search: search,
        categoryId: categoryId,
        minRating: currentFilters.minRating,
        sortBy: currentFilters.sortBy
    });
}

// Filter by rating
function filterByRating(rating) {
    const search = document.getElementById('searchInput')?.value || '';
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    
    loadBusinessCards(1, {
        search: search,
        categoryId: categoryId,
        minRating: rating,
        sortBy: currentFilters.sortBy
    });
}

// Sort cards
function sortCards(sortBy) {
    const search = document.getElementById('searchInput')?.value || '';
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    
    loadBusinessCards(1, {
        search: search,
        categoryId: categoryId,
        minRating: currentFilters.minRating,
        sortBy: sortBy
    });
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    document.getElementById('sortFilter').value = '';
    
    loadBusinessCards(1, {});
}

// ==================== PAGINATION FUNCTIONS ====================

// Display pagination
function displayPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(totalCards / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '<nav><ul class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        html += `<li class="page-item">
                    <button class="page-link" onclick="changePage(${currentPage - 1})">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </li>`;
    } else {
        html += `<li class="page-item disabled">
                    <span class="page-link"><i class="fas fa-chevron-left"></i></span>
                </li>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            html += `<li class="page-item">
                        <button class="page-link" onclick="changePage(${i})">${i}</button>
                    </li>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<li class="page-item">
                    <button class="page-link" onclick="changePage(${currentPage + 1})">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </li>`;
    } else {
        html += `<li class="page-item disabled">
                    <span class="page-link"><i class="fas fa-chevron-right"></i></span>
                </li>`;
    }
    
    html += '</ul></nav>';
    paginationContainer.innerHTML = html;
}

// Change page
function changePage(page) {
    loadBusinessCards(page, currentFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== STATISTICS FUNCTIONS ====================

// Update statistics
async function updateStatistics() {
    try {
        const { data: cards, error } = await supabase
            .from('business_cards')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        const totalCards = cards.length;
        const totalViews = cards.reduce((sum, card) => sum + (card.views || 0), 0);
        const avgRating = cards.filter(c => c.rating > 0).reduce((sum, c) => sum + c.rating, 0) / 
                         (cards.filter(c => c.rating > 0).length || 1);
        
        const categories = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true });

        // Update stats in HTML
        document.getElementById('totalCards').textContent = totalCards;
        document.getElementById('totalViews').textContent = totalViews.toLocaleString();
        document.getElementById('avgRating').textContent = avgRating.toFixed(1);
        document.getElementById('totalCategories').textContent = categories.count || 0;

    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// ==================== FORM FUNCTIONS ====================

// Save business card (Create)
async function saveBusinessCard(formData) {
    try {
        const { data, error } = await supabase
            .from('business_cards')
            .insert([{
                category_id: formData.category_id,
                company_name: formData.company_name,
                tagline: formData.tagline,
                address: formData.address,
                phone: formData.phone,
                mobile: formData.mobile,
                email: formData.email,
                website: formData.website,
                contact_person: formData.contact_person,
                contact_position: formData.contact_position,
                contact_phone: formData.contact_phone,
                contact_email: formData.contact_email,
                description: formData.description,
                is_active: true,
                views: 0
            }])
            .select();

        if (error) throw error;

        showAlert('Kartu nama berhasil ditambahkan!', 'success');
        return data[0];

    } catch (error) {
        console.error('Error saving card:', error);
        showAlert('Gagal menyimpan: ' + error.message, 'danger');
        throw error;
    }
}

// Update business card
async function updateBusinessCard(id, formData) {
    try {
        const { error } = await supabase
            .from('business_cards')
            .update({
                category_id: formData.category_id,
                company_name: formData.company_name,
                tagline: formData.tagline,
                address: formData.address,
                phone: formData.phone,
                mobile: formData.mobile,
                email: formData.email,
                website: formData.website,
                contact_person: formData.contact_person,
                contact_position: formData.contact_position,
                contact_phone: formData.contact_phone,
                contact_email: formData.contact_email,
                description: formData.description,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        showAlert('Kartu nama berhasil diupdate!', 'success');

    } catch (error) {
        console.error('Error updating card:', error);
        showAlert('Gagal mengupdate: ' + error.message, 'danger');
        throw error;
    }
}

// ==================== EXPORT FUNCTIONS ====================

// Export to CSV
async function exportToCSV() {
    try {
        const { data: cards, error } = await supabase
            .from('business_cards')
            .select(`
                *,
                categories (category_name)
            `)
            .eq('is_active', true);

        if (error) throw error;

        // Create CSV header
        const headers = ['Nama Perusahaan', 'Kategori', 'Alamat', 'Telepon', 'Email', 'Website', 'Rating', 'Views'];
        let csv = headers.join(',') + '\n';

        // Add data
        cards.forEach(card => {
            const row = [
                `"${card.company_name}"`,
                `"${card.categories?.category_name || ''}"`,
                `"${card.address || ''}"`,
                `"${card.phone || ''}"`,
                `"${card.email || ''}"`,
                `"${card.website || ''}"`,
                card.rating || 0,
                card.views || 0
            ];
            csv += row.join(',') + '\n';
        });

        // Download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `business_cards_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

    } catch (error) {
        console.error('Error exporting:', error);
        showAlert('Gagal export data', 'danger');
    }
}
