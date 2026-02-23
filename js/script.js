// ==================== KONFIGURASI ====================
const SUPABASE_URL = 'https://qwlgdlgpcoajbdxyscsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hcqjcxDlcNT-tHU93cmTPQ_QS8Apih1';

// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== FUNGSI UTILITY ====================
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// ==================== FUNGSI UTAMA ====================

// 1. LOAD CATEGORIES UNTUK FILTER
async function loadCategories() {
    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('category_name');

        if (error) throw error;

        const selectFilter = document.getElementById('categoryFilter');
        const selectForm = document.getElementById('category_id');
        
        if (selectFilter) {
            selectFilter.innerHTML = '<option value="">Semua Kategori</option>';
            data.forEach(cat => {
                selectFilter.innerHTML += `<option value="${cat.id}">${cat.category_name}</option>`;
            });
        }
        
        if (selectForm) {
            selectForm.innerHTML = '<option value="">Pilih Kategori</option>';
            data.forEach(cat => {
                selectForm.innerHTML += `<option value="${cat.id}">${cat.category_name}</option>`;
            });
        }

        return data;
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

// 2. LOAD BUSINESS CARDS (UNTUK INDEX.HTML)
async function loadBusinessCards() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    showLoading('cardsContainer');

    try {
        const search = document.getElementById('searchInput')?.value || '';
        const categoryId = document.getElementById('categoryFilter')?.value || '';

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

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        if (search) {
            query = query.or(`company_name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        const { data: cards, error } = await query;

        if (error) throw error;

        if (!cards || cards.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: white; border-radius: 10px;">
                    <i class="fas fa-id-card" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <h3>Tidak Ada Data</h3>
                    <p>Belum ada kartu nama yang ditambahkan.</p>
                    <a href="admin/add.html" class="btn btn-primary">Tambah Kartu Baru</a>
                </div>
            `;
            return;
        }

        let html = '';
        cards.forEach(card => {
            html += `
                <div class="col">
                    <div class="card ${card.is_featured ? 'featured' : ''}">
                        ${card.is_featured ? '<div class="featured-badge"><i class="fas fa-crown"></i> Featured</div>' : ''}
                        <div class="card-img">
                            <i class="fas fa-building"></i>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${card.company_name || '-'}</h5>
                            ${card.categories ? `<span class="badge">${card.categories.category_name}</span>` : ''}
                            ${card.rating > 0 ? `
                                <div class="rating">
                                    ${'★'.repeat(Math.floor(card.rating))}${card.rating % 1 ? '½' : ''} (${card.rating})
                                </div>
                            ` : ''}
                            <div class="card-text">
                                <i class="fas fa-map-marker-alt"></i> ${card.address ? card.address.substring(0, 40) + '...' : '-'}
                            </div>
                            <div class="card-text">
                                <i class="fas fa-phone"></i> ${card.phone || card.mobile || '-'}
                            </div>
                        </div>
                        <div class="card-footer">
                            <a href="view.html?id=${card.id}" class="btn btn-primary btn-sm" style="flex: 1;">Detail</a>
                            <a href="admin/edit.html?id=${card.id}" class="btn btn-warning btn-sm">Edit</a>
                            <button onclick="deleteCard('${card.id}')" class="btn btn-danger btn-sm">Hapus</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Update stats
        updateStatistics();

    } catch (error) {
        console.error('Error:', error);
        showError('cardsContainer', error.message);
    }
}

// 3. LOAD SINGLE BUSINESS CARD (UNTUK VIEW.HTML)
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
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="detail-info">
                        <h1>${card.company_name || '-'}</h1>
                        ${card.tagline ? `<p><i>${card.tagline}</i></p>` : ''}
                        <div class="detail-meta">
                            ${card.categories ? `<span class="badge">${card.categories.category_name}</span>` : ''}
                            ${card.is_featured ? '<span class="badge" style="background: gold; color: #000;">Featured</span>' : ''}
                        </div>
                        ${card.rating > 0 ? `
                            <div class="rating" style="font-size: 1.2rem;">
                                ${'★'.repeat(Math.floor(card.rating))}${card.rating % 1 ? '½' : ''} (${card.rating})
                            </div>
                        ` : ''}
                        <p><i class="fas fa-eye"></i> Dilihat ${card.views || 0} kali</p>
                    </div>
                </div>

                <div class="detail-section">
                    <h3><i class="fas fa-address-card"></i> Informasi Kontak</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i> <strong>Alamat:</strong><br>
                            ${card.address || '-'}
                        </div>
                        <div class="info-item">
                            <i class="fas fa-phone"></i> <strong>Telepon:</strong><br>
                            ${card.phone || '-'}
                        </div>
                        ${card.mobile ? `
                            <div class="info-item">
                                <i class="fas fa-mobile-alt"></i> <strong>Mobile:</strong><br>
                                ${card.mobile}
                            </div>
                        ` : ''}
                        <div class="info-item">
                            <i class="fas fa-envelope"></i> <strong>Email:</strong><br>
                            ${card.email ? `<a href="mailto:${card.email}">${card.email}</a>` : '-'}
                        </div>
                        <div class="info-item">
                            <i class="fas fa-globe"></i> <strong>Website:</strong><br>
                            ${card.website ? `<a href="${card.website}" target="_blank">${card.website}</a>` : '-'}
                        </div>
                    </div>
                </div>

                ${card.contact_person ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-user-tie"></i> Contact Person</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <i class="fas fa-user"></i> <strong>Nama:</strong><br>
                                ${card.contact_person}
                            </div>
                            ${card.contact_position ? `
                                <div class="info-item">
                                    <i class="fas fa-briefcase"></i> <strong>Jabatan:</strong><br>
                                    ${card.contact_position}
                                </div>
                            ` : ''}
                            ${card.contact_phone ? `
                                <div class="info-item">
                                    <i class="fas fa-phone"></i> <strong>Telepon:</strong><br>
                                    ${card.contact_phone}
                                </div>
                            ` : ''}
                            ${card.contact_email ? `
                                <div class="info-item">
                                    <i class="fas fa-envelope"></i> <strong>Email:</strong><br>
                                    ${card.contact_email}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                ${card.description ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-file-alt"></i> Deskripsi</h3>
                        <p>${card.description.replace(/\n/g, '<br>')}</p>
                    </div>
                ` : ''}

                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <a href="admin/edit.html?id=${card.id}" class="btn btn-warning" style="flex: 1;">Edit Data</a>
                    <button onclick="deleteCard('${card.id}')" class="btn btn-danger" style="flex: 1;">Hapus Data</button>
                    <a href="index.html" class="btn btn-primary" style="flex: 1;">Kembali</a>
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('Error:', error);
        showError('cardDetail', error.message);
    }
}

// 4. DELETE CARD
async function deleteCard(id) {
    if (!confirm('Yakin ingin menghapus kartu nama ini?')) return;

    try {
        const { error } = await supabaseClient
            .from('business_cards')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Kartu nama berhasil dihapus!');
        
        // Redirect ke index jika di halaman view
        if (window.location.pathname.includes('view.html')) {
            window.location.href = 'index.html';
        } else {
            // Reload cards di halaman index
            loadBusinessCards();
        }

    } catch (error) {
        console.error('Error deleting:', error);
        alert('Gagal menghapus: ' + error.message);
    }
}

// 5. SAVE NEW CARD (UNTUK ADD.HTML)
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

        alert('Kartu nama berhasil ditambahkan!');
        return data[0];

    } catch (error) {
        console.error('Error saving:', error);
        alert('Gagal menyimpan: ' + error.message);
        throw error;
    }
}

// 6. UPDATE CARD (UNTUK EDIT.HTML)
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

        alert('Kartu nama berhasil diupdate!');

    } catch (error) {
        console.error('Error updating:', error);
        alert('Gagal mengupdate: ' + error.message);
        throw error;
    }
}

// 7. LOAD CARD FOR EDIT (UNTUK EDIT.HTML)
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
        document.getElementById('is_featured').checked = card.is_featured || false;
        document.getElementById('rating').value = card.rating || 0;

        // Sembunyikan loading
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('editForm').style.display = 'block';

    } catch (error) {
        console.error('Error loading card:', error);
        alert('Gagal memuat data: ' + error.message);
        window.location.href = '../index.html';
    }
}

// 8. UPDATE STATISTICS
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
        const totalCardsEl = document.getElementById('totalCards');
        const totalViewsEl = document.getElementById('totalViews');
        const avgRatingEl = document.getElementById('avgRating');
        const totalCategoriesEl = document.getElementById('totalCategories');

        if (totalCardsEl) totalCardsEl.textContent = totalCards;
        if (totalViewsEl) totalViewsEl.textContent = totalViews.toLocaleString();
        if (avgRatingEl) avgRatingEl.textContent = avgRating.toFixed(1);
        if (totalCategoriesEl) totalCategoriesEl.textContent = totalCategories || 0;

    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// 9. SEARCH FUNCTION
function searchCards() {
    loadBusinessCards();
}

// 10. FILTER FUNCTION
function filterByCategory() {
    loadBusinessCards();
}
