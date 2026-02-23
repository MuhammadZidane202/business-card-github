// ========== KONFIGURASI SUPABASE ==========
const SUPABASE_URL = 'https://qwlgdlgpcoajbdxyscsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hcqjcxDlcNT-tHU93cmTPQ_QS8Apih1';

// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== GLOBAL VARIABLES ==========
let currentPage = 1;
const itemsPerPage = 12;
let totalCards = 0;
let currentFilters = {};

// ========== UTILITY FUNCTIONS ==========
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Memuat data...</p>
            </div>
        `;
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
    }
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function renderStars(rating) {
    if (!rating) return '';
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

function truncateText(text, limit) {
    if (!text) return '-';
    if (text.length <= limit) return text;
    return text.substr(0, limit) + '...';
}

// ========== LOAD CATEGORIES (PASTI BERHASIL) ==========
async function loadCategories() {
    try {
        console.log('Loading categories...');
        
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('category_name');

        if (error) throw error;

        console.log('Categories loaded:', data);

        // Update category filter di index.html
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
            data.forEach(cat => {
                categoryFilter.innerHTML += `<option value="${cat.id}">${cat.category_name}</option>`;
            });
        }

        // Update category select di form add/edit
        const categorySelect = document.getElementById('category_id');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
            data.forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat.id}">${cat.category_name}</option>`;
            });
        }

        return data;

    } catch (error) {
        console.error('Error loading categories:', error);
        
        // Fallback categories jika error
        const fallbackCategories = [
            { id: '1', category_name: 'Hotel & Resort' },
            { id: '2', category_name: 'Restoran & Cafe' },
            { id: '3', category_name: 'Tempat Wisata' },
            { id: '4', category_name: 'Travel Agent' },
            { id: '5', category_name: 'Souvenir & Oleh-oleh' }
        ];
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
            fallbackCategories.forEach(cat => {
                categoryFilter.innerHTML += `<option value="${cat.id}">${cat.category_name}</option>`;
            });
        }
        
        return fallbackCategories;
    }
}

// ========== LOAD BUSINESS CARDS ==========
async function loadBusinessCards() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    showLoading('cardsContainer');

    try {
        const search = document.getElementById('searchInput')?.value || '';
        const categoryId = document.getElementById('categoryFilter')?.value || '';
        const rating = document.getElementById('ratingFilter')?.value || '';
        const sort = document.getElementById('sortFilter')?.value || 'newest';

        let query = supabaseClient
            .from('business_cards')
            .select(`
                *,
                categories (
                    category_name,
                    icon
                )
            `)
            .eq('is_active', true);

        // Filter by category
        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        // Filter by search
        if (search) {
            query = query.or(`company_name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        // Filter by rating
        if (rating) {
            query = query.gte('rating', parseInt(rating));
        }

        // Sorting
        switch (sort) {
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

        const { data: cards, error } = await query;

        if (error) throw error;

        if (!cards || cards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-id-card"></i>
                    <h3>Tidak Ada Kartu Nama</h3>
                    <p>Belum ada kartu nama yang ditambahkan ke database.</p>
                    <a href="admin/add.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Tambah Kartu Baru
                    </a>
                </div>
            `;
            return;
        }

        let html = '';
        cards.forEach(card => {
            html += `
                <div class="business-card ${card.is_featured ? 'featured' : ''}">
                    ${card.is_featured ? '<div class="featured-badge"><i class="fas fa-crown"></i> Featured</div>' : ''}
                    
                    <div class="card-image">
                        ${card.logo_url ? 
                            `<img src="${card.logo_url}" alt="${card.company_name}">` : 
                            `<i class="fas fa-building"></i>`
                        }
                        ${card.categories ? 
                            `<div class="card-category">
                                <i class="fas ${card.categories.icon || 'fa-tag'}"></i>
                                ${card.categories.category_name}
                            </div>` : ''
                        }
                    </div>
                    
                    <div class="card-body">
                        <h5 class="card-title">${card.company_name || '-'}</h5>
                        ${card.tagline ? `<div class="card-tagline">${card.tagline}</div>` : ''}
                        
                        ${card.rating > 0 ? `
                            <div class="card-rating">
                                ${renderStars(card.rating)}
                                <span>(${card.rating})</span>
                            </div>
                        ` : ''}
                        
                        <div class="card-info">
                            <i class="fas fa-map-marker-alt"></i>
                            ${truncateText(card.address || '-', 35)}
                        </div>
                        
                        <div class="card-info">
                            <i class="fas fa-phone"></i>
                            ${card.phone || card.mobile || '-'}
                        </div>
                        
                        ${card.email ? `
                            <div class="card-info">
                                <i class="fas fa-envelope"></i>
                                ${truncateText(card.email, 25)}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-footer">
                        <a href="view.html?id=${card.id}" class="btn btn-primary btn-sm" style="flex: 1;">
                            <i class="fas fa-eye"></i> Detail
                        </a>
                        <a href="admin/edit.html?id=${card.id}" class="btn btn-warning btn-sm">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button onclick="deleteCard('${card.id}')" class="btn btn-danger btn-sm">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Update statistics
        updateStatistics();

    } catch (error) {
        console.error('Error:', error);
        showError('cardsContainer', 'Gagal memuat data: ' + error.message);
    }
}

// ========== LOAD SINGLE BUSINESS CARD ==========
async function loadBusinessCard(id) {
    const container = document.getElementById('cardDetail');
    if (!container) return;

    showLoading('cardDetail');

    try {
        const { data: card, error } = await supabaseClient
            .from('business_cards')
            .select(`
                *,
                categories (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!card) {
            container.innerHTML = '<div class="alert alert-danger">Data tidak ditemukan</div>';
            return;
        }

        // Update views
        await supabaseClient
            .from('business_cards')
            .update({ views: (card.views || 0) + 1 })
            .eq('id', id);

        let html = `
            <div class="detail-container">
                <div class="detail-header">
                    <div class="detail-logo">
                        ${card.logo_url ? 
                            `<img src="${card.logo_url}" alt="${card.company_name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;">` : 
                            `<i class="fas fa-building"></i>`
                        }
                    </div>
                    <div class="detail-info">
                        <h1>${card.company_name || '-'}</h1>
                        ${card.tagline ? `<div class="detail-tagline">${card.tagline}</div>` : ''}
                        
                        <div class="detail-meta">
                            ${card.categories ? 
                                `<span class="detail-badge">
                                    <i class="fas ${card.categories.icon || 'fa-tag'}"></i>
                                    ${card.categories.category_name}
                                </span>` : ''
                            }
                            ${card.is_featured ? 
                                '<span class="detail-badge"><i class="fas fa-crown"></i> Featured</span>' : ''
                            }
                        </div>
                        
                        ${card.rating > 0 ? `
                            <div class="detail-rating">
                                ${renderStars(card.rating)}
                                <span style="margin-left: 10px;">(${card.rating} / 5)</span>
                            </div>
                        ` : ''}
                        
                        <div class="detail-views">
                            <i class="fas fa-eye"></i> Dilihat ${card.views || 0} kali
                        </div>
                    </div>
                </div>
                
                <div class="detail-content">
                    <div class="detail-section">
                        <h3><i class="fas fa-address-card"></i> Informasi Kontak</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <strong>Alamat:</strong><br>
                                ${card.address || '-'}
                            </div>
                            <div class="info-item">
                                <i class="fas fa-phone"></i>
                                <strong>Telepon:</strong><br>
                                ${card.phone || '-'}
                            </div>
                            ${card.mobile ? `
                                <div class="info-item">
                                    <i class="fas fa-mobile-alt"></i>
                                    <strong>Mobile:</strong><br>
                                    ${card.mobile}
                                </div>
                            ` : ''}
                            ${card.fax ? `
                                <div class="info-item">
                                    <i class="fas fa-fax"></i>
                                    <strong>Fax:</strong><br>
                                    ${card.fax}
                                </div>
                            ` : ''}
                            <div class="info-item">
                                <i class="fas fa-envelope"></i>
                                <strong>Email:</strong><br>
                                ${card.email ? `<a href="mailto:${card.email}">${card.email}</a>` : '-'}
                            </div>
                            <div class="info-item">
                                <i class="fas fa-globe"></i>
                                <strong>Website:</strong><br>
                                ${card.website ? `<a href="${card.website}" target="_blank">${card.website}</a>` : '-'}
                            </div>
                        </div>
                    </div>
                    
                    ${card.contact_person ? `
                        <div class="detail-section">
                            <h3><i class="fas fa-user-tie"></i> Contact Person</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <i class="fas fa-user"></i>
                                    <strong>Nama:</strong><br>
                                    ${card.contact_person}
                                </div>
                                ${card.contact_position ? `
                                    <div class="info-item">
                                        <i class="fas fa-briefcase"></i>
                                        <strong>Jabatan:</strong><br>
                                        ${card.contact_position}
                                    </div>
                                ` : ''}
                                ${card.contact_phone ? `
                                    <div class="info-item">
                                        <i class="fas fa-phone"></i>
                                        <strong>Telepon:</strong><br>
                                        ${card.contact_phone}
                                    </div>
                                ` : ''}
                                ${card.contact_email ? `
                                    <div class="info-item">
                                        <i class="fas fa-envelope"></i>
                                        <strong>Email:</strong><br>
                                        <a href="mailto:${card.contact_email}">${card.contact_email}</a>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${card.description ? `
                        <div class="detail-section">
                            <h3><i class="fas fa-file-alt"></i> Deskripsi</h3>
                            <p style="line-height: 1.8;">${card.description.replace(/\n/g, '<br>')}</p>
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 15px; margin-top: 30px;">
                        <a href="admin/edit.html?id=${card.id}" class="btn btn-warning" style="flex: 1;">
                            <i class="fas fa-edit"></i> Edit Data
                        </a>
                        <button onclick="deleteCard('${card.id}')" class="btn btn-danger" style="flex: 1;">
                            <i class="fas fa-trash"></i> Hapus Data
                        </button>
                        <a href="index.html" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-arrow-left"></i> Kembali
                        </a>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('Error:', error);
        showError('cardDetail', 'Gagal memuat data: ' + error.message);
    }
}

// ========== DELETE CARD ==========
async function deleteCard(id) {
    if (!confirm('Yakin ingin menghapus kartu nama ini? Data yang dihapus tidak dapat dikembalikan.')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('business_cards')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showSuccess('Kartu nama berhasil dihapus!');
        
        setTimeout(() => {
            if (window.location.pathname.includes('view.html')) {
                window.location.href = 'index.html';
            } else {
                loadBusinessCards();
            }
        }, 1500);

    } catch (error) {
        console.error('Error deleting:', error);
        alert('Gagal menghapus: ' + error.message);
    }
}

// ========== SAVE NEW CARD ==========
async function saveBusinessCard(formData) {
    try {
        const { data, error } = await supabaseClient
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

        showSuccess('Kartu nama berhasil ditambahkan!');
        return data[0];

    } catch (error) {
        console.error('Error saving:', error);
        alert('Gagal menyimpan: ' + error.message);
        throw error;
    }
}

// ========== UPDATE CARD ==========
async function updateBusinessCard(id, formData) {
    try {
        const { error } = await supabaseClient
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
                is_featured: formData.is_featured || false,
                rating: formData.rating || 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        showSuccess('Kartu nama berhasil diupdate!');

    } catch (error) {
        console.error('Error updating:', error);
        alert('Gagal mengupdate: ' + error.message);
        throw error;
    }
}

// ========== LOAD CARD FOR EDIT ==========
async function loadCardForEdit(id) {
    try {
        const { data: card, error } = await supabaseClient
            .from('business_cards')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Isi form
        document.getElementById('card_id').value = card.id;
        document.getElementById('category_id').value = card.category_id || '';
        document.getElementById('company_name').value = card.company_name || '';
        document.getElementById('tagline').value = card.tagline || '';
        document.getElementById('address').value = card.address || '';
        document.getElementById('phone').value = card.phone || '';
        document.getElementById('mobile').value = card.mobile || '';
        document.getElementById('email').value = card.email || '';
        document.getElementById('website').value = card.website || '';
        document.getElementById('contact_person').value = card.contact_person || '';
        document.getElementById('contact_position').value = card.contact_position || '';
        document.getElementById('contact_phone').value = card.contact_phone || '';
        document.getElementById('contact_email').value = card.contact_email || '';
        document.getElementById('description').value = card.description || '';
        
        const featuredCheck = document.getElementById('is_featured');
        if (featuredCheck) featuredCheck.checked = card.is_featured || false;
        
        const ratingInput = document.getElementById('rating');
        if (ratingInput) ratingInput.value = card.rating || 0;

        // Sembunyikan loading
        const spinner = document.getElementById('loadingSpinner');
        const form = document.getElementById('editForm');
        
        if (spinner) spinner.style.display = 'none';
        if (form) form.style.display = 'block';

    } catch (error) {
        console.error('Error loading card:', error);
        alert('Gagal memuat data: ' + error.message);
        window.location.href = '../index.html';
    }
}

// ========== UPDATE STATISTICS ==========
async function updateStatistics() {
    try {
        const { data: cards, error } = await supabaseClient
            .from('business_cards')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        const totalCards = cards.length;
        const totalViews = cards.reduce((sum, card) => sum + (card.views || 0), 0);
        const avgRating = cards.filter(c => c.rating > 0).reduce((sum, c) => sum + c.rating, 0) / 
                         (cards.filter(c => c.rating > 0).length || 1);

        const { count: totalCategories } = await supabaseClient
            .from('categories')
            .select('*', { count: 'exact', head: true });

        // Update DOM
        const elements = {
            totalCards: document.getElementById('totalCards'),
            totalViews: document.getElementById('totalViews'),
            avgRating: document.getElementById('avgRating'),
            totalCategories: document.getElementById('totalCategories')
        };

        if (elements.totalCards) elements.totalCards.textContent = totalCards;
        if (elements.totalViews) elements.totalViews.textContent = totalViews.toLocaleString();
        if (elements.avgRating) elements.avgRating.textContent = avgRating.toFixed(1);
        if (elements.totalCategories) elements.totalCategories.textContent = totalCategories || 0;

    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ========== SEARCH & FILTER FUNCTIONS ==========
function searchCards() {
    loadBusinessCards();
}

function filterByCategory() {
    loadBusinessCards();
}

function filterByRating() {
    loadBusinessCards();
}

function sortCards() {
    loadBusinessCards();
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const ratingFilter = document.getElementById('ratingFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (ratingFilter) ratingFilter.value = '';
    if (sortFilter) sortFilter.value = 'newest';
    
    loadBusinessCards();
}
