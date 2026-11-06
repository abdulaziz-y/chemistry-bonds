// ============================================================
// مختبر الروابط الكيميائية — app.js (النسخة المدمجة النهائية)
// يجمع: الأنشطة السبعة + الجدول الدوري + مختبر الذرة + الاختبار
// ============================================================

// ==================== الحالة العامة ====================
let currentActivity = null;
let completedActivities = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false };
let totalPoints = 0;
let audioCtx = null;
let energyLevel = 0;
let electronegativityDiff = 0;
let equationCoefficients = { H2: 1, O2: 1, H2O: 1 };
let atomState = { protons: 1, electrons: 1 };
let toastTimer = null;

const DRAG_CONFIG = { dropTolerance: 1.9, snapDuration: 300, returnDuration: 350 };

// ==================== بيانات الأنشطة ====================
const activityData = {
    1: {
        title: 'إلكترونات التكافؤ',
        desc: 'اسحب الإلكترون المتوهج إلى المنطقة الخضراء لتحديده.',
        tip: 'إلكترون التكافؤ هو الإلكترون الموجود في الطبقة الأخيرة من الذرة، وهو المسؤول عن تكوين الروابط.',
        successMsg: 'لقد حددت إلكترون التكافؤ!',
        successDetail: 'تحتوي ذرة الصوديوم (Na) على إلكترون واحد في طبقتها الخارجية، وهذا الإلكترون هو المسؤول عن تكوين الروابط.'
    },
    2: {
        title: 'الرابطة الأيونية',
        desc: 'اسحب الإلكترون من ذرة الصوديوم إلى المنطقة الخضراء عند ذرة الكلور.',
        tip: 'في الرابطة الأيونية، ينتقل إلكترون من ذرة إلى أخرى، فيتكون أيون موجب وأيون سالب.',
        successMsg: 'تم تكوين الرابطة الأيونية بنجاح!',
        successDetail: 'انتقل الإلكترون من الصوديوم (Na) إلى الكلور (Cl). أصبح الصوديوم أيوناً موجباً (Na⁺) والكلور أيوناً سالباً (Cl⁻).'
    },
    3: {
        title: 'الرابطة التساهمية',
        desc: 'اسحب إلكتروناً من كل ذرة هيدروجين إلى المنطقة الخضراء في المنتصف.',
        tip: 'في الرابطة التساهمية، تشترك الذرات في الإلكترونات لتكوين رابطة بينها.',
        successMsg: 'تم تكوين الرابطة التساهمية بنجاح!',
        successDetail: 'شاركت ذرتا الهيدروجين (H) بإلكتروناتهما في المنطقة المشتركة، كما في جزيء H₂.'
    },
    4: {
        title: 'الرابطة الفلزية',
        desc: 'زد مستوى الطاقة لترى كيف تتحرر الإلكترونات وتتحرك بحرية بين أيونات الفلز.',
        tip: 'في الرابطة الفلزية، تُفقد إلكترونات التكافؤ وتصبح حرة الحركة في "بحر إلكتروني".',
        successMsg: 'أحسنت! لقد أنشأت "بحر الإلكترونات"!',
        successDetail: 'الرابطة الفلزية هي تجاذب بين أيونات الفلز الموجبة والإلكترونات الحرة. هذه الإلكترونات الحرة هي سبب توصيل الفلزات للكهرباء والحرارة.'
    },
    5: {
        title: 'الرابطة القطبية',
        desc: 'حرّك شريط فرق الكهروسالبية لترى كيف تنجذب الإلكترونات نحو الذرة الأكثر كهروسالبية.',
        tip: 'في الرابطة التساهمية القطبية، تكون المشاركة في الإلكترونات غير متساوية.',
        successMsg: 'ممتاز! لقد فهمت الرابطة القطبية!',
        successDetail: 'في جزيء HCl، الكلور أكثر كهروسالبية من الهيدروجين، فيجذب الإلكترونات نحوها. يخلق ذلك شحنة جزئية سالبة (δ⁻) على الكلور وموجبة (δ⁺) على الهيدروجين.'
    },
    6: {
        title: 'موازنة المعادلات',
        desc: 'اضبط المعاملات حتى يتساوى عدد ذرات كل عنصر في طرفي المعادلة.',
        tip: 'قانون حفظ المادة: لا تفنى الذرات ولا تُستحدث، لذا يجب أن يتساوى عددها في المتفاعلات والنواتج.',
        successMsg: 'رائع! لقد وازنت المعادلة!',
        successDetail: 'المعادلة الموزونة هي: 2H₂ + O₂ → 2H₂O. هذا يعني أن جزيئي هيدروجين يتفاعلان مع جزيء أكسجين واحد لإنتاج جزيئي ماء.'
    }
};

// ==================== الإشعارات ====================
function showToast(title, text) {
    clearTimeout(toastTimer);
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastText').textContent = text || '';
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ==================== نظام النقاط ====================
function addPoints(pts) {
    totalPoints += pts;
    const val = document.getElementById('pointsValue');
    if (val) val.textContent = totalPoints;
    const pill = document.getElementById('pointsPill');
    if (pill) {
        pill.style.transform = 'scale(1.2)';
        setTimeout(() => pill.style.transform = 'scale(1)', 200);
    }
}

// ==================== الصوت ====================
function initAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
}

function playSound(freq, dur, type) {
    try {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
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

// ==================== مكوّن السحب ====================
AFRAME.registerComponent('drag-move', {
    init: function () {
        this.isDragging = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.intersection = new THREE.Vector3();
        this.plane = new THREE.Plane();
        this.offset = new THREE.Vector3();
        this.startPos = new THREE.Vector3();
        this.targetDropzone = null;

        const self = this;
        this.el.sceneEl.addEventListener('renderstart', () => {
            const hit = document.createElement('a-sphere');
            hit.setAttribute('radius', '0.8');
            hit.setAttribute('material', 'transparent: true; opacity: 0');
            self.el.appendChild(hit);

            document.addEventListener('pointerdown', (e) => self.onDown(e), { capture: true });
            document.addEventListener('pointermove', (e) => self.onMove(e));
            document.addEventListener('pointerup', () => self.onUp());
        });
    },

    onDown: function (evt) {
        if (this.isDragging || window.__drag) return;
        const overlay = document.getElementById('sceneOverlay');
        if (!overlay || !overlay.classList.contains('active')) return;
        if (evt.target && evt.target.closest && evt.target.closest('.ctrl-panel, .scene-instructions, .panel-header')) return;

        const canvas = this.el.sceneEl.canvas;
        const camera = this.el.sceneEl.querySelector('[camera]');
        if (!canvas || !camera) return;

        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, camera.components.camera.camera);
        const hits = this.raycaster.intersectObject(this.el.object3D, true);

        if (hits.length > 0) {
            evt.preventDefault();
            evt.stopPropagation();
            this.isDragging = true;
            window.__drag = this;

            const rig = document.getElementById('camera-rig');
            if (rig && rig.components['look-controls']) rig.components['look-controls'].enabled = false;

            const activity = this.el.dataset.activity;
            this.targetDropzone = document.getElementById(`dropzone-${activity}`);

            const dir = new THREE.Vector3();
            camera.object3D.getWorldDirection(dir);
            const pos = new THREE.Vector3();
            this.el.object3D.getWorldPosition(pos);
            this.startPos.copy(this.el.object3D.position);
            this.plane.setFromNormalAndCoplanarPoint(dir.clone().negate(), pos);
            this.raycaster.ray.intersectPlane(this.plane, this.intersection);
            this.offset.copy(pos).sub(this.intersection);

            this.el.setAttribute('material', 'emissiveIntensity', '2.8');
            this.el.setAttribute('scale', '1.2 1.2 1.2');
            const hint = document.getElementById('drag-hint');
            if (hint) hint.classList.remove('hidden');
            canvas.style.cursor = 'grabbing';
            playSound(440, 0.05);
        }
    },

    onMove: function (evt) {
        if (!this.isDragging) return;
        evt.preventDefault();
        const canvas = this.el.sceneEl.canvas;
        const camera = this.el.sceneEl.querySelector('[camera]');
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, camera.components.camera.camera);
        this.raycaster.ray.intersectPlane(this.plane, this.intersection);
        const newWorld = this.intersection.clone().add(this.offset);
        const local = this.el.object3D.parent.worldToLocal(newWorld.clone());
        this.el.object3D.position.copy(local);

        if (this.targetDropzone) {
            const ep = new THREE.Vector3(), dp = new THREE.Vector3();
            this.el.object3D.getWorldPosition(ep);
            this.targetDropzone.object3D.getWorldPosition(dp);
            const dist = ep.distanceTo(dp);
            if (dist < 2.5) {
                const intensity = (1.5 + (2.5 - dist) * 0.9).toFixed(2);
                const scale = (1 + (2.5 - dist) * 0.18).toFixed(2);
                this.targetDropzone.setAttribute('material', 'emissiveIntensity', intensity);
                this.targetDropzone.setAttribute('scale', `${scale} 1 ${scale}`);
            }
        }
    },

    onUp: function () {
        if (!this.isDragging) return;
        this.isDragging = false;
        window.__drag = null;

        const rig = document.getElementById('camera-rig');
        if (rig && rig.components['look-controls']) rig.components['look-controls'].enabled = true;

        this.el.setAttribute('material', 'emissiveIntensity', '1.6');
        this.el.setAttribute('scale', '1 1 1');

        if (this.targetDropzone) {
            this.targetDropzone.setAttribute('material', 'emissiveIntensity', '0.9');
            this.targetDropzone.setAttribute('scale', '1 1 1');
        }

        const hint = document.getElementById('drag-hint');
        if (hint) hint.classList.add('hidden');
        if (this.el.sceneEl.canvas) this.el.sceneEl.canvas.style.cursor = 'default';

        checkDrop(this.el, this.startPos, this.targetDropzone);
    }
});

// ==================== فتح/إغلاق المشهد ====================
function openScene(n) {
    if (n < 1 || n > 6) return;
    currentActivity = n;

    // إظهار النشاط المطلوب وإخفاء الباقي
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`activity-${i}`);
        if (el) el.setAttribute('visible', i === n ? 'true' : 'false');
    }

    // إخفاء كل اللوحات السفلية أولاً
    ['ctrl-4', 'ctrl-5', 'ctrl-6'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // تهيئة النشاط المحدد
    if (n === 4) {
        const c = document.getElementById('ctrl-4');
        if (c) c.classList.remove('hidden');
        initMetalBond();
        updateFreeElectrons();
    } else if (n === 5) {
        const c = document.getElementById('ctrl-5');
        if (c) c.classList.remove('hidden');
        initPolarBond();
    } else if (n === 6) {
        const c = document.getElementById('ctrl-6');
        if (c) c.classList.remove('hidden');
        bindEquationControls();
        resetEquation();
    }

    updateInstructions(n);
    const title = document.getElementById('sceneTitle');
    if (title) title.textContent = `النشاط ${n}: ${activityData[n].title}`;
    updateSceneProgress();

    // فتح الـ Overlay
    const overlay = document.getElementById('sceneOverlay');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');

    // ✅ الأهم: إعادة ضبط حجم A-Frame بعد ظهور البطاقة
    resizeSceneMultipleTimes();

    playSound(600, 0.08);
}

// دالة مساعدة: تعيد ضبط حجم A-Frame عدة مرات لضمان الاستقرار
function resizeSceneMultipleTimes() {
    const scene = document.getElementById('ar-scene');
    if (!scene) return;

    const doResize = () => {
        if (scene.resize) {
            try { scene.resize(); } catch (e) {}
        }
        // بديل احتياطي: إعادة ضبط الـ canvas يدوياً
        const canvas = scene.canvas;
        const container = scene.parentElement;
        if (canvas && container) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                canvas.style.width = w + 'px';
                canvas.style.height = h + 'px';
            }
        }
    };

    // نستدعيها 4 مرات: فوراً، وبعد 100ms، 300ms، 500ms
    // لأن البطاقة تتحرك (animation) ويحتاج A-Frame لوقت لاكتشاف الحجم النهائي
    doResize();
    setTimeout(doResize, 100);
    setTimeout(doResize, 300);
    setTimeout(doResize, 500);
}
function closeScene() {
    const overlay = document.getElementById('sceneOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
    }
    currentActivity = null;
}

function updateInstructions(n) {
    const data = activityData[n];
    if (!data) return;
    const t = document.getElementById('instrTitle');
    const d = document.getElementById('instrDesc');
    const tip = document.getElementById('instrTip');
    if (t) t.textContent = data.title;
    if (d) d.textContent = data.desc;
    if (tip) tip.textContent = data.tip;
}

function updateSceneProgress() {
    const el = document.getElementById('sceneProgress');
    if (!el) return;
    const total = Object.values(completedActivities).filter(Boolean).length;
    el.textContent = `${total} / 7 مكتمل`;
}

function resetScene() {
    if (!currentActivity) return;

    const activityEl = document.getElementById(`activity-${currentActivity}`);
    if (activityEl) {
        activityEl.querySelectorAll('[data-electron]').forEach(el => {
            if (!el.components['drag-move']) el.setAttribute('drag-move', '');
            el.removeAttribute('data-placed');
            el.setAttribute('position', el.dataset.initialPos);
            el.setAttribute('scale', '1 1 1');
            el.setAttribute('material', 'emissiveIntensity', '1.6');
        });

        [1, 2, 3].forEach(n => {
            const dz = document.getElementById(`dropzone-${n}`);
            if (dz) {
                dz.setAttribute('material', 'emissiveIntensity', '0.9');
                dz.setAttribute('scale', '1 1 1');
            }
        });
    }

    if (currentActivity === 2) {
        const na = document.getElementById('na-label');
        const cl = document.getElementById('cl-label');
        if (na) na.setAttribute('value', 'Na');
        if (cl) cl.setAttribute('value', 'Cl');
    }

    if (currentActivity === 4) { energyLevel = 0; updateFreeElectrons(); }
    if (currentActivity === 5) {
        electronegativityDiff = 0;
        const s = document.getElementById('en-slider');
        if (s) s.value = 0;
        updatePolarBond(0);
    }
    if (currentActivity === 6) resetEquation();

    completedActivities[currentActivity] = false;
    const card = document.querySelector(`.activity-card[data-activity="${currentActivity}"]`);
    if (card) card.classList.remove('completed');
    updateProgress();
    updateSceneProgress();
    playSound(500, 0.1);
}

function scrollToActivities() {
    const section = document.querySelector('.activities-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== منطق الإفلات ====================
function checkDrop(electronEl, startPos, dropzone) {
    if (!dropzone) {
        const activity = parseInt(electronEl.dataset.activity);
        dropzone = document.getElementById(`dropzone-${activity}`);
    }
    if (!dropzone) return;

    const ep = new THREE.Vector3();
    const dp = new THREE.Vector3();
    electronEl.object3D.getWorldPosition(ep);
    dropzone.object3D.getWorldPosition(dp);

    if (ep.distanceTo(dp) < DRAG_CONFIG.dropTolerance) {
        handleDrop(electronEl, dropzone, parseInt(electronEl.dataset.activity));
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

function handleDrop(electronEl, dropzone, activity) {
    if (!electronEl || electronEl.hasAttribute('data-placed')) return;

    if (activity === 1 || activity === 2) {
        placeElectron(electronEl, dropzone);
        showSuccess(activity);
        markComplete(activity);
    } else if (activity === 3) {
        const offset = electronEl.dataset.electron === 'h1-e' ? -0.22 : 0.22;
        placeElectron(electronEl, dropzone, offset);
        electronEl.setAttribute('data-placed', 'true');
        const activityEl = document.getElementById('activity-3');
        const placed = activityEl.querySelectorAll('[data-placed="true"]').length;
        if (placed >= 2) {
            showSuccess(activity);
            markComplete(activity);
        } else {
            playSound(600, 0.1);
        }
    }
}

function placeElectron(electronEl, dropzone, offsetX) {
    electronEl.removeAttribute('drag-move');
    electronEl.setAttribute('data-placed', 'true');
    const dp = new THREE.Vector3();
    dropzone.object3D.getWorldPosition(dp);
    const local = electronEl.object3D.parent.worldToLocal(dp.clone());
    if (offsetX) local.x += offsetX;
    local.y += 0.2;
    electronEl.setAttribute('animation__snap', {
        property: 'position',
        to: `${local.x} ${local.y} ${local.z}`,
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

// ==================== نجاح النشاط ====================
function showSuccess(n) {
    playSuccessSound();
    const data = activityData[n];
    if (!data) return;
    const msg = document.getElementById('successMessage');
    const det = document.getElementById('successDetail');
    if (msg) msg.textContent = data.successMsg;
    if (det) det.textContent = data.successDetail;
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
    if (n === 2) {
        const na = document.getElementById('na-label');
        const cl = document.getElementById('cl-label');
        if (na) na.setAttribute('value', 'Na⁺');
        if (cl) cl.setAttribute('value', 'Cl⁻');
    }
}

function continueFromSuccess() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
    if (currentActivity && currentActivity < 6) {
        setTimeout(() => openScene(currentActivity + 1), 300);
    }
}

function closeSuccess() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
    resetScene();
}

function markComplete(n) {
    if (completedActivities[n]) return;
    completedActivities[n] = true;
    const card = document.querySelector(`.activity-card[data-activity="${n}"]`);
    if (card) card.classList.add('completed');
    updateProgress();
    updateSceneProgress();
    addPoints(50);
    showToast('🌟 أحسنت!', 'حصلت على 50 نقطة');
    if (Object.values(completedActivities).filter(Boolean).length === 7) {
        setTimeout(() => showToast('🏆 أكملت جميع الأنشطة!', 'أنت خبير كيميائي!'), 2000);
    }
}

function updateProgress() {
    const total = Object.values(completedActivities).filter(Boolean).length;
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    if (fill) fill.style.width = (total / 7 * 100) + '%';
    if (label) label.textContent = `${total} / 7`;
}

// ==================== النشاط 4: الرابطة الفلزية ====================
function initMetalBond() {
    const grid = document.getElementById('metal-ion-grid');
    if (!grid) return;
    if (grid.dataset.built === 'true') return;

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

    for (let i = 0; i < 10; i++) {
        const e = document.createElement('a-sphere');
        e.classList.add('free-electron');
        e.setAttribute('radius', '0.1');
        e.setAttribute('color', '#00ffff');
        e.setAttribute('material', 'emissive: #00ffff; emissiveIntensity: 2');
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

    grid.dataset.built = 'true';
}

function updateFreeElectrons() {
    const grid = document.getElementById('metal-ion-grid');
    if (!grid) return;

    const electrons = grid.querySelectorAll('.free-electron');
    const count = energyLevel * 2;
    electrons.forEach((e, i) => {
        e.setAttribute('visible', i < count ? 'true' : 'false');
    });

    const val = document.getElementById('energy-value');
    if (val) val.textContent = energyLevel;
    const fill = document.getElementById('energy-fill');
    if (fill) fill.style.width = (energyLevel / 5 * 100) + '%';

    const inc = document.getElementById('btn-inc');
    const dec = document.getElementById('btn-dec');
    if (inc) inc.disabled = energyLevel >= 5;
    if (dec) dec.disabled = energyLevel <= 0;

    if (energyLevel >= 5 && !completedActivities[4]) {
        setTimeout(() => { showSuccess(4); markComplete(4); }, 500);
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

// ==================== النشاط 5: الرابطة القطبية ====================
function initPolarBond() {
    const slider = document.getElementById('en-slider');
    if (slider && slider.dataset.bound !== 'true') {
        slider.addEventListener('input', (e) => {
            electronegativityDiff = parseFloat(e.target.value);
            updatePolarBond(electronegativityDiff);
        });
        slider.dataset.bound = 'true';
    }
    if (slider) slider.value = electronegativityDiff;
    updatePolarBond(electronegativityDiff);
}

function updatePolarBond(value) {
    const cloud = document.getElementById('shared-electron-cloud');
    const hC = document.getElementById('h-charge');
    const clC = document.getElementById('cl-charge');
    const en = document.getElementById('en-value');

    if (cloud) {
        cloud.setAttribute('position', `${value * 0.8} 1.5 -2`);
        cloud.setAttribute('material', `emissive: #00ffff; emissiveIntensity: ${0.6 + value * 0.8}; opacity: ${0.5 + value * 0.3}; transparent: true`);
    }
    if (hC && clC) {
        if (value > 0.3) {
            hC.setAttribute('value', `δ⁺${value.toFixed(1)}`);
            clC.setAttribute('value', `δ⁻${value.toFixed(1)}`);
        } else {
            hC.setAttribute('value', '');
            clC.setAttribute('value', '');
        }
    }
    if (en) {
        if (value === 0) en.textContent = '0.0 (غير قطبي)';
        else if (value < 0.5) en.textContent = value.toFixed(1) + ' (قطبية ضعيفة)';
        else en.textContent = value.toFixed(1) + ' (قطبي)';
    }
    if (value >= 0.9 && !completedActivities[5]) {
        setTimeout(() => { showSuccess(5); markComplete(5); }, 500);
    }
}

// ==================== النشاط 6: موازنة المعادلات ====================
function bindEquationControls() {
    const panel = document.getElementById('ctrl-6');
    if (!panel || panel.dataset.bound === 'true') return;

    panel.addEventListener('click', (e) => {
        const btn = e.target.closest('.eq-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const species = btn.dataset.species;
        const delta = parseInt(btn.dataset.delta, 10);
        if (species && !isNaN(delta)) changeCoefficient(species, delta);
    });

    panel.dataset.bound = 'true';
}

function changeCoefficient(species, delta) {
    const old = equationCoefficients[species];
    equationCoefficients[species] = Math.max(1, Math.min(6, old + delta));
    if (equationCoefficients[species] === old) return;

    const el = document.getElementById(`coeff-${species}`);
    if (el) {
        el.textContent = equationCoefficients[species];
        el.classList.add('bump');
        setTimeout(() => el.classList.remove('bump'), 200);
    }
    checkEquationBalance();
    playSound(delta > 0 ? 720 : 520, 0.06);
}

function checkEquationBalance() {
    const lH = equationCoefficients.H2 * 2;
    const lO = equationCoefficients.O2 * 2;
    const rH = equationCoefficients.H2O * 2;
    const rO = equationCoefficients.H2O * 1;

    const counter = document.getElementById('eq-counter');
    if (counter) {
        counter.innerHTML = `
            <div>H: <strong class="${lH === rH ? 'matched' : 'unmatched'}">${lH}</strong> = <strong class="${lH === rH ? 'matched' : 'unmatched'}">${rH}</strong></div>
            <div>O: <strong class="${lO === rO ? 'matched' : 'unmatched'}">${lO}</strong> = <strong class="${lO === rO ? 'matched' : 'unmatched'}">${rO}</strong></div>
        `;
    }

    const balanced = lH === rH && lO === rO;
    const status = document.getElementById('eq-status');
    if (status) {
        if (balanced) {
            status.textContent = '✓ المعادلة موزونة! أحسنت';
            status.classList.add('balanced');
        } else {
            status.textContent = '✗ غير موزونة — استمر في المحاولة';
            status.classList.remove('balanced');
        }
    }

    if (balanced && !completedActivities[6]) {
        setTimeout(() => { showSuccess(6); markComplete(6); }, 500);
    }
}

function resetEquation() {
    equationCoefficients = { H2: 1, O2: 1, H2O: 1 };
    ['H2', 'O2', 'H2O'].forEach(s => {
        const el = document.getElementById(`coeff-${s}`);
        if (el) { el.textContent = '1'; el.classList.remove('bump'); }
    });
    checkEquationBalance();
}

// ==================== النشاط 7: الجدول الدوري ====================
const periodicElements = [
    { z: 1, sym: 'H', ar: 'هيدروجين', en: 'Hydrogen', mass: 1.008, cat: 'nonmetal', g: 1, p: 1, cfg: '1s¹', uses: 'الماء، وقود الهيدروجين، الخلايا', curr: 'النشاط 3، 5، 6', starred: true },
    { z: 2, sym: 'He', ar: 'هيليوم', en: 'Helium', mass: 4.003, cat: 'noble', g: 18, p: 1, cfg: '1s²', uses: 'البالونات، التبريد', curr: '—', starred: false },
    { z: 3, sym: 'Li', ar: 'ليثيوم', en: 'Lithium', mass: 6.94, cat: 'alkali', g: 1, p: 2, cfg: '1s² 2s¹', uses: 'بطاريات الهواتف', curr: '—', starred: false },
    { z: 4, sym: 'Be', ar: 'بيريليوم', en: 'Beryllium', mass: 9.012, cat: 'alkaline', g: 2, p: 2, cfg: '1s² 2s²', uses: 'سبائك الطائرات', curr: '—', starred: false },
    { z: 5, sym: 'B', ar: 'بورون', en: 'Boron', mass: 10.81, cat: 'metalloid', g: 13, p: 2, cfg: '1s² 2s² 2p¹', uses: 'الزجاج المقاوم', curr: '—', starred: false },
    { z: 6, sym: 'C', ar: 'كربون', en: 'Carbon', mass: 12.011, cat: 'nonmetal', g: 14, p: 2, cfg: '1s² 2s² 2p²', uses: 'الفحم، الألماس', curr: '—', starred: false },
    { z: 7, sym: 'N', ar: 'نيتروجين', en: 'Nitrogen', mass: 14.007, cat: 'nonmetal', g: 15, p: 2, cfg: '1s² 2s² 2p³', uses: 'الهواء، الأسمدة', curr: '—', starred: false },
    { z: 8, sym: 'O', ar: 'أكسجين', en: 'Oxygen', mass: 15.999, cat: 'nonmetal', g: 16, p: 2, cfg: '1s² 2s² 2p⁴', uses: 'التنفس، الماء', curr: 'النشاط 6 (O₂، H₂O)', starred: true },
    { z: 9, sym: 'F', ar: 'فلور', en: 'Fluorine', mass: 18.998, cat: 'halogen', g: 17, p: 2, cfg: '1s² 2s² 2p⁵', uses: 'معجون الأسنان', curr: '—', starred: false },
    { z: 10, sym: 'Ne', ar: 'نيون', en: 'Neon', mass: 20.180, cat: 'noble', g: 18, p: 2, cfg: '1s² 2s² 2p⁶', uses: 'لافتات الإعلانات', curr: '—', starred: false },
    { z: 11, sym: 'Na', ar: 'صوديوم', en: 'Sodium', mass: 22.990, cat: 'alkali', g: 1, p: 3, cfg: '1s² 2s² 2p⁶ 3s¹', uses: 'ملح الطعام', curr: 'النشاط 1، 2 (NaCl)', starred: true },
    { z: 12, sym: 'Mg', ar: 'مغنيسيوم', en: 'Magnesium', mass: 24.305, cat: 'alkaline', g: 2, p: 3, cfg: '1s² 2s² 2p⁶ 3s²', uses: 'الألعاب النارية', curr: '—', starred: false },
    { z: 13, sym: 'Al', ar: 'ألومنيوم', en: 'Aluminium', mass: 26.982, cat: 'post', g: 13, p: 3, cfg: '1s² 2s² 2p⁶ 3s² 3p¹', uses: 'علب المشروبات', curr: '—', starred: false },
    { z: 14, sym: 'Si', ar: 'سيليكون', en: 'Silicon', mass: 28.085, cat: 'metalloid', g: 14, p: 3, cfg: '1s² 2s² 2p⁶ 3s² 3p²', uses: 'الرقائق الإلكترونية', curr: '—', starred: false },
    { z: 15, sym: 'P', ar: 'فوسفور', en: 'Phosphorus', mass: 30.974, cat: 'nonmetal', g: 15, p: 3, cfg: '1s² 2s² 2p⁶ 3s² 3p³', uses: 'أعواد الثقاب', curr: '—', starred: false },
    { z: 16, sym: 'S', ar: 'كبريت', en: 'Sulfur', mass: 32.06, cat: 'nonmetal', g: 16, p: 3, cfg: '1s² 2s² 2p⁶ 3s² 3p⁴', uses: 'حمض الكبريتيك', curr: '—', starred: false },
    { z: 17, sym: 'Cl', ar: 'كلور', en: 'Chlorine', mass: 35.45, cat: 'halogen', g: 17, p: 3, cfg: '1s² 2s² 2p⁶ 3s² 3p⁵', uses: 'تعقيم المياه', curr: 'النشاط 2 (NaCl)', starred: true },
    { z: 18, sym: 'Ar', ar: 'أرجون', en: 'Argon', mass: 39.948, cat: 'noble', g: 18, p: 3, cfg: '1s² 2s² 2p⁶ 3s² 3p⁶', uses: 'المصابيح', curr: '—', starred: false },
    { z: 19, sym: 'K', ar: 'بوتاسيوم', en: 'Potassium', mass: 39.098, cat: 'alkali', g: 1, p: 4, cfg: '[Ar] 4s¹', uses: 'الأسمدة', curr: '—', starred: false },
    { z: 20, sym: 'Ca', ar: 'كالسيوم', en: 'Calcium', mass: 40.078, cat: 'alkaline', g: 2, p: 4, cfg: '[Ar] 4s²', uses: 'العظام', curr: '—', starred: false },
    { z: 21, sym: 'Sc', ar: 'سكانديوم', en: 'Scandium', mass: 44.956, cat: 'transition', g: 3, p: 4, cfg: '[Ar] 3d¹ 4s²', uses: 'سبائك الطائرات', curr: '—', starred: false },
    { z: 22, sym: 'Ti', ar: 'تيتانيوم', en: 'Titanium', mass: 47.867, cat: 'transition', g: 4, p: 4, cfg: '[Ar] 3d² 4s²', uses: 'المفاصل الصناعية', curr: '—', starred: false },
    { z: 23, sym: 'V', ar: 'فاناديوم', en: 'Vanadium', mass: 50.942, cat: 'transition', g: 5, p: 4, cfg: '[Ar] 3d³ 4s²', uses: 'سبائك الفولاذ', curr: '—', starred: false },
    { z: 24, sym: 'Cr', ar: 'كروم', en: 'Chromium', mass: 51.996, cat: 'transition', g: 6, p: 4, cfg: '[Ar] 3d⁵ 4s¹', uses: 'الطلاء المعدني', curr: '—', starred: false },
    { z: 25, sym: 'Mn', ar: 'منجنيز', en: 'Manganese', mass: 54.938, cat: 'transition', g: 7, p: 4, cfg: '[Ar] 3d⁵ 4s²', uses: 'السبائك', curr: '—', starred: false },
    { z: 26, sym: 'Fe', ar: 'حديد', en: 'Iron', mass: 55.845, cat: 'transition', g: 8, p: 4, cfg: '[Ar] 3d⁶ 4s²', uses: 'البناء، الدم', curr: 'النشاط 4 (فلزية)', starred: true },
    { z: 27, sym: 'Co', ar: 'كوبالت', en: 'Cobalt', mass: 58.933, cat: 'transition', g: 9, p: 4, cfg: '[Ar] 3d⁷ 4s²', uses: 'البطاريات', curr: '—', starred: false },
    { z: 28, sym: 'Ni', ar: 'نيكل', en: 'Nickel', mass: 58.693, cat: 'transition', g: 10, p: 4, cfg: '[Ar] 3d⁸ 4s²', uses: 'العملات المعدنية', curr: '—', starred: false },
    { z: 29, sym: 'Cu', ar: 'نحاس', en: 'Copper', mass: 63.546, cat: 'transition', g: 11, p: 4, cfg: '[Ar] 3d¹⁰ 4s¹', uses: 'الأسلاك الكهربائية', curr: '—', starred: false },
    { z: 30, sym: 'Zn', ar: 'زنك', en: 'Zinc', mass: 65.38, cat: 'transition', g: 12, p: 4, cfg: '[Ar] 3d¹⁰ 4s²', uses: 'البطاريات', curr: '—', starred: false },
    { z: 31, sym: 'Ga', ar: 'غاليوم', en: 'Gallium', mass: 69.723, cat: 'post', g: 13, p: 4, cfg: '[Ar] 3d¹⁰ 4s² 4p¹', uses: 'LED', curr: '—', starred: false },
    { z: 32, sym: 'Ge', ar: 'جرمانيوم', en: 'Germanium', mass: 72.630, cat: 'metalloid', g: 14, p: 4, cfg: '[Ar] 3d¹⁰ 4s² 4p²', uses: 'الألياف البصرية', curr: '—', starred: false },
    { z: 33, sym: 'As', ar: 'زرنيخ', en: 'Arsenic', mass: 74.922, cat: 'metalloid', g: 15, p: 4, cfg: '[Ar] 3d¹⁰ 4s² 4p³', uses: 'أشباه الموصلات', curr: '—', starred: false },
    { z: 34, sym: 'Se', ar: 'سيلينيوم', en: 'Selenium', mass: 78.971, cat: 'nonmetal', g: 16, p: 4, cfg: '[Ar] 3d¹⁰ 4s² 4p⁴', uses: 'الزجاج', curr: '—', starred: false },
    { z: 35, sym: 'Br', ar: 'بروم', en: 'Bromine', mass: 79.904, cat: 'halogen', g: 17, p: 4, cfg: '[Ar] 3d¹⁰ 4s² 4p⁵', uses: 'الأدوية', curr: '—', starred: false },
    { z: 36, sym: 'Kr', ar: 'كريبتون', en: 'Krypton', mass: 83.798, cat: 'noble', g: 18, p: 4, cfg: '[Ar] 3d¹⁰ 4s² 4p⁶', uses: 'مصابيح الفلاش', curr: '—', starred: false },
    { z: 37, sym: 'Rb', ar: 'روبيديوم', en: 'Rubidium', mass: 85.468, cat: 'alkali', g: 1, p: 5, cfg: '[Kr] 5s¹', uses: 'الساعات الذرية', curr: '—', starred: false },
    { z: 38, sym: 'Sr', ar: 'سترونشيوم', en: 'Strontium', mass: 87.62, cat: 'alkaline', g: 2, p: 5, cfg: '[Kr] 5s²', uses: 'الألعاب النارية', curr: '—', starred: false },
    { z: 47, sym: 'Ag', ar: 'فضة', en: 'Silver', mass: 107.868, cat: 'transition', g: 11, p: 5, cfg: '[Kr] 4d¹⁰ 5s¹', uses: 'المجوهرات', curr: '—', starred: false },
    { z: 50, sym: 'Sn', ar: 'قصدير', en: 'Tin', mass: 118.710, cat: 'post', g: 14, p: 5, cfg: '[Kr] 4d¹⁰ 5s² 5p²', uses: 'العلب المعدنية', curr: '—', starred: false },
    { z: 53, sym: 'I', ar: 'يود', en: 'Iodine', mass: 126.904, cat: 'halogen', g: 17, p: 5, cfg: '[Kr] 4d¹⁰ 5s² 5p⁵', uses: 'المطهرات', curr: '—', starred: false },
    { z: 54, sym: 'Xe', ar: 'زينون', en: 'Xenon', mass: 131.293, cat: 'noble', g: 18, p: 5, cfg: '[Kr] 4d¹⁰ 5s² 5p⁶', uses: 'مصابيح السيارات', curr: '—', starred: false },
    { z: 55, sym: 'Cs', ar: 'سيزيوم', en: 'Caesium', mass: 132.905, cat: 'alkali', g: 1, p: 6, cfg: '[Xe] 6s¹', uses: 'الساعات الذرية', curr: '—', starred: false },
    { z: 56, sym: 'Ba', ar: 'باريوم', en: 'Barium', mass: 137.327, cat: 'alkaline', g: 2, p: 6, cfg: '[Xe] 6s²', uses: 'التصوير بالأشعة', curr: '—', starred: false },
    { z: 79, sym: 'Au', ar: 'ذهب', en: 'Gold', mass: 196.967, cat: 'transition', g: 11, p: 6, cfg: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', uses: 'المجوهرات', curr: '—', starred: false },
    { z: 80, sym: 'Hg', ar: 'زئبق', en: 'Mercury', mass: 200.592, cat: 'transition', g: 12, p: 6, cfg: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', uses: 'الترمومترات', curr: '—', starred: false },
    { z: 82, sym: 'Pb', ar: 'رصاص', en: 'Lead', mass: 207.2, cat: 'post', g: 14, p: 6, cfg: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', uses: 'بطاريات السيارات', curr: '—', starred: false }
];

const categoryColors = {
    alkali: 'linear-gradient(135deg, #ff6b6b, #ff8a8a)',
    alkaline: 'linear-gradient(135deg, #ffa94d, #ffb968)',
    transition: 'linear-gradient(135deg, #ffd43b, #ffe066)',
    post: 'linear-gradient(135deg, #a9e34b, #c0eb75)',
    metalloid: 'linear-gradient(135deg, #63e6be, #96f2d7)',
    nonmetal: 'linear-gradient(135deg, #4dabf7, #74c0fc)',
    halogen: 'linear-gradient(135deg, #9775fa, #b197fc)',
    noble: 'linear-gradient(135deg, #f783ac, #faa2c1)'
};

function openPeriodicTable() {
    const html = `
        <div class="periodic-controls">
            <input type="text" class="element-search" id="elementSearch" placeholder="🔍 ابحث بالاسم أو الرمز أو العدد الذري...">
        </div>
        <div class="periodic-legend" style="margin-bottom:12px;">
            <span class="legend-item">🔴 قلوية</span>
            <span class="legend-item">🟠 ترابية</span>
            <span class="legend-item">🟡 انتقالية</span>
            <span class="legend-item">🟢 أخرى</span>
            <span class="legend-item">🩵 أشباه فلزات</span>
            <span class="legend-item">🔵 لافلزات</span>
            <span class="legend-item">🟣 هالوجينات</span>
            <span class="legend-item">🌸 نبيلة</span>
        </div>
        <div class="periodic-table-wrapper">
            <div class="periodic-table" id="periodicTable"></div>
        </div>
        <p style="text-align:center;color:var(--muted);font-size:0.78rem;margin-top:8px;">⭐ العناصر المميزة درستها في الأنشطة السابقة</p>
    `;
    openPanel('الجدول الدوري التفاعلي', 'fa-table-cells', html);
    buildPeriodicTable();

    const search = document.getElementById('elementSearch');
    if (search) search.addEventListener('input', handleElementSearch);
}

function buildPeriodicTable() {
    const table = document.getElementById('periodicTable');
    if (!table) return;
    table.innerHTML = '';
    periodicElements.forEach(el => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'element-cell';
        if (el.starred) cell.classList.add('starred');
        cell.dataset.cat = el.cat;
        cell.dataset.z = el.z;
        cell.dataset.symbol = el.sym.toLowerCase();
        cell.dataset.name = el.ar;
        cell.style.gridColumn = el.g;
        cell.style.gridRow = el.p;
        cell.innerHTML = `
            <span class="el-number">${el.z}</span>
            <span class="el-symbol">${el.sym}</span>
            <span class="el-name">${el.ar}</span>
        `;
        cell.onclick = () => showElementDetails(el);
        table.appendChild(cell);
    });
}

function handleElementSearch(e) {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.element-cell').forEach(cell => {
        if (!q) { cell.classList.remove('dimmed'); return; }
        const match = cell.dataset.symbol.includes(q) ||
                      cell.dataset.name.includes(q) ||
                      cell.dataset.z === q ||
                      cell.dataset.z.startsWith(q);
        cell.classList.toggle('dimmed', !match);
    });
}

function showElementDetails(el) {
    const html = `
        <button class="btn-secondary" onclick="openPeriodicTable()" style="margin-bottom:16px;">
            <i class="fa-solid fa-arrow-right"></i> العودة للجدول
        </button>
        <div class="element-details">
            <div class="element-hero" style="background:${categoryColors[el.cat]};color:${['transition','post','metalloid'].includes(el.cat) ? '#1a1a1a' : '#fff'};">${el.sym}</div>
            <h2 class="element-name-ar">${el.ar}</h2>
            <p class="element-name-en">${el.en}</p>
            <div class="bohr-model" id="bohrModel"></div>
            <div class="info-grid">
                <div class="info-item"><label>العدد الذري</label><span>${el.z}</span></div>
                <div class="info-item"><label>الكتلة الذرية</label><span>${el.mass} u</span></div>
                <div class="info-item"><label>التوزيع الإلكتروني</label><span style="font-size:0.78rem">${el.cfg}</span></div>
                <div class="info-item"><label>المجموعة</label><span>${el.g}</span></div>
            </div>
            <div class="info-section">
                <h5>💡 استخدامات في الحياة</h5>
                <p>${el.uses}</p>
            </div>
            <div class="info-section curriculum">
                <h5>🎓 في المنهج الدراسي</h5>
                <p>${el.curr}</p>
            </div>
        </div>
    `;
    openPanel(`${el.ar} (${el.sym})`, 'fa-atom', html);
    renderBohrModel(el.z);
}

function renderBohrModel(z) {
    const c = document.getElementById('bohrModel');
    if (!c) return;
    c.innerHTML = '';

    const maxPer = [2, 8, 8, 18];
    const shells = [];
    let rem = z;
    for (let i = 0; i < maxPer.length && rem > 0; i++) {
        const take = Math.min(maxPer[i], rem);
        shells.push(take);
        rem -= take;
    }
    if (rem > 0) shells.push(rem);

    const nucleus = document.createElement('div');
    nucleus.className = 'bohr-nucleus';
    c.appendChild(nucleus);

    const colors = ['#ff6b6b', '#ffd43b', '#4dabf7', '#9775fa'];
    shells.forEach((count, idx) => {
        const r = 28 + idx * 20;
        const shell = document.createElement('div');
        shell.className = 'bohr-shell';
        shell.style.width = `${r * 2}px`;
        shell.style.height = `${r * 2}px`;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 360;
            const e = document.createElement('div');
            e.className = 'bohr-electron';
            e.style.background = colors[idx % colors.length];
            e.style.boxShadow = `0 0 6px ${colors[idx % colors.length]}`;
            const rad = (angle - 90) * Math.PI / 180;
            e.style.left = `calc(50% + ${Math.cos(rad) * r}px - 3.5px)`;
            e.style.top = `calc(50% + ${Math.sin(rad) * r}px - 3.5px)`;
            shell.appendChild(e);
        }
        c.appendChild(shell);
    });
}

// ==================== مختبر الذرة ====================

// ==================== مختبر الذرة (نسخة مُصلحة) ====================
function openAtomLab() {
    const html = buildAtomLabHtml();
    openPanel('مختبر الذرة', 'fa-flask', html);
}

// دالة بناء HTML (تُستخدم في الفتح والتحديث)
function buildAtomLabHtml() {
    const element = getElement(atomState.protons);
    const charge = atomState.protons - atomState.electrons;
    const stability = Math.max(8, Math.min(100, 100 - Math.abs(charge) * 25 - Math.max(0, atomState.electrons - 8) * 4));
    const chargeText = charge === 0 
        ? 'الذرة متعادلة كهربائياً ✓' 
        : `الشحنة الحالية: ${charge > 0 ? '+' : ''}${charge}`;

    return `
        <p class="section-intro">أضف بروتونات أو إلكترونات ولاحظ كيف تتغير هوية الذرة وشحنتها واستقرارها.</p>
        
        <div class="atom-lab-stage">
            <div class="atom-orbit a"></div>
            <div class="atom-orbit b"></div>
            <span class="atom-e-dot a"></span>
            <span class="atom-e-dot b"></span>
            <div class="atom-nucleus">${atomState.protons}p<br>${atomState.electrons}e</div>
            <div class="atom-element-name">${element.name} · ${element.symbol}</div>
        </div>
        
        <div class="counter-list">
            <div class="counter-row">
                <div class="counter-label">
                    <i class="fa-solid fa-circle-plus" style="color:#cb6a61"></i>
                    <span>البروتونات (موجبة +)</span>
                </div>
                <div class="counter-actions">
                    <button class="round-btn" type="button" onclick="changeAtom('protons', -1)" aria-label="إنقاص بروتون">−</button>
                    <span class="counter-value">${atomState.protons}</span>
                    <button class="round-btn gold" type="button" onclick="changeAtom('protons', 1)" aria-label="زيادة بروتون">+</button>
                </div>
            </div>
            
            <div class="counter-row">
                <div class="counter-label">
                    <i class="fa-solid fa-bolt" style="color:#4dabf7"></i>
                    <span>الإلكترونات (سالبة −)</span>
                </div>
                <div class="counter-actions">
                    <button class="round-btn" type="button" onclick="changeAtom('electrons', -1)" aria-label="إنقاص إلكترون">−</button>
                    <span class="counter-value">${atomState.electrons}</span>
                    <button class="round-btn gold" type="button" onclick="changeAtom('electrons', 1)" aria-label="زيادة إلكترون">+</button>
                </div>
            </div>
        </div>
        
        <div class="stability-box">
            <div class="stability-head">
                <span>مؤشر الاستقرار</span>
                <strong>${stability}%</strong>
            </div>
            <div class="stability-meter"><span style="width:${stability}%"></span></div>
            <div class="stability-note">${chargeText}</div>
        </div>
    `;
}

// تحديث المختبر عند الضغط على +/-
function changeAtom(field, delta) {
    const newValue = atomState[field] + delta;
    if (newValue < 1 || newValue > 10) return; // منع الخروج عن النطاق 1-10
    
    atomState[field] = newValue;
    
    // إعادة بناء محتوى اللوحة مباشرة
    const panelBody = document.getElementById('panelBody');
    if (panelBody) {
        panelBody.innerHTML = buildAtomLabHtml();
    }
    
    showToast('تغيّرت الذرة', `أصبحت ${getElement(atomState.protons).name} (${getElement(atomState.protons).symbol})`);
    playSound(600, 0.06);
}
function getElement(p) {
    const names = [
        { name: 'هيدروجين', symbol: 'H' }, { name: 'هيليوم', symbol: 'He' },
        { name: 'ليثيوم', symbol: 'Li' }, { name: 'بيريليوم', symbol: 'Be' },
        { name: 'بورون', symbol: 'B' }, { name: 'كربون', symbol: 'C' },
        { name: 'نيتروجين', symbol: 'N' }, { name: 'أكسجين', symbol: 'O' },
        { name: 'فلور', symbol: 'F' }, { name: 'نيون', symbol: 'Ne' }
    ];
    return names[Math.min(9, Math.max(0, p - 1))];
}



// ==================== الاختبار ====================
const quizQuestions = [
    {
        q: 'ما الذي يحدث في الرابطة الأيونية؟',
        opts: ['تشارك الذرات الإلكترونات بالتساوي', 'تنتقل إلكترونات من ذرة إلى أخرى', 'تختفي الإلكترونات من الذرتين', 'تتكون رابطة بدون إلكترونات'],
        correct: 1,
        feedback: 'الصوديوم يمنح إلكتروناً والكلور يستقبله، فتتكون أيونات.'
    },
    {
        q: 'في جزيء الهيدروجين H₂، ما نوع الرابطة؟',
        opts: ['أيونية', 'تساهمية غير قطبية', 'فلزية', 'هيدروجينية'],
        correct: 1,
        feedback: 'ذرتا الهيدروجين تتشاركان الإلكترونات بالتساوي، فهي رابطة تساهمية غير قطبية.'
    },
    {
        q: 'أي العناصر التالية تفقد إلكترونها بسهولة؟',
        opts: ['الكلور', 'الصوديوم', 'الأكسجين', 'الفلور'],
        correct: 1,
        feedback: 'الصوديوم فلز قلوي، يفقد إلكترون تكافؤه بسهولة ليصبح أيوناً موجباً.'
    }
];
let currentQuiz = 0;
let quizAnswered = false;

function openQuiz() {
    currentQuiz = Math.floor(Math.random() * quizQuestions.length);
    quizAnswered = false;
    renderQuiz();
}

function renderQuiz() {
    const q = quizQuestions[currentQuiz];
    const html = `
        <p style="font-size:0.78rem;color:var(--gold);font-weight:800;margin:0 0 8px;">السؤال ${currentQuiz + 1}</p>
        <p style="font-size:1.05rem;font-weight:800;color:var(--navy);margin:0 0 16px;line-height:1.7;">${q.q}</p>
        <div class="quiz-options">
            ${q.opts.map((o, i) => `<button class="quiz-option" data-answer="${i}" onclick="answerQuiz(${i})">${o}</button>`).join('')}
        </div>
        <div class="quiz-feedback" id="quizFeedback"></div>
        <button class="btn-primary" onclick="openQuiz()" style="margin-top:16px;width:100%;">
            <i class="fa-solid fa-rotate-right"></i> سؤال آخر
        </button>
    `;
    openPanel('اختبر فهمك', 'fa-clipboard-check', html);
}

function answerQuiz(idx) {
    if (quizAnswered) return;
    quizAnswered = true;
    const q = quizQuestions[currentQuiz];
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach((opt, i) => {
        if (i === q.correct) opt.classList.add('correct');
        else if (i === idx) opt.classList.add('wrong');
    });
    const fb = document.getElementById('quizFeedback');
    if (fb) {
        fb.textContent = (idx === q.correct ? '✓ إجابة صحيحة! ' : '✗ إجابة خاطئة. ') + q.feedback;
        fb.classList.add('show');
    }
    if (idx === q.correct) {
        addPoints(10);
        showToast('إجابة صحيحة!', '+10 نقاط');
        playSuccessSound();
    } else {
        showToast('حاول مرة أخرى', 'راجع المفهوم وأعد المحاولة');
        playErrorSound();
    }
}

// ==================== إدارة اللوحات ====================
function openPanel(title, icon, html) {
    const overlay = document.getElementById('panelOverlay');
    const panelTitle = document.getElementById('panelTitle');
    const panelIcon = document.getElementById('panelIcon');
    const panelBody = document.getElementById('panelBody');
    if (!overlay || !panelBody) return;
    if (panelTitle) panelTitle.textContent = title;
    if (panelIcon) panelIcon.className = `fa-solid ${icon}`;
    panelBody.innerHTML = html;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
}

function closePanel() {
    const overlay = document.getElementById('panelOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
    }
}

// ==================== المساعدة ====================
function showHelp() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closeHelp() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

// ==================== التهيئة ====================
window.addEventListener('load', () => {
    // QR Code
    try {
        if (window.location.href.startsWith('http') && document.getElementById('qrcode')) {
            new QRCode(document.getElementById('qrcode'), {
                text: window.location.href,
                width: 110,
                height: 110,
                colorDark: '#0b1d33',
                colorLight: '#ffffff'
            });
        }
    } catch (e) {}

// ✅ مراقب حجم تلقائي لـ A-Frame
if (window.ResizeObserver) {
    const sceneBody = document.querySelector('.scene-body');
    if (sceneBody) {
        const sceneResizeObserver = new ResizeObserver(() => {
            const scene = document.getElementById('ar-scene');
            if (scene && scene.resize) {
                try { scene.resize(); } catch (e) {}
            }
        });
        sceneResizeObserver.observe(sceneBody);
    }
}
    // إغلاق النوافذ بالنقر الخارجي
document.querySelectorAll('.overlay, .modal').forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target === el) {
            el.classList.remove('active');
            el.setAttribute('aria-hidden', 'true');
            
            // إذا كان المشهد، نوقف الكاميرا
            if (el.id === 'sceneOverlay') {
                currentActivity = null;
                const rig = document.getElementById('camera-rig');
                if (rig && rig.components['look-controls']) {
                    rig.components['look-controls'].enabled = true;
                }
            }
        }
    });
});
    // ESC لإغلاق كل شيء
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.overlay.active, .modal.active').forEach(el => {
                el.classList.remove('active');
                el.setAttribute('aria-hidden', 'true');
            });
        }
    });

    // إعادة ضبط حجم المشهد عند تغيير حجم النافذة
    window.addEventListener('resize', () => {
        const scene = document.getElementById('ar-scene');
        if (scene && scene.resize) scene.resize();
    });

    // اختصارات لوحة المفاتيح للتنقل بين الأنشطة
    document.addEventListener('keydown', (e) => {
        const overlay = document.getElementById('sceneOverlay');
        if (!overlay || !overlay.classList.contains('active')) return;
        if (e.key === 'ArrowLeft' && currentActivity < 6) openScene(currentActivity + 1);
        if (e.key === 'ArrowRight' && currentActivity > 1) openScene(currentActivity - 1);
    });
});