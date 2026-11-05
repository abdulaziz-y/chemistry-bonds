// ============================================================
// مختبر الروابط الكيميائية — app.js
// الإصدار النهائي المُصحَّح (يدعم 6 أنشطة)
// ============================================================

// ============================================================
// 1. الحالة العامة
// ============================================================
let currentActivity = 1;
let completedActivities = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
let audioCtx = null;
let totalPoints = 0;

const DRAG_CONFIG = {
    dropTolerance: 1.9,
    minDragDistance: 0.3,
    snapDuration: 300,
    returnDuration: 350
};

const badges = {
    1: { name: 'خبير التكافؤ', awarded: false },
    2: { name: 'صانع الأيونات', awarded: false },
    3: { name: 'شريك الإلكترونات', awarded: false },
    4: { name: 'سيد الفلزات', awarded: false },
    5: { name: 'كاشف القطبية', awarded: false },
    6: { name: 'موازن المعادلات', awarded: false }
};

// ============================================================
// 2. نظام التحفيز (النقاط والشارات)
// ============================================================
function addPoints(amount) {
    totalPoints += amount;
    const el = document.getElementById('points-value');
    if (el) el.textContent = totalPoints;
    const badge = document.getElementById('points-badge');
    if (badge) {
        badge.style.transform = 'scale(1.2)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
}

function awardBadge(activityNum) {
    if (badges[activityNum] && !badges[activityNum].awarded) {
        badges[activityNum].awarded = true;
        addPoints(50);
        showToast(`🏅 حصلت على شارة: ${badges[activityNum].name}!`);
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// 3. مكوّن السحب (A-Frame Component)
// ============================================================
AFRAME.registerComponent('drag-move', {
    init: function () {
        this.isDragging = false;
        this.hovering = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.intersection = new THREE.Vector3();
        this.plane = new THREE.Plane();
        this.offset = new THREE.Vector3();
        this.startPos = new THREE.Vector3();
        this.cameraEl = null;
        this.targetDropzone = null;
        this.lastHoverCheck = 0;

        const self = this;
        this.el.sceneEl.addEventListener('renderstart', () => {
            self.cameraEl = document.querySelector('[camera]');
            
            // كرة التقاط شفافة أكبر
            const hitArea = document.createElement('a-sphere');
            hitArea.setAttribute('radius', '0.8');
            hitArea.setAttribute('material', 'transparent: true; opacity: 0; depthWrite: false');
            self.el.appendChild(hitArea);
            
            document.addEventListener('pointerdown', (e) => self.onPointerDown(e), { capture: true });
            document.addEventListener('pointermove', (e) => self.onPointerMove(e));
            document.addEventListener('pointerup', (e) => self.onPointerUp(e));
            document.addEventListener('pointercancel', (e) => self.onPointerUp(e));
            
            self.el.sceneEl.canvas.addEventListener('mousemove', (e) => self.onHover(e));
        });
    },

    onPointerDown: function (evt) {
        if (this.isDragging || window.__activeDrag) return;
        
        // تجاهل النقرات على لوحات HTML
        if (evt.target && evt.target.closest && 
            (evt.target.closest('.overlay-panel') || evt.target.closest('.activity-overlay'))) {
            return;
        }
        
        const canvas = this.el.sceneEl.canvas;
        if (!canvas || !this.cameraEl) return;
        
        const rect = canvas.getBoundingClientRect();
        if (evt.clientX < rect.left || evt.clientX > rect.right || 
            evt.clientY < rect.top || evt.clientY > rect.bottom) return;
        
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.cameraEl.components.camera.camera);
        const intersects = this.raycaster.intersectObject(this.el.object3D, true);
        
        if (intersects.length > 0) {
            evt.stopPropagation();
            evt.preventDefault();
            
            this.isDragging = true;
            window.__activeDrag = this;
            this.disableLookControls();
            
            const activity = this.el.dataset.activity;
            this.targetDropzone = document.getElementById(`dropzone-${activity}`);
            
            const cameraDir = new THREE.Vector3();
            this.cameraEl.object3D.getWorldDirection(cameraDir);
            const objPos = new THREE.Vector3();
            this.el.object3D.getWorldPosition(objPos);
            this.startPos.copy(this.el.object3D.position);
            this.plane.setFromNormalAndCoplanarPoint(cameraDir.clone().negate(), objPos);
            
            this.raycaster.ray.intersectPlane(this.plane, this.intersection);
            this.offset.copy(objPos).sub(this.intersection);
            
            this.el.setAttribute('material', 'emissiveIntensity', '2.8');
            this.el.setAttribute('scale', '1.2 1.2 1.2');
            const hint = document.getElementById('drag-hint');
            if (hint) hint.classList.remove('hidden');
            canvas.style.cursor = 'grabbing';
            
            playSound(440, 0.05);
        }
    },

    onPointerMove: function (evt) {
        if (!this.isDragging) return;
        evt.preventDefault();
        
        const canvas = this.el.sceneEl.canvas;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.cameraEl.components.camera.camera);
        this.raycaster.ray.intersectPlane(this.plane, this.intersection);
        
        const newWorldPos = this.intersection.clone().add(this.offset);
        const localPos = this.el.object3D.parent.worldToLocal(newWorldPos.clone());
        this.el.object3D.position.copy(localPos);
        
        this.updateProximityFeedback();
    },

    onPointerUp: function (evt) {
        if (!this.isDragging) return;
        this.isDragging = false;
        window.__activeDrag = null;
        
        this.enableLookControls();
        
        this.el.setAttribute('material', 'emissiveIntensity', '1.6');
        this.el.setAttribute('scale', '1 1 1');
        
        if (this.targetDropzone) {
            this.targetDropzone.setAttribute('material', 'emissiveIntensity', '0.9');
            this.targetDropzone.setAttribute('scale', '1 1 1');
        }
        
        const hint = document.getElementById('drag-hint');
        if (hint) hint.classList.add('hidden');
        this.el.sceneEl.canvas.style.cursor = 'default';
        
        checkDrop(this.el, this.startPos, this.targetDropzone);
    },

    onHover: function (evt) {
        if (this.isDragging || window.__activeDrag) return;
        
        const now = performance.now();
        if (now - this.lastHoverCheck < 50) return;
        this.lastHoverCheck = now;
        
        const canvas = this.el.sceneEl.canvas;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.cameraEl.components.camera.camera);
        const intersects = this.raycaster.intersectObject(this.el.object3D, true);
        
        if (intersects.length > 0 && !this.hovering) {
            this.hovering = true;
            canvas.style.cursor = 'grab';
            this.el.setAttribute('material', 'emissiveIntensity', '2.2');
        } else if (intersects.length === 0 && this.hovering) {
            this.hovering = false;
            canvas.style.cursor = 'default';
            this.el.setAttribute('material', 'emissiveIntensity', '1.6');
        }
    },

    disableLookControls: function () {
        const rig = document.querySelector('#camera-rig');
        if (rig && rig.components['look-controls']) rig.components['look-controls'].enabled = false;
        if (this.cameraEl && this.cameraEl.components['look-controls']) {
            this.cameraEl.components['look-controls'].enabled = false;
        }
    },

    enableLookControls: function () {
        const rig = document.querySelector('#camera-rig');
        if (rig && rig.components['look-controls']) rig.components['look-controls'].enabled = true;
        if (this.cameraEl && this.cameraEl.components['look-controls']) {
            this.cameraEl.components['look-controls'].enabled = true;
        }
    },

    updateProximityFeedback: function () {
        if (!this.targetDropzone) return;
        const ePos = new THREE.Vector3();
        const dPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(ePos);
        this.targetDropzone.object3D.getWorldPosition(dPos);
        const dist = ePos.distanceTo(dPos);
        
        if (dist < 2.8) {
            const intensity = (1.5 + (2.8 - dist) * 0.9).toFixed(2);
            const scale = (1 + (2.8 - dist) * 0.18).toFixed(2);
            this.targetDropzone.setAttribute('material', 'emissiveIntensity', intensity);
            this.targetDropzone.setAttribute('scale', `${scale} 1 ${scale}`);
        } else {
            this.targetDropzone.setAttribute('material', 'emissiveIntensity', '0.9');
            this.targetDropzone.setAttribute('scale', '1 1 1');
        }
    }
});

// ============================================================
// 4. محرك الصوت
// ============================================================
function initAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
}

function playSound(freq, dur, type = 'sine') {
    try {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
}

function playSuccessSound() {
    playSound(523, 0.15);
    setTimeout(() => playSound(659, 0.15), 100);
    setTimeout(() => playSound(784, 0.3), 200);
}

function playErrorSound() { playSound(220, 0.2, 'sawtooth'); }

// ============================================================
// 5. بيانات الأنشطة
// ============================================================
const activityData = {
    1: {
        title: 'إلكترونات التكافؤ',
        desc: 'اسحب الإلكترون المتوهج إلى المنطقة الخضراء.',
        tip: 'إلكترون التكافؤ هو الإلكترون الموجود في الطبقة الأخيرة من الذرة.',
        successMsg: 'لقد حددت إلكترون التكافؤ لذرة الصوديوم!',
        successDetail: 'تحتوي ذرة الصوديوم (Na) على إلكترون واحد في طبقتها الخارجية، وهو المسؤول عن تكوين الروابط.'
    },
    2: {
        title: 'الرابطة الأيونية',
        desc: 'اسحب الإلكترون من ذرة الصوديوم إلى المنطقة الخضراء عند ذرة الكلور.',
        tip: 'في الرابطة الأيونية، ينتقل إلكترون من ذرة إلى أخرى.',
        successMsg: 'تم تكوين الرابطة الأيونية بنجاح!',
        successDetail: 'انتقل الإلكترون من الصوديوم (Na) إلى الكلور (Cl). أصبح الصوديوم أيوناً موجباً (Na⁺) والكلور أيوناً سالباً (Cl⁻).'
    },
    3: {
        title: 'الرابطة التساهمية',
        desc: 'اسحب إلكتروناً من كل ذرة هيدروجين إلى المنطقة الخضراء في المنتصف.',
        tip: 'في الرابطة التساهمية، تشترك الذرات في الإلكترونات.',
        successMsg: 'تم تكوين الرابطة التساهمية بنجاح!',
        successDetail: 'شاركت ذرتا الهيدروجين (H) بإلكتروناتهما في المنطقة المشتركة، لتكوين رابطة تساهمية كما في جزيء H₂.'
    },
    4: {
        title: 'الرابطة الفلزية',
        desc: 'زد مستوى الطاقة لترى كيف تتحرر الإلكترونات وتتحرك بحرية بين أيونات الفلز.',
        tip: 'في الرابطة الفلزية، تُفقد إلكترونات التكافؤ وتصبح حرة الحركة في "بحر إلكتروني" يحيط بأيونات الفلز الموجبة.',
        successMsg: 'أحسنت! لقد أنشأت "بحر الإلكترونات"!',
        successDetail: 'الرابطة الفلزية هي تجاذب بين أيونات الفلز الموجبة والإلكترونات الحرة الحركة. هذه الإلكترونات هي السبب في أن الفلزات موصلة جيدة للكهرباء والحرارة.'
    },
    5: {
        title: 'الرابطة القطبية',
        desc: 'حرّك شريط فرق الكهروسالبية لترى كيف تنجذب الإلكترونات نحو الذرة الأكثر كهروسالبية.',
        tip: 'في الرابطة التساهمية القطبية، تكون المشاركة في الإلكترونات غير متساوية.',
        successMsg: 'ممتاز! لقد فهمت الرابطة القطبية!',
        successDetail: 'في جزيء HCl، ذرة الكلور أكثر كهروسالبية من الهيدروجين، لذا تجذب الإلكترونات نحوها. هذا يخلق شحنة جزئية سالبة (δ⁻) على الكلور وموجبة (δ⁺) على الهيدروجين.'
    },
    6: {
        title: 'موازنة المعادلات',
        desc: 'اضبط المعاملات حتى يتساوى عدد ذرات كل عنصر في طرفي المعادلة.',
        tip: 'قانون حفظ المادة: يجب أن يتساوى عدد الذرات في المتفاعلات والنواتج.',
        successMsg: 'رائع! لقد وازنت المعادلة!',
        successDetail: 'المعادلة الموزونة هي: 2H₂ + O₂ → 2H₂O. جزيئا هيدروجين يتفاعلان مع جزيء أكسجين لإنتاج جزيئي ماء.'
    }
};

// ============================================================
// 6. التنقل بين الأنشطة
// ============================================================
function startLab() {
    initAudio();
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    setTimeout(() => {
        const scene = document.getElementById('ar-scene');
        if (scene) scene.resize();
    }, 100);
}

function backToWelcome() {
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
}

function switchActivity(num) {
    if (num === currentActivity) return;
    
    // إظهار/إخفاء المشاهد
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`activity-${i}`);
        if (el) el.setAttribute('visible', i === num ? 'true' : 'false');
    }
    
    // إخفاء كل اللوحات
    ['activity-4-controls', 'activity-6-controls', 'en-slider-ui'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // تهيئة النشاط الهدف
    if (num === 4) {
        setTimeout(() => {
            initMetalBond();
            updateFreeElectrons();
            const ctrl = document.getElementById('activity-4-controls');
            if (ctrl) ctrl.classList.remove('hidden');
        }, 100);
    } else if (num === 5) {
        setTimeout(() => initPolarBond(), 100);
    } else if (num === 6) {
        setTimeout(() => {
            bindEquationButtons();
            resetEquation();
            const ctrl = document.getElementById('activity-6-controls');
            if (ctrl) ctrl.classList.remove('hidden');
        }, 100);
    }
    
    // تحديث الواجهة
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.activity) === num);
    });
    
    const data = activityData[num];
    if (data) {
        document.getElementById('instr-title').textContent = data.title;
        document.getElementById('instr-desc').textContent = data.desc;
        document.getElementById('instr-tip').textContent = data.tip;
    }
    
    document.getElementById('activity-indicator').textContent = `النشاط ${num} من 6`;
    document.getElementById('prev-btn').disabled = num === 1;
    document.getElementById('next-btn').disabled = num === 6;
    currentActivity = num;
    playSound(600, 0.08);
}

function nextActivity() { if (currentActivity < 6) switchActivity(currentActivity + 1); }
function prevActivity() { if (currentActivity > 1) switchActivity(currentActivity - 1); }

function resetActivity() {
    const activityEl = document.getElementById(`activity-${currentActivity}`);
    if (!activityEl) return;
    
    // إعادة تعيين الإلكترونات القابلة للسحب
    activityEl.querySelectorAll('[data-electron]').forEach(el => {
        if (!el.components['drag-move']) el.setAttribute('drag-move', '');
        el.removeAttribute('data-placed');
        el.setAttribute('position', el.dataset.initialPos);
        el.setAttribute('scale', '1 1 1');
        el.setAttribute('material', 'emissiveIntensity', '1.6');
        el.setAttribute('animation__pulse', 'property: scale; to: 1.35 1.35 1.35; dir: alternate; dur: 900; loop: true');
    });
    
    // إعادة تعيين مناطق الإفلات
    [1, 2, 3].forEach(n => {
        const dz = document.getElementById(`dropzone-${n}`);
        if (dz) {
            dz.setAttribute('material', 'emissiveIntensity', '0.9');
            dz.setAttribute('scale', '1 1 1');
        }
    });
    
    // إعادة تعيين مخصصة لكل نشاط
    if (currentActivity === 2) {
        const naLabel = document.getElementById('na-label');
        const clLabel = document.getElementById('cl-label');
        if (naLabel) naLabel.setAttribute('value', 'Na');
        if (clLabel) clLabel.setAttribute('value', 'Cl');
    }
    
    if (currentActivity === 4) energyLevel = 0;
    if (currentActivity === 5) {
        electronegativityDiff = 0;
        const slider = document.getElementById('en-slider');
        if (slider) slider.value = 0;
    }
    
    // إعادة تعيين حالة الإكمال
    completedActivities[currentActivity] = false;
    document.querySelector(`.tab[data-activity="${currentActivity}"]`).classList.remove('completed');
    updateProgress();
    
    // تحديث الواجهات الخاصة
    if (currentActivity === 4) updateFreeElectrons();
    if (currentActivity === 5) updatePolarBond(0);
    if (currentActivity === 6) resetEquation();
    
    playSound(500, 0.1);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
}

function updateProgress() {
    const total = Object.values(completedActivities).filter(Boolean).length;
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if (fill) fill.style.width = (total / 6 * 100) + '%';
    if (text) text.textContent = `${total} / 6`;
}

// ============================================================
// 7. منطق السحب والإفلات
// ============================================================
function checkDrop(electronEl, startPos, dropzone) {
    if (!dropzone) {
        const activity = parseInt(electronEl.dataset.activity);
        dropzone = document.getElementById(`dropzone-${activity}`);
    }
    if (!dropzone) return;

    const ePos = new THREE.Vector3();
    const dPos = new THREE.Vector3();
    electronEl.object3D.getWorldPosition(ePos);
    dropzone.object3D.getWorldPosition(dPos);

    if (ePos.distanceTo(dPos) < DRAG_CONFIG.dropTolerance) {
        handleSuccess(electronEl, dropzone, parseInt(electronEl.dataset.activity));
    } else {
        electronEl.setAttribute('animation__return', {
            property: 'position',
            to: `${startPos.x} ${startPos.y} ${startPos.z}`,
            dur: DRAG_CONFIG.returnDuration,
            easing: 'easeOutQuad'
        });
        playErrorSound();
        setTimeout(() => {
            electronEl.removeAttribute('animation__return');
            electronEl.setAttribute('position', `${startPos.x} ${startPos.y} ${startPos.z}`);
        }, DRAG_CONFIG.returnDuration + 50);
    }
}

function handleSuccess(electronEl, dropzone, activity) {
    // الأنشطة 4، 5، 6 لا تستخدم السحب
    if (activity >= 4) {
        showSuccess(activity);
        markComplete(activity);
        return;
    }
    
    // حماية من null
    if (!electronEl || electronEl.hasAttribute('data-placed')) return;
    
    if (activity === 1 || activity === 2) {
        placeElectron(electronEl, dropzone);
        showSuccess(activity);
        markComplete(activity);
    } else if (activity === 3) {
        const offset = electronEl.dataset.electron === 'h1-electron' ? -0.22 : 0.22;
        placeElectron(electronEl, dropzone, offset);
        electronEl.setAttribute('data-placed', 'true');
        const activityEl = document.getElementById('activity-3');
        const placedCount = activityEl.querySelectorAll('[data-placed="true"]').length;
        if (placedCount >= 2) {
            showSuccess(activity);
            markComplete(activity);
        } else {
            playSound(600, 0.1);
        }
    }
}

function placeElectron(electronEl, dropzone, offsetX = 0) {
    electronEl.removeAttribute('drag-move');
    electronEl.removeAttribute('animation__pulse');
    electronEl.setAttribute('data-placed', 'true');
    
    const dPos = new THREE.Vector3();
    dropzone.object3D.getWorldPosition(dPos);
    const localPos = electronEl.object3D.parent.worldToLocal(dPos.clone());
    localPos.x += offsetX;
    localPos.y += 0.2;
    
    electronEl.setAttribute('animation__snap', {
        property: 'position',
        to: `${localPos.x} ${localPos.y} ${localPos.z}`,
        dur: DRAG_CONFIG.snapDuration,
        easing: 'easeOutBack'
    });
    
    electronEl.setAttribute('animation__shrink', {
        property: 'scale',
        to: '0.85 0.85 0.85',
        dur: DRAG_CONFIG.snapDuration
    });
    
    playSuccessSound();
}

function showSuccess(activity) {
    playSuccessSound();
    const data = activityData[activity];
    if (!data) return;
    
    document.getElementById('success-message').textContent = data.successMsg;
    document.getElementById('success-detail').textContent = data.successDetail;
    document.getElementById('success-modal').classList.remove('hidden');
    
    if (activity === 2) {
        const naLabel = document.getElementById('na-label');
        const clLabel = document.getElementById('cl-label');
        if (naLabel) naLabel.setAttribute('value', 'Na⁺');
        if (clLabel) clLabel.setAttribute('value', 'Cl⁻');
    }
}

function markComplete(activity) {
    if (completedActivities[activity]) return;
    completedActivities[activity] = true;
    document.querySelector(`.tab[data-activity="${activity}"]`).classList.add('completed');
    updateProgress();
    awardBadge(activity);
    const total = Object.values(completedActivities).filter(Boolean).length;
    if (total === 6) setTimeout(showCompletion, 1500);
}

function closeSuccessAndContinue() {
    document.getElementById('success-modal').classList.add('hidden');
    if (currentActivity < 6) setTimeout(nextActivity, 300);
}

function closeSuccessAndStay() {
    document.getElementById('success-modal').classList.add('hidden');
}

function showCompletion() {
    document.getElementById('completion-modal').classList.remove('hidden');
}

function restartAll() {
    window.location.reload();
}

// ============================================================
// 8. المساعدة
// ============================================================
function showHelp() { document.getElementById('help-modal').classList.remove('hidden'); }
function closeHelp() { document.getElementById('help-modal').classList.add('hidden'); }

// ============================================================
// 9. النشاط 4: الرابطة الفلزية
// ============================================================
let energyLevel = 0;

function initMetalBond() {
    const grid = document.getElementById('metal-ion-grid');
    if (!grid) return;
    
    // إنشاء العناصر مرة واحدة فقط
    if (!grid.querySelector('.metal-ion')) {
        // شبكة 3×3 من الأيونات
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                const ion = document.createElement('a-sphere');
                ion.classList.add('metal-ion');
                ion.setAttribute('position', `${x * 0.9} ${y * 0.9} 0`);
                ion.setAttribute('radius', '0.2');
                ion.setAttribute('color', '#ff4d4d');
                ion.setAttribute('material', 'emissive: #ff4d4d; emissiveIntensity: 0.5; metalness: 0.7; roughness: 0.2');
                grid.appendChild(ion);
            }
        }
        
        // 10 إلكترونات حرة (مخفية في البداية)
        for (let i = 0; i < 10; i++) {
            const e = document.createElement('a-sphere');
            e.classList.add('free-electron');
            e.setAttribute('radius', '0.1');
            e.setAttribute('color', '#00ffff');
            e.setAttribute('material', 'emissive: #00ffff; emissiveIntensity: 2; metalness: 0.4');
            e.setAttribute('visible', 'false');
            
            const sx = (Math.random() - 0.5) * 1.8;
            const sy = (Math.random() - 0.5) * 1.8;
            const sz = (Math.random() - 0.5) * 0.9;
            const ex = (Math.random() - 0.5) * 1.8;
            const ey = (Math.random() - 0.5) * 1.8;
            const ez = (Math.random() - 0.5) * 0.9;
            
            e.setAttribute('position', `${sx} ${sy} ${sz}`);
            e.setAttribute('animation', {
                property: 'position',
                to: `${ex} ${ey} ${ez}`,
                dur: 1200 + Math.random() * 1500,
                dir: 'alternate',
                loop: true,
                easing: 'easeInOutSine'
            });
            
            grid.appendChild(e);
        }
    }
}

function updateFreeElectrons() {
    const grid = document.getElementById('metal-ion-grid');
    if (!grid) return;
    
    const electrons = grid.querySelectorAll('.free-electron');
    const visibleCount = energyLevel * 2;
    
    electrons.forEach((e, i) => {
        e.setAttribute('visible', i < visibleCount ? 'true' : 'false');
    });
    
    // تحديث لوحة HTML
    const valEl = document.getElementById('energy-value');
    if (valEl) valEl.textContent = energyLevel;
    
    const barEl = document.getElementById('energy-bar-fill');
    if (barEl) barEl.style.width = (energyLevel / 5 * 100) + '%';
    
    const btnInc = document.getElementById('btn-increase');
    const btnDec = document.getElementById('btn-decrease');
    if (btnInc) btnInc.disabled = energyLevel >= 5;
    if (btnDec) btnDec.disabled = energyLevel <= 0;
    
    // فحص الإكمال
    if (energyLevel >= 5 && !completedActivities[4]) {
        setTimeout(() => {
            showSuccess(4);
            markComplete(4);
        }, 500);
    }
}

function increaseEnergy() {
    if (energyLevel < 5) {
        energyLevel++;
        updateFreeElectrons();
        playSound(700, 0.1);
    }
}

function decreaseEnergy() {
    if (energyLevel > 0) {
        energyLevel--;
        updateFreeElectrons();
        playSound(500, 0.1);
    }
}

// ============================================================
// 10. النشاط 5: الرابطة القطبية
// ============================================================
let electronegativityDiff = 0;

function initPolarBond() {
    if (!document.getElementById('en-slider-ui')) {
        createElectronegativityUI();
    } else {
        const ui = document.getElementById('en-slider-ui');
        ui.classList.remove('hidden');
    }
    
    const slider = document.getElementById('en-slider');
    if (slider) slider.value = electronegativityDiff;
    
    updatePolarBond(electronegativityDiff);
}

function createElectronegativityUI() {
    const oldUI = document.getElementById('en-slider-ui');
    if (oldUI) oldUI.remove();
    
    const ui = document.createElement('div');
    ui.id = 'en-slider-ui';
    ui.className = 'activity-overlay';
    ui.innerHTML = `
        <div class="overlay-panel">
            <h3 class="overlay-title">🧭 فرق الكهروسالبية</h3>
            <input type="range" id="en-slider" min="0" max="1" step="0.1" value="0"
                   style="width: 100%; accent-color: #00ffff; cursor: pointer; margin: 10px 0;">
            <p id="en-value" style="text-align: center; color: #00ffff; font-weight: 700;">0.0 (غير قطبي)</p>
            <p class="overlay-hint">حرّك الشريط لترى كيف تنجذب الإلكترونات نحو الكلور</p>
        </div>
    `;
    document.getElementById('scene-wrapper').appendChild(ui);
    
    document.getElementById('en-slider').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        electronegativityDiff = val;
        updatePolarBond(val);
    });
}

function updatePolarBond(value) {
    const cloud = document.getElementById('shared-electron-cloud');
    const hCharge = document.getElementById('h-charge');
    const clCharge = document.getElementById('cl-charge');
    const enValue = document.getElementById('en-value');
    
    if (cloud) {
        const xPos = value * 0.8;
        cloud.setAttribute('position', `${xPos} 1.5 -2`);
        cloud.setAttribute('material', `emissive: #00ffff; emissiveIntensity: ${0.6 + value * 0.8}; opacity: ${0.5 + value * 0.3}; transparent: true`);
    }
    
    if (hCharge && clCharge) {
        if (value > 0.3) {
            hCharge.setAttribute('value', `δ⁺${value.toFixed(1)}`);
            clCharge.setAttribute('value', `δ⁻${value.toFixed(1)}`);
            hCharge.setAttribute('color', '#ffaa00');
            clCharge.setAttribute('color', '#ffaa00');
        } else {
            hCharge.setAttribute('value', '');
            clCharge.setAttribute('value', '');
        }
    }
    
    if (enValue) {
        if (value === 0) enValue.textContent = '0.0 (غير قطبي)';
        else if (value < 0.5) enValue.textContent = value.toFixed(1) + ' (قطبية ضعيفة)';
        else enValue.textContent = value.toFixed(1) + ' (قطبي)';
    }
    
    if (value >= 0.9 && !completedActivities[5]) {
        setTimeout(() => {
            showSuccess(5);
            markComplete(5);
        }, 500);
    }
}

// ============================================================
// 11. النشاط 6: موازنة المعادلات
// ============================================================
let coefficients = { H2: 1, O2: 1, H2O: 1 };

function bindEquationButtons() {
    const panel = document.getElementById('activity-6-controls');
    if (!panel || panel.dataset.bound === 'true') return;
    
    // إذا كانت الأزرار تستخدم data-species (HTML جديد)
    const hasDataButtons = panel.querySelector('.coeff-btn[data-species]');
    if (!hasDataButtons) {
        panel.dataset.bound = 'true';
        return;
    }
    
    panel.addEventListener('click', function(e) {
        const btn = e.target.closest('.coeff-btn[data-species]');
        if (!btn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const species = btn.dataset.species;
        const delta = parseInt(btn.dataset.delta, 10);
        if (species && !isNaN(delta)) {
            changeCoefficient(species, delta);
        }
    });
    
    panel.dataset.bound = 'true';
}

function changeCoefficient(species, delta) {
    const oldVal = coefficients[species];
    coefficients[species] = Math.max(1, Math.min(6, oldVal + delta));
    if (coefficients[species] === oldVal) return;
    
    const valEl = document.getElementById(`coeff-${species}`);
    if (valEl) {
        valEl.textContent = coefficients[species];
        valEl.classList.add('bump');
        setTimeout(() => valEl.classList.remove('bump'), 200);
    }
    
    checkEquationBalance();
    playSound(delta > 0 ? 720 : 520, 0.06);
}

function checkEquationBalance() {
    const leftH = coefficients.H2 * 2;
    const leftO = coefficients.O2 * 2;
    const rightH = coefficients.H2O * 2;
    const rightO = coefficients.H2O * 1;
    
    const leftHEl = document.getElementById('left-H');
    const leftOEl = document.getElementById('left-O');
    const rightHEl = document.getElementById('right-H');
    const rightOEl = document.getElementById('right-O');
    
    if (leftHEl) leftHEl.textContent = leftH;
    if (leftOEl) leftOEl.textContent = leftO;
    if (rightHEl) rightHEl.textContent = rightH;
    if (rightOEl) rightOEl.textContent = rightO;
    
    if (leftHEl && rightHEl) {
        leftHEl.classList.toggle('matched', leftH === rightH);
        rightHEl.classList.toggle('matched', leftH === rightH);
        leftHEl.classList.toggle('unmatched', leftH !== rightH);
        rightHEl.classList.toggle('unmatched', leftH !== rightH);
    }
    if (leftOEl && rightOEl) {
        leftOEl.classList.toggle('matched', leftO === rightO);
        rightOEl.classList.toggle('matched', leftO === rightO);
        leftOEl.classList.toggle('unmatched', leftO !== rightO);
        rightOEl.classList.toggle('unmatched', leftO !== rightO);
    }
    
    const isBalanced = (leftH === rightH) && (leftO === rightO);
    const statusEl = document.getElementById('equation-status');
    
    if (statusEl) {
        if (isBalanced) {
            statusEl.textContent = '✓ المعادلة موزونة! أحسنت';
            statusEl.classList.add('balanced');
        } else {
            statusEl.textContent = '✗ غير موزونة — استمر في المحاولة';
            statusEl.classList.remove('balanced');
        }
    }
    
    if (isBalanced && !completedActivities[6]) {
        setTimeout(() => {
            showSuccess(6);
            markComplete(6);
        }, 500);
    }
}

function resetEquation() {
    coefficients = { H2: 1, O2: 1, H2O: 1 };
    ['H2', 'O2', 'H2O'].forEach(s => {
        const el = document.getElementById(`coeff-${s}`);
        if (el) {
            el.textContent = '1';
            el.classList.remove('bump');
        }
    });
    checkEquationBalance();
}

// ============================================================
// 12. التهيئة
// ============================================================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
    }, 800);
    
    try {
        if (window.location.href.startsWith('http')) {
            const qrEl = document.getElementById('qrcode');
            if (qrEl) {
                new QRCode(qrEl, {
                    text: window.location.href,
                    width: 140,
                    height: 140,
                    colorDark: "#0d6b5d",
                    colorLight: "#ffffff"
                });
            }
        }
    } catch (e) {}
    
    window.addEventListener('resize', () => {
        const scene = document.getElementById('ar-scene');
        if (scene) scene.resize();
    });
});

document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'CANVAS') e.preventDefault();
});