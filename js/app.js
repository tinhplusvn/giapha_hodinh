// app.js - Xử lý gia phả (LƯU VÀO LOCALSTORAGE, KHÔNG TẢI FILE)
(function() {
    'use strict';

    let data = JSON.parse(JSON.stringify(familyData));
    const TITLE_ICONS = {
        'Trưởng tộc': 'fa-crown',
        'Con trai trưởng': 'fa-star-of-life',
        'Con trai': 'fa-mars',
        'Con gái': 'fa-venus',
        'Con dâu': 'fa-female',
        'Con rể': 'fa-male',
        'Cháu nội': 'fa-baby',
        'Cháu ngoại': 'fa-baby-carriage',
        'Vợ/Chồng': 'fa-heart'
    };
    const GEN_LABELS = ['Đời 1 - Ông bà', 'Đời 2 - Con cái', 'Đời 3 - Cháu', 'Đời 4 - Chắt', 'Đời 5'];

    // ===== HELPERS =====
    const $ = id => document.getElementById(id);
    const qsa = (sel, ctx) => (ctx || document).querySelectorAll(sel);

    let saveTimeout = null;
    let isSaving = false;

    function genId() {
        const ids = data.thanhVien.map(m => parseInt(m.id));
        return String(Math.max(...ids, 0) + 1);
    }

    function genMemorialId() {
        const ids = data.ngayGio.map(m => parseInt(m.id) || 0);
        return String(Math.max(...ids, 0) + 1);
    }

    function toast(msg, type = 'success') {
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${msg}`;
        el.style.background = type === 'success' ? '#2e7d32' : '#c0392b';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2500);
    }

    // ===== TỰ ĐỘNG LƯU VÀO LOCALSTORAGE (KHÔNG TẢI FILE) =====
    function autoSaveData() {
        if (isSaving) return;
        
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
            saveDataToLocalStorage();
            saveTimeout = null;
        }, 300);
    }

    function saveDataToLocalStorage() {
        try {
            isSaving = true;
            // Lưu vào localStorage
            localStorage.setItem('familyData', JSON.stringify(data));
            
            // Hiển thị trạng thái đã lưu
            const statusEl = document.getElementById('saveStatus');
            if (statusEl) {
                statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#4CAF50;"></i> Đã lưu';
                statusEl.style.opacity = '1';
                setTimeout(() => {
                    statusEl.style.opacity = '0.6';
                }, 2000);
            }
            
            console.log('✅ Đã tự động lưu dữ liệu vào localStorage');
            isSaving = false;
        } catch (error) {
            console.error('❌ Lỗi khi lưu dữ liệu:', error);
            isSaving = false;
            toast('Lỗi lưu dữ liệu!', 'error');
        }
    }

    // ===== KHÔI PHỤC DỮ LIỆU TỪ LOCALSTORAGE =====
    function restoreDataFromLocalStorage() {
        try {
            const saved = localStorage.getItem('familyData');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.thanhVien && parsed.ngayGio) {
                    data = parsed;
                    console.log('✅ Đã khôi phục dữ liệu từ localStorage');
                    return true;
                }
            }
        } catch (e) {
            console.log('ℹ️ Không có dữ liệu trong localStorage, sử dụng dữ liệu mặc định');
        }
        return false;
    }

    // ===== TÍNH TUỔI THEO ÂM LỊCH (+1 tuổi) =====
    function getAge(m) {
        const now = new Date().getFullYear();
        if (m.namMat) {
            return m.namMat - m.namSinh + 1;
        }
        return now - m.namSinh + 1;
    }

    // ===== TÍNH THẾ HỆ =====
    function getGen(m, all) {
        if (!m.chaMeIds) return 0;
        const parentIds = m.chaMeIds.split(',').filter(Boolean);
        if (!parentIds.length) return 0;
        let maxGen = 0;
        parentIds.forEach(pid => {
            const p = all.find(x => x.id === pid);
            if (p) maxGen = Math.max(maxGen, getGen(p, all) + 1);
        });
        return maxGen;
    }

    function getGenLabel(m, all) {
        const g = getGen(m, all);
        return g < GEN_LABELS.length ? GEN_LABELS[g] : `Đời ${g+1}`;
    }

    // ===== THỐNG KÊ =====
    function updateStats() {
        const all = data.thanhVien;
        const total = all.length;
        const male = all.filter(m => m.gioiTinh === 'Nam').length;
        const female = all.filter(m => m.gioiTinh === 'Nữ').length;
        const alive = all.filter(m => !m.namMat || m.namMat === '').length;
        const dead = all.filter(m => m.namMat && m.namMat !== '').length;
        
        const genSet = new Set();
        all.forEach(m => {
            genSet.add(getGen(m, all));
        });
        const generations = genSet.size;

        animateNumber('totalMembers', total);
        animateNumber('totalMale', male);
        animateNumber('totalFemale', female);
        animateNumber('totalAlive', alive);
        animateNumber('totalDead', dead);
        animateNumber('totalGenerations', generations);
    }

    function animateNumber(elementId, newValue) {
        const el = $(elementId);
        if (!el) return;
        const oldValue = parseInt(el.textContent) || 0;
        
        if (oldValue !== newValue) {
            el.textContent = newValue;
            el.classList.remove('pop');
            void el.offsetWidth;
            el.classList.add('pop');
            setTimeout(() => {
                el.classList.remove('pop');
            }, 600);
        }
    }

    // ===== RENDER CARD =====
    function renderCard(m, showTitle = true) {
        const isDead = m.namMat !== null && m.namMat !== '';
        const isSelf = m.isSelf === true;
        const age = getAge(m);
        
        let genderIcon = 'fa-user';
        if (m.gioiTinh === 'Nam') genderIcon = 'fa-mars';
        else if (m.gioiTinh === 'Nữ') genderIcon = 'fa-venus';
        
        const icon = isSelf ? 'fa-star' : (TITLE_ICONS[m.vaiTro] || genderIcon);
        const cls = `member-card${isDead ? ' deceased' : ''}${isSelf ? ' self' : ''}`;

        let ageText = '';
        if (isDead) {
            ageText = `Mất: ${m.namMat} (hưởng thọ ${age} tuổi ÂL)`;
        } else {
            ageText = `${age} tuổi (ÂL)`;
        }

        const genderDisplay = m.gioiTinh === 'Nam' ? '👨 Nam' : (m.gioiTinh === 'Nữ' ? '👩 Nữ' : '');

        return `
            <div class="${cls}" data-id="${m.id}">
                <div class="member-name" data-id="${m.id}"><i class="fas ${icon}"></i> ${m.ten}</div>
                ${showTitle && m.vaiTro ? `<div class="member-title"><i class="fas ${TITLE_ICONS[m.vaiTro] || 'fa-tag'}"></i> ${m.vaiTro}</div>` : ''}
                <div class="member-dob"><i class="fas fa-calendar-alt"></i> Sinh: ${m.namSinh}</div>
                <div class="member-dod"><i class="fas ${isDead ? 'fa-skull' : 'fa-birthday-cake'}"></i> ${ageText}</div>
                ${genderDisplay ? `<div class="member-gender"><i class="fas ${genderIcon}"></i> ${genderDisplay}</div>` : ''}
                ${m.queQuan ? `<div class="member-hometown"><i class="fas fa-map-marker-alt"></i> ${m.queQuan}</div>` : ''}
            </div>
        `;
    }

    // ===== XÂY DỰNG CÂY GIA PHẢ =====
    function buildTree() {
        const all = data.thanhVien;
        const map = new Map(all.map(m => [m.id, m]));

        updateStats();

        const genMap = new Map();
        all.forEach(m => {
            genMap.set(m.id, getGen(m, all));
        });

        let html = '<ul class="tree-root">';

        function getChildren(parentId) {
            return all.filter(c => {
                const pids = c.chaMeIds ? c.chaMeIds.split(',').filter(Boolean) : [];
                return pids.includes(parentId);
            });
        }

        function getSpouse(memberId) {
            const member = map.get(memberId);
            if (!member || !member.voChongIds) return null;
            const ids = member.voChongIds.split(',').filter(Boolean);
            for (let id of ids) {
                if (id !== memberId) {
                    const s = map.get(id);
                    if (s) return s;
                }
            }
            return null;
        }

        function buildNode(memberId, processed = new Set()) {
            if (processed.has(memberId)) return '';
            processed.add(memberId);

            const member = map.get(memberId);
            if (!member) return '';

            let spouse = null;
            if (member.voChongIds) {
                const ids = member.voChongIds.split(',').filter(Boolean);
                for (let id of ids) {
                    if (id !== memberId && !processed.has(id)) {
                        const s = map.get(id);
                        if (s) {
                            spouse = s;
                            processed.add(id);
                            break;
                        }
                    }
                }
            }

            const children = getChildren(memberId);
            const validChildren = children.filter(c => !processed.has(c.id));
            validChildren.sort((a, b) => a.namSinh - b.namSinh);

            let html = '<li>';
            html += '<div class="family-group">';

            html += '<div class="couple">';
            html += renderCard(member);
            if (spouse) html += renderCard(spouse);
            html += '</div>';

            const gen = genMap.get(memberId);
            const genLabel = gen < GEN_LABELS.length ? GEN_LABELS[gen] : `Đời ${gen+1}`;
            const icon = gen === 0 ? 'fa-home' : (gen === 1 ? 'fa-users' : 'fa-children');
            html += `<div class="generation-label"><i class="fas ${icon}"></i> ${genLabel}</div>`;

            if (validChildren.length > 0) {
                html += '<ul>';
                validChildren.forEach(child => {
                    html += buildNode(child.id, processed);
                });
                html += '</ul>';
            }

            html += '</div></li>';
            return html;
        }

        const roots = all.filter(m => !m.chaMeIds || !m.chaMeIds.split(',').filter(Boolean).length);
        const processed = new Set();

        roots.forEach(root => {
            html += buildNode(root.id, processed);
        });

        const displayedIds = new Set();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('[data-id]').forEach(el => {
            displayedIds.add(el.dataset.id);
        });

        const missing = all.filter(m => !displayedIds.has(m.id));
        if (missing.length > 0) {
            html += `<li style="list-style:none;margin-top:20px;border:2px dashed #c0392b;padding:15px;border-radius:10px;background:#fff5f5;">
                <div style="color:#c0392b;font-weight:bold;text-align:center;margin-bottom:10px;">
                    ⚠️ Thành viên chưa được liên kết vào cây chính:
                </div>
                <ul style="display:flex;flex-wrap:wrap;justify-content:center;gap:15px;padding:10px 0;">
            `;
            missing.forEach(m => {
                const spouse = getSpouse(m.id);
                html += `<li style="list-style:none;padding:0;margin:0;">
                    <div class="family-group">
                        <div class="couple" style="flex-direction:column;gap:10px;">
                            ${renderCard(m)}
                            ${spouse ? renderCard(spouse) : ''}
                        </div>
                        <div style="font-size:0.7em;color:#999;margin-top:5px;">⚠️ Chưa liên kết cha/mẹ</div>
                    </div>
                </li>`;
                if (spouse) processed.add(spouse.id);
            });
            html += '</ul></li>';
        }

        html += '</ul>';

        $('tree').innerHTML = html;

        qsa('.member-name').forEach(el => {
            el.addEventListener('click', e => {
                e.stopPropagation();
                const id = el.dataset.id;
                if (id) openEdit(id);
            });
        });

        renderMemorials();
        
        // Cập nhật trạng thái lưu
        updateSaveStatus();
    }

    // ===== CẬP NHẬT TRẠNG THÁI LƯU =====
    function updateSaveStatus() {
        const statusEl = document.getElementById('saveStatus');
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#4CAF50;"></i> Đã lưu';
            statusEl.style.opacity = '0.6';
        }
    }

    // ===== RENDER MEMORIALS =====
    function renderMemorials() {
        const map = new Map(data.thanhVien.map(m => [m.id, m]));

        let mHtml = '<h2><i class="fas fa-calendar-alt"></i> Ngày giỗ trong họ</h2>';
        
        if (data.ngayGio?.length) {
            const sorted = [...data.ngayGio].sort((a, b) => {
                const aDate = a.ngayGioAmLich.split('/').reverse().join('');
                const bDate = b.ngayGioAmLich.split('/').reverse().join('');
                return aDate.localeCompare(bDate);
            });
            
            sorted.forEach(mem => {
                const member = map.get(mem.idThanhVien);
                if (!member) return;
                
                const age = getAge(member);
                
                mHtml += `
                    <div class="memorial-item">
                        <div class="memorial-header">
                            <i class="fas fa-candle"></i>
                            <strong>${mem.tenThanhVien}</strong>
                            <span class="memorial-role">(${member.vaiTro || 'Thành viên'})</span>
                        </div>
                        <div class="memorial-details">
                            <div class="memorial-info">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Năm sinh: <strong>${member.namSinh}</strong></span>
                            </div>
                            <div class="memorial-info">
                                <i class="fas fa-skull"></i>
                                <span>Năm mất: <strong>${mem.namMat || member.namMat || 'N/A'}</strong></span>
                            </div>
                            <div class="memorial-info">
                                <i class="fas fa-birthday-cake"></i>
                                <span>Hưởng thọ: <strong>${age} tuổi</strong> (Âm lịch)</span>
                            </div>
                            <div class="memorial-info">
                                <i class="fas fa-moon"></i>
                                <span>Ngày giỗ: <strong>${mem.ngayGioAmLich}</strong> (Âm lịch)</span>
                            </div>
                            ${member.queQuan ? `
                            <div class="memorial-info">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Quê quán: <strong>${member.queQuan}</strong></span>
                            </div>` : ''}
                        </div>
                    </div>
                `;
            });
        } else {
            mHtml += '<p style="color:#888;"><i class="fas fa-info-circle"></i> Chưa có thông tin ngày giỗ.</p>';
        }
        
        $('memorials').innerHTML = mHtml;
    }

    // ===== KIỂM TRA VÀ TỰ ĐỘNG THÊM NGÀY GIỖ =====
    function autoAddMemorialIfNeeded(memberId) {
        const member = data.thanhVien.find(m => m.id === memberId);
        if (!member) return false;
        
        if (member.namMat) {
            const existing = data.ngayGio.find(m => m.idThanhVien === memberId);
            if (!existing) {
                data.ngayGio.push({
                    id: genMemorialId(),
                    idThanhVien: member.id,
                    tenThanhVien: member.ten,
                    ngayGioAmLich: `01/01/${member.namMat}`,
                    namMat: member.namMat
                });
                return true;
            } else {
                existing.namMat = member.namMat;
                existing.tenThanhVien = member.ten;
                return true;
            }
        }
        return false;
    }

    // ===== CRUD =====
    function openEdit(id) {
        const m = data.thanhVien.find(x => x.id === id);
        if (!m) return;
        $('editId').value = m.id;
        $('editTen').value = m.ten;
        $('editNamSinh').value = m.namSinh;
        $('editNamMat').value = m.namMat || '';
        $('editGioiTinh').value = m.gioiTinh || 'Nam';
        $('editQueQuan').value = m.queQuan || '';
        $('editVaiTro').value = m.vaiTro || '';
        $('editVoChongIds').value = m.voChongIds || '';
        $('editChaMeIds').value = m.chaMeIds || '';
        $('editIsSelf').checked = m.isSelf || false;
        $('editModal').style.display = 'block';
    }

    function saveEdit() {
        const id = $('editId').value;
        const idx = data.thanhVien.findIndex(x => x.id === id);
        if (idx === -1) return;

        const namMat = $('editNamMat').value;
        const isSelf = $('editIsSelf').checked;
        
        data.thanhVien[idx] = {
            ...data.thanhVien[idx],
            ten: $('editTen').value,
            namSinh: parseInt($('editNamSinh').value),
            namMat: namMat ? parseInt(namMat) : null,
            gioiTinh: $('editGioiTinh').value,
            queQuan: $('editQueQuan').value,
            vaiTro: $('editVaiTro').value,
            voChongIds: $('editVoChongIds').value,
            chaMeIds: $('editChaMeIds').value,
            isSelf
        };
        if (isSelf) data.thanhVien.forEach((m, i) => { if (i !== idx) m.isSelf = false; });

        if (data.thanhVien[idx].namMat) {
            const added = autoAddMemorialIfNeeded(id);
            if (added) {
                toast('🕯️ Đã tự động thêm ngày giỗ!');
            }
        } else {
            data.ngayGio = data.ngayGio.filter(m => m.idThanhVien !== id);
        }

        closeModal('editModal');
        buildTree();
        autoSaveData();
        toast('Đã cập nhật dữ liệu!');
    }

    function deleteMember() {
        if (!confirm('Xóa thành viên này?')) return;
        const id = $('editId').value;
        data.thanhVien = data.thanhVien.filter(m => m.id !== id);
        data.ngayGio = data.ngayGio.filter(m => m.idThanhVien !== id);
        data.thanhVien.forEach(m => {
            m.voChongIds = m.voChongIds?.split(',').filter(i => i !== id).join(',') || '';
            m.chaMeIds = m.chaMeIds?.split(',').filter(i => i !== id).join(',') || '';
        });
        closeModal('editModal');
        buildTree();
        autoSaveData();
        toast('Đã xóa thành viên!');
    }

    function openAdd() {
        $('addTen').value = '';
        $('addNamSinh').value = '';
        $('addNamMat').value = '';
        $('addGioiTinh').value = 'Nam';
        $('addQueQuan').value = '';
        $('addVaiTro').value = 'Con trai';
        $('addVoChongIds').value = '';
        $('addChaMeIds').value = '';
        $('addIsSelf').checked = false;
        updateAutoGenInfo();
        $('addModal').style.display = 'block';
    }

    function updateAutoGenInfo() {
        const chaMeIds = $('addChaMeIds').value;
        let info = '🔄 Thế hệ sẽ được tự động tính toán';
        if (chaMeIds) {
            const ids = chaMeIds.split(',').filter(Boolean);
            let maxGen = 0;
            ids.forEach(id => {
                const p = data.thanhVien.find(x => x.id === id);
                if (p) maxGen = Math.max(maxGen, getGen(p, data.thanhVien) + 1);
            });
            const label = maxGen < GEN_LABELS.length ? GEN_LABELS[maxGen] : `Đời ${maxGen+1}`;
            info = `📌 Sẽ được xếp vào <strong>${label}</strong>`;
        }
        $('autoGenInfo').innerHTML = info;
    }

    function saveAdd() {
        const chaMeIds = $('addChaMeIds').value;
        const namMat = $('addNamMat').value;
        const isSelf = $('addIsSelf').checked;

        const newMember = {
            id: genId(),
            ten: $('addTen').value,
            namSinh: parseInt($('addNamSinh').value),
            namMat: namMat ? parseInt(namMat) : null,
            gioiTinh: $('addGioiTinh').value,
            queQuan: $('addQueQuan').value,
            vaiTro: $('addVaiTro').value,
            chaMeIds: chaMeIds,
            voChongIds: $('addVoChongIds').value,
            isSelf: isSelf
        };

        if (isSelf) data.thanhVien.forEach(m => m.isSelf = false);
        data.thanhVien.push(newMember);

        if (newMember.namMat) {
            data.ngayGio.push({
                id: genMemorialId(),
                idThanhVien: newMember.id,
                tenThanhVien: newMember.ten,
                ngayGioAmLich: `01/01/${newMember.namMat}`,
                namMat: newMember.namMat
            });
            toast('🕯️ Đã tự động thêm ngày giỗ!');
        }

        closeModal('addModal');
        buildTree();
        autoSaveData();
        toast('Đã thêm thành viên!');
    }

    // ===== AUTO ADD =====
    function autoAdd() {
        const all = data.thanhVien;
        const maxGen = Math.max(...all.map(m => getGen(m, all)));
        const candidates = all.filter(m => getGen(m, all) === maxGen);
        if (!candidates.length) { toast('Không tìm thấy người để thêm con!', 'error'); return; }

        const parent = candidates[Math.floor(Math.random() * candidates.length)];
        const gen = getGen(parent, all) + 1;
        const genLabel = gen < GEN_LABELS.length ? GEN_LABELS[gen] : `Đời ${gen+1}`;

        const names = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E', 'Vũ Thị F'];
        const name = names[Math.floor(Math.random() * names.length)];
        const gender = Math.random() > 0.5 ? 'Nam' : 'Nữ';
        const role = gender === 'Nam' ? 'Con trai' : 'Con gái';

        const newMember = {
            id: genId(),
            ten: name,
            namSinh: 2000 + Math.floor(Math.random() * 20),
            namMat: Math.random() > 0.6 ? 2020 + Math.floor(Math.random() * 6) : null,
            gioiTinh: gender,
            queQuan: parent.queQuan || 'Ninh Bình',
            vaiTro: role,
            chaMeIds: parent.id,
            voChongIds: '',
            isSelf: false
        };

        data.thanhVien.push(newMember);

        if (newMember.namMat) {
            data.ngayGio.push({
                id: genMemorialId(),
                idThanhVien: newMember.id,
                tenThanhVien: newMember.ten,
                ngayGioAmLich: `01/01/${newMember.namMat}`,
                namMat: newMember.namMat
            });
            toast('🕯️ Đã tự động thêm ngày giỗ!');
        }

        buildTree();
        autoSaveData();
        toast(`✅ Đã thêm <strong>${name}</strong> (${gender}) vào ${genLabel} (con của ${parent.ten})`);
    }

    // ===== MODAL =====
    function closeModal(id) { $(id).style.display = 'none'; }

    // ===== ZOOM =====
    let zoom = 1;
    const MIN_ZOOM = .3, MAX_ZOOM = 2.5, STEP = .1;
    const wrapper = $('treeWrapper'), container = $('zoomContainer');

    function updateZoom() {
        wrapper.style.transform = `scale(${zoom})`;
        $('zoomValue').textContent = Math.round(zoom * 100) + '%';
    }

    // ===== EXPORT / IMPORT =====
    function exportData() {
        try {
            // Tạo nội dung file data.js
            const dataStr = JSON.stringify(data, null, 4);
            const fileContent = `// data.js - Dữ liệu gia phả họ Đinh\nconst familyData = ${dataStr};`;
            
            const blob = new Blob([fileContent], { type: 'application/javascript;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data.js';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast('Đã xuất file data.js!');
        } catch (error) {
            toast('Lỗi xuất file!', 'error');
            console.error(error);
        }
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                // Đọc nội dung file và trích xuất dữ liệu
                const content = e.target.result;
                // Tìm object JSON trong file
                const match = content.match(/const\s+familyData\s*=\s*({[\s\S]*?});/);
                if (match) {
                    const dataObj = eval('(' + match[1] + ')');
                    if (dataObj.thanhVien && dataObj.ngayGio) {
                        data = dataObj;
                        buildTree();
                        autoSaveData();
                        toast('Đã nhập và lưu dữ liệu!');
                        return;
                    }
                }
                // Nếu không tìm thấy định dạng data.js, thử parse JSON trực tiếp
                try {
                    const jsonData = JSON.parse(content);
                    if (jsonData.thanhVien && jsonData.ngayGio) {
                        data = jsonData;
                        buildTree();
                        autoSaveData();
                        toast('Đã nhập và lưu dữ liệu!');
                        return;
                    }
                } catch (e2) {}
                toast('File không đúng định dạng!', 'error');
            } catch (error) {
                toast('Lỗi đọc file!', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    // ===== INIT =====
    function init() {
        const restored = restoreDataFromLocalStorage();
        
        buildTree();

        if (restored) {
            toast('🔄 Đã khôi phục dữ liệu từ bộ nhớ!');
        }

        container.addEventListener('wheel', e => {
            if (e.ctrlKey) {
                e.preventDefault();
                zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + (e.deltaY < 0 ? STEP : -STEP)));
                updateZoom();
            }
        }, { passive: false });

        $('zoomInBtn').onclick = () => { zoom = Math.min(MAX_ZOOM, zoom + STEP); updateZoom(); };
        $('zoomOutBtn').onclick = () => { zoom = Math.max(MIN_ZOOM, zoom - STEP); updateZoom(); };
        $('resetZoomBtn').onclick = () => { zoom = 1; updateZoom(); container.scrollLeft = container.scrollTop = 0; };

        $('addMemberBtn').onclick = openAdd;
        $('autoAddBtn').onclick = autoAdd;
        $('saveAdd').onclick = saveAdd;
        $('cancelAdd').onclick = () => closeModal('addModal');
        document.querySelector('#addModal .close-add').onclick = () => closeModal('addModal');

        $('saveEdit').onclick = saveEdit;
        $('cancelEdit').onclick = () => closeModal('editModal');
        $('deleteMember').onclick = deleteMember;
        document.querySelector('#editModal .close').onclick = () => closeModal('editModal');

        $('addChaMeIds').addEventListener('input', updateAutoGenInfo);

        $('exportDataBtn').onclick = exportData;
        $('importDataBtn').onclick = () => $('importFile').click();
        $('importFile').onchange = e => {
            if (e.target.files.length) importData(e.target.files[0]);
            e.target.value = '';
        };

        window.onclick = e => {
            if (e.target === $('editModal')) closeModal('editModal');
            if (e.target === $('addModal')) closeModal('addModal');
        };

        // Lưu dữ liệu khi đóng trang
        window.addEventListener('beforeunload', function() {
            saveDataToLocalStorage();
        });
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();