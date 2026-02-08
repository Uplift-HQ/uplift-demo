#!/usr/bin/env python3
"""
Translation Sync Script for Uplift Portal
Adds missing translation keys to all 48 language files with proper translations.
"""

import json
import os
from pathlib import Path

# Missing nav keys (payroll related)
MISSING_NAV_KEYS = {
    "payroll": {
        "en": "Payroll", "de": "Lohnabrechnung", "pl": "Lista płac", "zh": "工资单",
        "ar": "كشف الرواتب", "fr": "Paie", "es": "Nómina", "pt": "Folha de pagamento",
        "ja": "給与", "ko": "급여", "hi": "वेतन", "tr": "Bordro"
    },
    "payrollDashboard": {
        "en": "Payroll Dashboard", "de": "Lohnübersicht", "pl": "Panel płac", "zh": "工资仪表板",
        "ar": "لوحة الرواتب", "fr": "Tableau de bord paie", "es": "Panel de nómina", "pt": "Painel de folha",
        "ja": "給与ダッシュボード", "ko": "급여 대시보드", "hi": "वेतन डैशबोर्ड", "tr": "Bordro paneli"
    },
    "payrollRuns": {
        "en": "Payroll Runs", "de": "Gehaltsläufe", "pl": "Przebiegi płacowe", "zh": "工资运行",
        "ar": "دورات الرواتب", "fr": "Cycles de paie", "es": "Ejecuciones de nómina", "pt": "Execuções de folha",
        "ja": "給与処理", "ko": "급여 실행", "hi": "वेतन रन", "tr": "Bordro işlemleri"
    },
    "payrollConfig": {
        "en": "Payroll Config", "de": "Lohnkonfiguration", "pl": "Konfiguracja płac", "zh": "工资配置",
        "ar": "إعدادات الرواتب", "fr": "Config paie", "es": "Config nómina", "pt": "Config folha",
        "ja": "給与設定", "ko": "급여 설정", "hi": "वेतन कॉन्फ़िग", "tr": "Bordro ayarları"
    },
    "teamPayroll": {
        "en": "Team Payroll", "de": "Team-Gehaltsabrechnung", "pl": "Płace zespołu", "zh": "团队工资",
        "ar": "رواتب الفريق", "fr": "Paie équipe", "es": "Nómina del equipo", "pt": "Folha da equipe",
        "ja": "チーム給与", "ko": "팀 급여", "hi": "टीम वेतन", "tr": "Takım bordrosu"
    }
}

# Missing nav.section keys
MISSING_SECTION_KEYS = {
    "myUplift": {
        "en": "MY UPLIFT", "de": "MEIN UPLIFT", "pl": "MOJE UPLIFT", "zh": "我的UPLIFT",
        "ar": "UPLIFT الخاص بي", "fr": "MON UPLIFT", "es": "MI UPLIFT", "pt": "MEU UPLIFT",
        "ja": "マイUPLIFT", "ko": "내 UPLIFT", "hi": "मेरा UPLIFT", "tr": "UPLIFT'IM"
    },
    "myWork": {
        "en": "MY WORK", "de": "MEINE ARBEIT", "pl": "MOJA PRACA", "zh": "我的工作",
        "ar": "عملي", "fr": "MON TRAVAIL", "es": "MI TRABAJO", "pt": "MEU TRABALHO",
        "ja": "マイワーク", "ko": "내 업무", "hi": "मेरा काम", "tr": "İŞİM"
    },
    "myGrowth": {
        "en": "MY GROWTH", "de": "MEINE ENTWICKLUNG", "pl": "MÓJ ROZWÓJ", "zh": "我的成长",
        "ar": "نموي", "fr": "MA CROISSANCE", "es": "MI CRECIMIENTO", "pt": "MEU CRESCIMENTO",
        "ja": "マイグロース", "ko": "내 성장", "hi": "मेरा विकास", "tr": "GELİŞİMİM"
    },
    "myMoney": {
        "en": "MY MONEY", "de": "MEINE VERGÜTUNG", "pl": "MOJE PIENIĄDZE", "zh": "我的薪资",
        "ar": "أموالي", "fr": "MA RÉMUNÉRATION", "es": "MI DINERO", "pt": "MEU DINHEIRO",
        "ja": "マイマネー", "ko": "내 급여", "hi": "मेरा पैसा", "tr": "MAAŞIM"
    },
    "myPeople": {
        "en": "MY PEOPLE", "de": "MEIN TEAM", "pl": "MOJE OSOBY", "zh": "我的团队",
        "ar": "فريقي", "fr": "MON ÉQUIPE", "es": "MI EQUIPO", "pt": "MINHA EQUIPE",
        "ja": "マイピープル", "ko": "내 팀", "hi": "मेरी टीम", "tr": "EKİBİM"
    },
    "payroll": {
        "en": "PAYROLL", "de": "LOHNABRECHNUNG", "pl": "PŁACE", "zh": "工资",
        "ar": "الرواتب", "fr": "PAIE", "es": "NÓMINA", "pt": "FOLHA",
        "ja": "給与", "ko": "급여", "hi": "वेतन", "tr": "BORDRO"
    }
}

# Offline mode keys
OFFLINE_KEYS = {
    "youAreOffline": {
        "en": "You're offline. Some features may be limited.",
        "de": "Sie sind offline. Einige Funktionen sind möglicherweise eingeschränkt.",
        "pl": "Jesteś offline. Niektóre funkcje mogą być ograniczone.",
        "zh": "您处于离线状态。某些功能可能受限。",
        "ar": "أنت غير متصل. قد تكون بعض الميزات محدودة.",
        "fr": "Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.",
        "es": "Estás sin conexión. Algunas funciones pueden estar limitadas.",
        "pt": "Você está offline. Algumas funcionalidades podem estar limitadas.",
        "ja": "オフラインです。一部の機能が制限される場合があります。",
        "ko": "오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.",
        "hi": "आप ऑफ़लाइन हैं। कुछ सुविधाएं सीमित हो सकती हैं।",
        "tr": "Çevrimdışısınız. Bazı özellikler sınırlı olabilir."
    },
    "backOnline": {
        "en": "Back online",
        "de": "Wieder online",
        "pl": "Znów online",
        "zh": "已恢复在线",
        "ar": "عاد الاتصال",
        "fr": "De retour en ligne",
        "es": "De nuevo en línea",
        "pt": "De volta online",
        "ja": "オンラインに戻りました",
        "ko": "다시 온라인",
        "hi": "वापस ऑनलाइन",
        "tr": "Tekrar çevrimiçi"
    }
}

# New performance keys
NEW_PERFORMANCE_KEYS = {
    "subtitle": {
        "en": "Reviews, goals, feedback, and employee development",
        "de": "Beurteilungen, Ziele, Feedback und Mitarbeiterentwicklung",
        "pl": "Oceny, cele, feedback i rozwój pracowników",
        "zh": "评审、目标、反馈和员工发展",
        "ar": "المراجعات والأهداف والتعليقات وتطوير الموظفين",
        "fr": "Évaluations, objectifs, retours et développement des employés",
        "es": "Evaluaciones, objetivos, retroalimentación y desarrollo de empleados",
        "pt": "Avaliações, metas, feedback e desenvolvimento de funcionários",
        "ja": "レビュー、目標、フィードバック、従業員育成",
        "ko": "평가, 목표, 피드백 및 직원 개발",
        "hi": "समीक्षाएं, लक्ष्य, प्रतिक्रिया और कर्मचारी विकास",
        "tr": "Değerlendirmeler, hedefler, geri bildirim ve çalışan gelişimi"
    },
    "noDepartment": {
        "en": "No department", "de": "Keine Abteilung", "pl": "Brak działu", "zh": "无部门",
        "ar": "لا يوجد قسم", "fr": "Pas de département", "es": "Sin departamento", "pt": "Sem departamento",
        "ja": "部署なし", "ko": "부서 없음", "hi": "कोई विभाग नहीं", "tr": "Departman yok"
    },
    "selfBadge": {
        "en": "Self", "de": "Selbst", "pl": "Własna", "zh": "自评",
        "ar": "ذاتي", "fr": "Auto", "es": "Auto", "pt": "Auto",
        "ja": "自己", "ko": "자기", "hi": "स्वयं", "tr": "Kendi"
    },
    "managerBadge": {
        "en": "Manager", "de": "Vorgesetzter", "pl": "Kierownik", "zh": "经理",
        "ar": "المدير", "fr": "Manager", "es": "Gerente", "pt": "Gerente",
        "ja": "マネージャー", "ko": "매니저", "hi": "प्रबंधक", "tr": "Yönetici"
    },
    "peerBadge": {
        "en": "Peer", "de": "Kollege", "pl": "Współpracownik", "zh": "同事",
        "ar": "زميل", "fr": "Pair", "es": "Compañero", "pt": "Colega",
        "ja": "同僚", "ko": "동료", "hi": "सहकर्मी", "tr": "Eş düzey"
    },
    "noReviewsYet": {
        "en": "No performance reviews", "de": "Keine Leistungsbeurteilungen", "pl": "Brak ocen pracowniczych", "zh": "暂无绩效评估",
        "ar": "لا توجد مراجعات أداء", "fr": "Pas d'évaluations de performance", "es": "Sin evaluaciones de desempeño", "pt": "Sem avaliações de desempenho",
        "ja": "パフォーマンスレビューなし", "ko": "성과 평가 없음", "hi": "कोई प्रदर्शन समीक्षा नहीं", "tr": "Performans değerlendirmesi yok"
    },
    "noReviewsDesc": {
        "en": "Create your first review cycle to start evaluating employee performance.",
        "de": "Erstellen Sie Ihren ersten Beurteilungszyklus, um die Mitarbeiterleistung zu bewerten.",
        "pl": "Utwórz pierwszy cykl oceny, aby zacząć oceniać wydajność pracowników.",
        "zh": "创建您的第一个评估周期，开始评估员工绩效。",
        "ar": "أنشئ دورة المراجعة الأولى لبدء تقييم أداء الموظفين.",
        "fr": "Créez votre premier cycle d'évaluation pour commencer à évaluer les performances.",
        "es": "Crea tu primer ciclo de evaluación para empezar a evaluar el desempeño.",
        "pt": "Crie seu primeiro ciclo de avaliação para começar a avaliar o desempenho.",
        "ja": "最初のレビューサイクルを作成して、従業員のパフォーマンス評価を開始しましょう。",
        "ko": "첫 번째 평가 주기를 만들어 직원 성과 평가를 시작하세요.",
        "hi": "कर्मचारी प्रदर्शन का मूल्यांकन शुरू करने के लिए अपना पहला समीक्षा चक्र बनाएं।",
        "tr": "Çalışan performansını değerlendirmeye başlamak için ilk değerlendirme döngünüzü oluşturun."
    },
    "createFirstReview": {
        "en": "Start First Review Cycle", "de": "Ersten Beurteilungszyklus starten", "pl": "Rozpocznij pierwszy cykl oceny", "zh": "开始第一个评估周期",
        "ar": "ابدأ دورة المراجعة الأولى", "fr": "Démarrer le premier cycle", "es": "Iniciar primer ciclo", "pt": "Iniciar primeiro ciclo",
        "ja": "最初のレビューサイクルを開始", "ko": "첫 번째 평가 주기 시작", "hi": "पहला समीक्षा चक्र शुरू करें", "tr": "İlk değerlendirme döngüsünü başlat"
    },
    "upcomingMeetings": {
        "en": "Upcoming 1-on-1s", "de": "Bevorstehende 1:1-Gespräche", "pl": "Nadchodzące spotkania 1:1", "zh": "即将进行的一对一会议",
        "ar": "اجتماعات 1:1 القادمة", "fr": "1-à-1 à venir", "es": "Próximas 1-a-1", "pt": "1-a-1 agendados",
        "ja": "今後の1on1", "ko": "예정된 1:1 미팅", "hi": "आगामी 1-ऑन-1", "tr": "Yaklaşan 1:1'ler"
    },
    "allCycles": {
        "en": "Review Cycles", "de": "Beurteilungszyklen", "pl": "Cykle oceny", "zh": "评估周期",
        "ar": "دورات المراجعة", "fr": "Cycles d'évaluation", "es": "Ciclos de evaluación", "pt": "Ciclos de avaliação",
        "ja": "レビューサイクル", "ko": "평가 주기", "hi": "समीक्षा चक्र", "tr": "Değerlendirme döngüleri"
    },
    "newCycle": {
        "en": "New Cycle", "de": "Neuer Zyklus", "pl": "Nowy cykl", "zh": "新周期",
        "ar": "دورة جديدة", "fr": "Nouveau cycle", "es": "Nuevo ciclo", "pt": "Novo ciclo",
        "ja": "新規サイクル", "ko": "새 주기", "hi": "नया चक्र", "tr": "Yeni döngü"
    },
    "participants": {
        "en": "Participants", "de": "Teilnehmer", "pl": "Uczestnicy", "zh": "参与者",
        "ar": "المشاركون", "fr": "Participants", "es": "Participantes", "pt": "Participantes",
        "ja": "参加者", "ko": "참가자", "hi": "प्रतिभागी", "tr": "Katılımcılar"
    },
    "noParticipants": {
        "en": "No participants added yet", "de": "Noch keine Teilnehmer hinzugefügt", "pl": "Nie dodano jeszcze uczestników", "zh": "尚未添加参与者",
        "ar": "لم تتم إضافة مشاركين بعد", "fr": "Aucun participant ajouté", "es": "No hay participantes", "pt": "Nenhum participante adicionado",
        "ja": "参加者が追加されていません", "ko": "참가자가 추가되지 않았습니다", "hi": "अभी तक कोई प्रतिभागी नहीं जोड़ा गया", "tr": "Henüz katılımcı eklenmedi"
    },
    "statusDraft": {"en": "Draft", "de": "Entwurf", "pl": "Szkic", "zh": "草稿", "ar": "مسودة", "fr": "Brouillon", "es": "Borrador", "pt": "Rascunho", "ja": "下書き", "ko": "초안", "hi": "ड्राफ्ट", "tr": "Taslak"},
    "statusActive": {"en": "Active", "de": "Aktiv", "pl": "Aktywny", "zh": "活动", "ar": "نشط", "fr": "Actif", "es": "Activo", "pt": "Ativo", "ja": "アクティブ", "ko": "활성", "hi": "सक्रिय", "tr": "Aktif"},
    "statusInReview": {"en": "In Review", "de": "In Prüfung", "pl": "W przeglądzie", "zh": "审核中", "ar": "قيد المراجعة", "fr": "En révision", "es": "En revisión", "pt": "Em revisão", "ja": "レビュー中", "ko": "검토 중", "hi": "समीक्षाधीन", "tr": "İncelemede"},
    "statusCalibration": {"en": "Calibration", "de": "Kalibrierung", "pl": "Kalibracja", "zh": "校准", "ar": "معايرة", "fr": "Calibration", "es": "Calibración", "pt": "Calibração", "ja": "キャリブレーション", "ko": "보정", "hi": "कैलिब्रेशन", "tr": "Kalibrasyon"},
    "statusCompleted": {"en": "Completed", "de": "Abgeschlossen", "pl": "Ukończony", "zh": "已完成", "ar": "مكتمل", "fr": "Terminé", "es": "Completado", "pt": "Concluído", "ja": "完了", "ko": "완료", "hi": "पूर्ण", "tr": "Tamamlandı"},
    "typeAnnual": {"en": "Annual", "de": "Jährlich", "pl": "Roczny", "zh": "年度", "ar": "سنوي", "fr": "Annuel", "es": "Anual", "pt": "Anual", "ja": "年次", "ko": "연간", "hi": "वार्षिक", "tr": "Yıllık"},
    "typeQuarterly": {"en": "Quarterly", "de": "Vierteljährlich", "pl": "Kwartalny", "zh": "季度", "ar": "ربع سنوي", "fr": "Trimestriel", "es": "Trimestral", "pt": "Trimestral", "ja": "四半期", "ko": "분기별", "hi": "त्रैमासिक", "tr": "Üç aylık"},
    "typeProbation": {"en": "Probation", "de": "Probezeit", "pl": "Próbny", "zh": "试用期", "ar": "فترة اختبار", "fr": "Période d'essai", "es": "Prueba", "pt": "Período de teste", "ja": "試用期間", "ko": "수습", "hi": "परिवीक्षा", "tr": "Deneme"},
    "createCycleBtn": {"en": "Create Cycle", "de": "Zyklus erstellen", "pl": "Utwórz cykl", "zh": "创建周期", "ar": "إنشاء دورة", "fr": "Créer un cycle", "es": "Crear ciclo", "pt": "Criar ciclo", "ja": "サイクル作成", "ko": "주기 만들기", "hi": "चक्र बनाएं", "tr": "Döngü oluştur"},
    "titleLabel": {"en": "Title", "de": "Titel", "pl": "Tytuł", "zh": "标题", "ar": "العنوان", "fr": "Titre", "es": "Título", "pt": "Título", "ja": "タイトル", "ko": "제목", "hi": "शीर्षक", "tr": "Başlık"},
    "goals": {"en": "Goals", "de": "Ziele", "pl": "Cele", "zh": "目标", "ar": "الأهداف", "fr": "Objectifs", "es": "Objetivos", "pt": "Metas", "ja": "目標", "ko": "목표", "hi": "लक्ष्य", "tr": "Hedefler"},
    "okrs": {"en": "OKRs", "de": "OKRs", "pl": "OKR-y", "zh": "OKR", "ar": "OKRs", "fr": "OKRs", "es": "OKRs", "pt": "OKRs", "ja": "OKR", "ko": "OKR", "hi": "OKRs", "tr": "OKR'ler"},
    "newGoal": {"en": "New Goal", "de": "Neues Ziel", "pl": "Nowy cel", "zh": "新目标", "ar": "هدف جديد", "fr": "Nouvel objectif", "es": "Nuevo objetivo", "pt": "Nova meta", "ja": "新規目標", "ko": "새 목표", "hi": "नया लक्ष्य", "tr": "Yeni hedef"},
    "newOkr": {"en": "New OKR", "de": "Neues OKR", "pl": "Nowy OKR", "zh": "新OKR", "ar": "OKR جديد", "fr": "Nouvel OKR", "es": "Nuevo OKR", "pt": "Novo OKR", "ja": "新規OKR", "ko": "새 OKR", "hi": "नया OKR", "tr": "Yeni OKR"},
    "noGoalsDesc": {"en": "Create your first goal to start tracking progress.", "de": "Erstellen Sie Ihr erstes Ziel, um den Fortschritt zu verfolgen.", "pl": "Utwórz pierwszy cel, aby śledzić postępy.", "zh": "创建第一个目标以开始跟踪进度。", "ar": "أنشئ هدفك الأول لبدء تتبع التقدم.", "fr": "Créez votre premier objectif pour suivre les progrès.", "es": "Crea tu primer objetivo para seguir el progreso.", "pt": "Crie sua primeira meta para acompanhar o progresso.", "ja": "最初の目標を作成して進捗追跡を開始しましょう。", "ko": "진행 상황 추적을 시작하려면 첫 번째 목표를 만드세요.", "hi": "प्रगति ट्रैकिंग शुरू करने के लिए अपना पहला लक्ष्य बनाएं।", "tr": "İlerlemeyi takip etmeye başlamak için ilk hedefinizi oluşturun."},
    "noOkrs": {"en": "No OKRs yet", "de": "Noch keine OKRs", "pl": "Brak OKR-ów", "zh": "暂无OKR", "ar": "لا يوجد OKR بعد", "fr": "Pas encore d'OKRs", "es": "Sin OKRs todavía", "pt": "Nenhum OKR ainda", "ja": "OKRはまだありません", "ko": "아직 OKR 없음", "hi": "अभी तक कोई OKR नहीं", "tr": "Henüz OKR yok"},
    "noOkrsDesc": {"en": "Create your first OKR to align team objectives.", "de": "Erstellen Sie Ihr erstes OKR, um Teamziele auszurichten.", "pl": "Utwórz pierwszy OKR, aby dostosować cele zespołu.", "zh": "创建第一个OKR以协调团队目标。", "ar": "أنشئ أول OKR لمواءمة أهداف الفريق.", "fr": "Créez votre premier OKR pour aligner les objectifs.", "es": "Crea tu primer OKR para alinear los objetivos.", "pt": "Crie seu primeiro OKR para alinhar os objetivos.", "ja": "最初のOKRを作成してチーム目標を整合させましょう。", "ko": "팀 목표를 맞추려면 첫 번째 OKR을 만드세요.", "hi": "टीम उद्देश्यों को संरेखित करने के लिए अपना पहला OKR बनाएं।", "tr": "Ekip hedeflerini hizalamak için ilk OKR'nizi oluşturun."},
    "createOkr": {"en": "Create OKR", "de": "OKR erstellen", "pl": "Utwórz OKR", "zh": "创建OKR", "ar": "إنشاء OKR", "fr": "Créer un OKR", "es": "Crear OKR", "pt": "Criar OKR", "ja": "OKRを作成", "ko": "OKR 만들기", "hi": "OKR बनाएं", "tr": "OKR oluştur"},
    "createGoalTitle": {"en": "Create Goal", "de": "Ziel erstellen", "pl": "Utwórz cel", "zh": "创建目标", "ar": "إنشاء هدف", "fr": "Créer un objectif", "es": "Crear objetivo", "pt": "Criar meta", "ja": "目標を作成", "ko": "목표 만들기", "hi": "लक्ष्य बनाएं", "tr": "Hedef oluştur"},
    "createOkrTitle": {"en": "Create OKR", "de": "OKR erstellen", "pl": "Utwórz OKR", "zh": "创建OKR", "ar": "إنشاء OKR", "fr": "Créer un OKR", "es": "Crear OKR", "pt": "Criar OKR", "ja": "OKRを作成", "ko": "OKR 만들기", "hi": "OKR बनाएं", "tr": "OKR oluştur"},
    "periodPlaceholder": {"en": "Q1 2026", "de": "Q1 2026", "pl": "K1 2026", "zh": "2026年第1季度", "ar": "الربع الأول 2026", "fr": "T1 2026", "es": "T1 2026", "pt": "T1 2026", "ja": "2026年第1四半期", "ko": "2026년 1분기", "hi": "Q1 2026", "tr": "Ç1 2026"},
    "keyResultPlaceholder": {"en": "Key result title", "de": "Titel des Schlüsselergebnisses", "pl": "Tytuł kluczowego wyniku", "zh": "关键结果标题", "ar": "عنوان النتيجة الرئيسية", "fr": "Titre du résultat clé", "es": "Título del resultado clave", "pt": "Título do resultado-chave", "ja": "キーリザルトのタイトル", "ko": "핵심 결과 제목", "hi": "मुख्य परिणाम शीर्षक", "tr": "Anahtar sonuç başlığı"},
    "targetPlaceholder": {"en": "Target", "de": "Zielwert", "pl": "Cel", "zh": "目标值", "ar": "الهدف", "fr": "Cible", "es": "Objetivo", "pt": "Meta", "ja": "ターゲット", "ko": "목표", "hi": "लक्ष्य", "tr": "Hedef"},
    "createBtn": {"en": "Create", "de": "Erstellen", "pl": "Utwórz", "zh": "创建", "ar": "إنشاء", "fr": "Créer", "es": "Crear", "pt": "Criar", "ja": "作成", "ko": "만들기", "hi": "बनाएं", "tr": "Oluştur"},
    "noMeetingsDesc": {"en": "Schedule your first 1-on-1 meeting to start meaningful conversations.", "de": "Planen Sie Ihr erstes 1:1-Gespräch für bedeutungsvolle Gespräche.", "pl": "Zaplanuj pierwsze spotkanie 1:1, aby rozpocząć rozmowy.", "zh": "安排第一次一对一会议，开始有意义的对话。", "ar": "جدول أول اجتماع 1:1 لبدء محادثات هادفة.", "fr": "Planifiez votre premier 1-à-1 pour des conversations significatives.", "es": "Programa tu primera reunión 1-a-1 para conversaciones significativas.", "pt": "Agende seu primeiro 1-a-1 para conversas significativas.", "ja": "最初の1on1ミーティングをスケジュールして有意義な対話を始めましょう。", "ko": "첫 번째 1:1 미팅을 예약하여 의미 있는 대화를 시작하세요.", "hi": "सार्थक बातचीत शुरू करने के लिए अपनी पहली 1-ऑन-1 मीटिंग शेड्यूल करें।", "tr": "Anlamlı konuşmalar başlatmak için ilk 1:1 toplantınızı planlayın."},
    "scheduleMeeting": {"en": "Schedule Meeting", "de": "Termin planen", "pl": "Zaplanuj spotkanie", "zh": "安排会议", "ar": "جدولة اجتماع", "fr": "Planifier réunion", "es": "Programar reunión", "pt": "Agendar reunião", "ja": "ミーティングをスケジュール", "ko": "회의 예약", "hi": "मीटिंग शेड्यूल करें", "tr": "Toplantı planla"},
    "notes": {"en": "Notes", "de": "Notizen", "pl": "Notatki", "zh": "备注", "ar": "ملاحظات", "fr": "Notes", "es": "Notas", "pt": "Notas", "ja": "メモ", "ko": "메모", "hi": "नोट्स", "tr": "Notlar"},
    "addMeetingNotesPlaceholder": {"en": "Add meeting notes...", "de": "Notizen hinzufügen...", "pl": "Dodaj notatki...", "zh": "添加会议备注...", "ar": "أضف ملاحظات...", "fr": "Ajouter des notes...", "es": "Agregar notas...", "pt": "Adicionar notas...", "ja": "メモを追加...", "ko": "메모 추가...", "hi": "नोट्स जोड़ें...", "tr": "Not ekle..."},
    "saving": {"en": "Saving...", "de": "Speichern...", "pl": "Zapisywanie...", "zh": "保存中...", "ar": "جاري الحفظ...", "fr": "Enregistrement...", "es": "Guardando...", "pt": "Salvando...", "ja": "保存中...", "ko": "저장 중...", "hi": "सहेज रहा है...", "tr": "Kaydediliyor..."},
    "saveNotes": {"en": "Save Notes", "de": "Notizen speichern", "pl": "Zapisz notatki", "zh": "保存备注", "ar": "حفظ الملاحظات", "fr": "Enregistrer les notes", "es": "Guardar notas", "pt": "Salvar notas", "ja": "メモを保存", "ko": "메모 저장", "hi": "नोट्स सहेजें", "tr": "Notları kaydet"},
    "oneTime": {"en": "One-time", "de": "Einmalig", "pl": "Jednorazowo", "zh": "一次性", "ar": "مرة واحدة", "fr": "Ponctuel", "es": "Una vez", "pt": "Uma vez", "ja": "1回限り", "ko": "일회성", "hi": "एक बार", "tr": "Tek seferlik"},
    "scheduleBtn": {"en": "Schedule", "de": "Planen", "pl": "Zaplanuj", "zh": "安排", "ar": "جدولة", "fr": "Planifier", "es": "Programar", "pt": "Agendar", "ja": "スケジュール", "ko": "일정 잡기", "hi": "शेड्यूल करें", "tr": "Planla"},
    "giveFeedbackBtn": {"en": "Give Feedback", "de": "Feedback geben", "pl": "Daj feedback", "zh": "给予反馈", "ar": "إعطاء تعليق", "fr": "Donner un retour", "es": "Dar retroalimentación", "pt": "Dar feedback", "ja": "フィードバックする", "ko": "피드백 제공", "hi": "प्रतिक्रिया दें", "tr": "Geri bildirim ver"},
    "receivedFeedback": {"en": "Received", "de": "Erhalten", "pl": "Otrzymane", "zh": "收到的", "ar": "مُستلَم", "fr": "Reçu", "es": "Recibido", "pt": "Recebido", "ja": "受信済み", "ko": "받음", "hi": "प्राप्त", "tr": "Alınan"},
    "publicFeedback": {"en": "Public Feed", "de": "Öffentlicher Feed", "pl": "Publiczny feed", "zh": "公开反馈", "ar": "الخلاصة العامة", "fr": "Flux public", "es": "Feed público", "pt": "Feed público", "ja": "公開フィード", "ko": "공개 피드", "hi": "सार्वजनिक फीड", "tr": "Herkese açık akış"},
    "noFeedbackReceived": {"en": "No feedback received", "de": "Kein Feedback erhalten", "pl": "Brak otrzymanego feedbacku", "zh": "未收到反馈", "ar": "لم يتم تلقي أي تعليقات", "fr": "Aucun retour reçu", "es": "Sin retroalimentación recibida", "pt": "Nenhum feedback recebido", "ja": "フィードバックを受け取っていません", "ko": "받은 피드백 없음", "hi": "कोई प्रतिक्रिया प्राप्त नहीं हुई", "tr": "Alınan geri bildirim yok"},
    "noFeedbackReceivedDesc": {"en": "You haven't received any feedback yet.", "de": "Sie haben noch kein Feedback erhalten.", "pl": "Nie otrzymałeś jeszcze żadnego feedbacku.", "zh": "您还没有收到任何反馈。", "ar": "لم تتلق أي تعليقات بعد.", "fr": "Vous n'avez pas encore reçu de retour.", "es": "Aún no has recibido retroalimentación.", "pt": "Você ainda não recebeu nenhum feedback.", "ja": "まだフィードバックを受け取っていません。", "ko": "아직 받은 피드백이 없습니다.", "hi": "आपको अभी तक कोई प्रतिक्रिया नहीं मिली है।", "tr": "Henüz hiç geri bildirim almadınız."},
    "noPublicFeedback": {"en": "No public feedback", "de": "Kein öffentliches Feedback", "pl": "Brak publicznego feedbacku", "zh": "暂无公开反馈", "ar": "لا يوجد تعليق عام", "fr": "Pas de retour public", "es": "Sin retroalimentación pública", "pt": "Sem feedback público", "ja": "公開フィードバックなし", "ko": "공개 피드백 없음", "hi": "कोई सार्वजनिक प्रतिक्रिया नहीं", "tr": "Herkese açık geri bildirim yok"},
    "noPublicFeedbackDesc": {"en": "Share positive feedback publicly to celebrate your team's achievements.", "de": "Teilen Sie positives Feedback öffentlich, um Erfolge zu feiern.", "pl": "Udostępnij pozytywny feedback, aby świętować osiągnięcia.", "zh": "公开分享积极反馈，庆祝团队成就。", "ar": "شارك التعليقات الإيجابية للاحتفال بإنجازات فريقك.", "fr": "Partagez les retours positifs pour célébrer les réussites.", "es": "Comparte retroalimentación positiva para celebrar los logros.", "pt": "Compartilhe feedback positivo para celebrar as conquistas.", "ja": "チームの成果を祝うために、ポジティブなフィードバックを公開で共有しましょう。", "ko": "팀의 성과를 축하하기 위해 긍정적인 피드백을 공개적으로 공유하세요.", "hi": "अपनी टीम की उपलब्धियों का जश्न मनाने के लिए सकारात्मक प्रतिक्रिया साझा करें।", "tr": "Ekibinizin başarılarını kutlamak için olumlu geri bildirimleri paylaşın."},
    "fromLabel": {"en": "From", "de": "Von", "pl": "Od", "zh": "来自", "ar": "من", "fr": "De", "es": "De", "pt": "De", "ja": "送信者", "ko": "보낸 사람", "hi": "प्रेषक", "tr": "Gönderen"},
    "toLabel": {"en": "To", "de": "An", "pl": "Do", "zh": "到", "ar": "إلى", "fr": "À", "es": "A", "pt": "Para", "ja": "宛先", "ko": "받는 사람", "hi": "प्राप्तकर्ता", "tr": "Alıcı"},
    "privateVisibility": {"en": "Private (only recipient sees)", "de": "Privat (nur Empfänger sieht)", "pl": "Prywatne (widzi tylko odbiorca)", "zh": "私密（仅收件人可见）", "ar": "خاص (المستلم فقط يرى)", "fr": "Privé (seul le destinataire voit)", "es": "Privado (solo el destinatario ve)", "pt": "Privado (só o destinatário vê)", "ja": "プライベート（受信者のみ閲覧可）", "ko": "비공개 (수신자만 볼 수 있음)", "hi": "निजी (केवल प्राप्तकर्ता देख सकता है)", "tr": "Özel (yalnızca alıcı görür)"},
    "publicVisibility": {"en": "Public (visible on feed)", "de": "Öffentlich (im Feed sichtbar)", "pl": "Publiczne (widoczne w feedzie)", "zh": "公开（在动态中可见）", "ar": "عام (مرئي في الخلاصة)", "fr": "Public (visible dans le flux)", "es": "Público (visible en el feed)", "pt": "Público (visível no feed)", "ja": "公開（フィードに表示）", "ko": "공개 (피드에 표시)", "hi": "सार्वजनिक (फीड में दिखाई देता है)", "tr": "Herkese açık (akışta görünür)"},
    "sendFeedback": {"en": "Send Feedback", "de": "Feedback senden", "pl": "Wyślij feedback", "zh": "发送反馈", "ar": "إرسال تعليق", "fr": "Envoyer le retour", "es": "Enviar retroalimentación", "pt": "Enviar feedback", "ja": "フィードバックを送信", "ko": "피드백 보내기", "hi": "प्रतिक्रिया भेजें", "tr": "Geri bildirim gönder"},
    "feedbackType": {"en": "Feedback Type", "de": "Feedback-Typ", "pl": "Typ feedbacku", "zh": "反馈类型", "ar": "نوع التعليق", "fr": "Type de retour", "es": "Tipo de retroalimentación", "pt": "Tipo de feedback", "ja": "フィードバックタイプ", "ko": "피드백 유형", "hi": "प्रतिक्रिया प्रकार", "tr": "Geri bildirim türü"},
    "noPlansDesc": {"en": "Create your first development plan to track career growth.", "de": "Erstellen Sie Ihren ersten Entwicklungsplan für die Karriereentwicklung.", "pl": "Utwórz pierwszy plan rozwoju, aby śledzić rozwój kariery.", "zh": "创建第一个发展计划来跟踪职业成长。", "ar": "أنشئ خطة التطوير الأولى لتتبع النمو الوظيفي.", "fr": "Créez votre premier plan de développement pour suivre la croissance.", "es": "Crea tu primer plan de desarrollo para seguir el crecimiento.", "pt": "Crie seu primeiro plano de desenvolvimento para acompanhar o crescimento.", "ja": "最初の育成計画を作成してキャリア成長を追跡しましょう。", "ko": "경력 성장을 추적하기 위해 첫 번째 개발 계획을 만드세요.", "hi": "करियर विकास को ट्रैक करने के लिए अपनी पहली विकास योजना बनाएं।", "tr": "Kariyer gelişimini takip etmek için ilk gelişim planınızı oluşturun."},
    "createPlanBtn": {"en": "Create Plan", "de": "Plan erstellen", "pl": "Utwórz plan", "zh": "创建计划", "ar": "إنشاء خطة", "fr": "Créer un plan", "es": "Crear plan", "pt": "Criar plano", "ja": "プランを作成", "ko": "계획 만들기", "hi": "योजना बनाएं", "tr": "Plan oluştur"},
    "addFocusArea": {"en": "+ Add Focus Area", "de": "+ Fokusbereich hinzufügen", "pl": "+ Dodaj obszar skupienia", "zh": "+ 添加重点领域", "ar": "+ إضافة منطقة تركيز", "fr": "+ Ajouter un domaine de focus", "es": "+ Agregar área de enfoque", "pt": "+ Adicionar área de foco", "ja": "+ フォーカスエリアを追加", "ko": "+ 집중 영역 추가", "hi": "+ फोकस क्षेत्र जोड़ें", "tr": "+ Odak alanı ekle"},
    "focusAreaPlaceholder": {"en": "Focus area title", "de": "Titel des Fokusbereichs", "pl": "Tytuł obszaru skupienia", "zh": "重点领域标题", "ar": "عنوان منطقة التركيز", "fr": "Titre du domaine de focus", "es": "Título del área de enfoque", "pt": "Título da área de foco", "ja": "フォーカスエリアのタイトル", "ko": "집중 영역 제목", "hi": "फोकस क्षेत्र शीर्षक", "tr": "Odak alanı başlığı"},
    "actionItemPlaceholder": {"en": "Action item", "de": "Aktionspunkt", "pl": "Pozycja akcji", "zh": "行动项", "ar": "عنصر الإجراء", "fr": "Élément d'action", "es": "Elemento de acción", "pt": "Item de ação", "ja": "アクションアイテム", "ko": "액션 항목", "hi": "कार्रवाई आइटम", "tr": "Eylem öğesi"},
    "stretch": {"en": "Stretch", "de": "Herausforderung", "pl": "Wyzwanie", "zh": "挑战", "ar": "تحدي", "fr": "Défi", "es": "Reto", "pt": "Desafio", "ja": "ストレッチ", "ko": "도전", "hi": "चुनौती", "tr": "Zorlayıcı"},
    "reading": {"en": "Reading", "de": "Lesen", "pl": "Czytanie", "zh": "阅读", "ar": "قراءة", "fr": "Lecture", "es": "Lectura", "pt": "Leitura", "ja": "読書", "ko": "독서", "hi": "पढ़ना", "tr": "Okuma"},
    "otherAction": {"en": "Other", "de": "Sonstiges", "pl": "Inne", "zh": "其他", "ar": "أخرى", "fr": "Autre", "es": "Otro", "pt": "Outro", "ja": "その他", "ko": "기타", "hi": "अन्य", "tr": "Diğer"},
    "addAction": {"en": "+ Add Action", "de": "+ Aktion hinzufügen", "pl": "+ Dodaj akcję", "zh": "+ 添加行动", "ar": "+ إضافة إجراء", "fr": "+ Ajouter une action", "es": "+ Agregar acción", "pt": "+ Adicionar ação", "ja": "+ アクションを追加", "ko": "+ 액션 추가", "hi": "+ कार्रवाई जोड़ें", "tr": "+ Eylem ekle"},
    "schedule1on1": {"en": "Schedule 1-on-1", "de": "1:1-Gespräch planen", "pl": "Zaplanuj spotkanie 1:1", "zh": "安排一对一会议", "ar": "جدولة اجتماع 1:1", "fr": "Planifier un 1-à-1", "es": "Programar 1-a-1", "pt": "Agendar 1-a-1", "ja": "1on1をスケジュール", "ko": "1:1 미팅 예약", "hi": "1-ऑन-1 शेड्यूल करें", "tr": "1:1 planla"}
}

ALL_LANGUAGES = [
    'ar', 'bg', 'bn', 'cs', 'da', 'de', 'el', 'en', 'es', 'et',
    'fa', 'fi', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it',
    'ja', 'kn', 'ko', 'lt', 'lv', 'ml', 'ms', 'mt', 'nl', 'no',
    'pa', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'te',
    'th', 'tl', 'tr', 'uk', 'ur', 'vi', 'zh', 'zh-TW'
]

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def get_translation(key_data, lang):
    if lang in key_data:
        return key_data[lang]
    base_lang = lang.split('-')[0]
    if base_lang in key_data:
        return key_data[base_lang]
    return key_data.get('en', '')

def sync_translations(locales_dir):
    locales_path = Path(locales_dir)

    for lang in ALL_LANGUAGES:
        lang_file = locales_path / f"{lang}.json"
        if not lang_file.exists():
            print(f"Warning: {lang}.json not found, skipping")
            continue

        try:
            data = load_json(lang_file)
            updated = False

            # Ensure offline section exists
            if 'offline' not in data:
                data['offline'] = {}

            # Add offline keys
            for key, translations in OFFLINE_KEYS.items():
                if key not in data['offline']:
                    data['offline'][key] = get_translation(translations, lang)
                    updated = True

            # Ensure nav section exists
            if 'nav' not in data:
                data['nav'] = {}

            # Add missing nav keys
            for key, translations in MISSING_NAV_KEYS.items():
                if key not in data['nav']:
                    data['nav'][key] = get_translation(translations, lang)
                    updated = True

            # Ensure nav.section exists
            if 'section' not in data['nav']:
                data['nav']['section'] = {}

            # Add missing section keys
            for key, translations in MISSING_SECTION_KEYS.items():
                if key not in data['nav']['section']:
                    data['nav']['section'][key] = get_translation(translations, lang)
                    updated = True

            # Ensure performance section exists
            if 'performance' not in data:
                data['performance'] = {}

            # Add performance keys
            for key, translations in NEW_PERFORMANCE_KEYS.items():
                if key not in data['performance']:
                    data['performance'][key] = get_translation(translations, lang)
                    updated = True

            if updated:
                save_json(lang_file, data)
                print(f"Updated {lang}.json")
            else:
                print(f"No updates needed for {lang}.json")

        except Exception as e:
            print(f"Error processing {lang}.json: {e}")

if __name__ == '__main__':
    import sys
    locales_dir = sys.argv[1] if len(sys.argv) > 1 else './locales'
    sync_translations(locales_dir)
    print("Done!")
